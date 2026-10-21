import { Component, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { formatDate } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatOption } from '@angular/material/core';
import { MatSelect } from '@angular/material/select';
import { animate, style, transition, trigger } from '@angular/animations';
import { Subject, Subscription, takeUntil } from 'rxjs';
import Swal, { SweetAlertOptions } from 'sweetalert2';

import { AuthService, LocalStoreService, SalesPersonService, UserService } from 'app/shared/services'; // main 9143 (e8, gy, Yf, KD)
import { AppLoaderService } from 'app/shared/services/app-loader/app-loader.service'; // main 7009
import { showWarning } from 'app/shared/helpers/utils'; // main 1972 (N9)
import { AttendanceStatus, UserType } from 'app/shared/enums/common.enums'; // main 8352 (H8, FW)
import { PageIds } from 'app/shared/constants/page-ids'; // main 5774 (u)

import {
  AttendanceFilters,
  AttendanceReportDoc,
  LeaveRequestRow,
  PagePermission,
  SalesLeadOption,
  SalesPerson,
  UserDoc,
} from '../models/attendance.model';

/**
 * "Approval Request" tab: lists early-logout requests (AttendanceReport) and leave requests (LeaveReport)
 * for a date range and lets the admin Approve / Reject them.
 */
@Component({
  selector: 'leave-request',
  templateUrl: './leave-request.component.html',
  styleUrls: ['./leave-request.component.scss'],
  animations: [
    trigger('animate', [
      transition('* => *', [style({ opacity: 0 }), animate('300ms', style({ opacity: 1 }))]),
    ]),
  ],
})
export class LeaveRequestComponent implements OnInit, OnDestroy {
  /** Clears the filters (only the `selectedFilters` key in localStorage) when the browser tab is closed / reloaded. */
  @HostListener('window:beforeunload', ['$event'])
  unloadHandler(event: Event) {
    this.clearFilters();
  }

  @ViewChild('salesPersonSelectRef') salesPersonSelectRef: MatSelect;
  @ViewChild('salesLeadSelectRef') salesLeadSelectRef: MatSelect;

  pageId = PageIds.crm_attendance; // 'crm_attendance'
  permissionObj: PagePermission;
  permissionSubscription: Subscription;
  private destroy$ = new Subject<void>();

  salesPersonList: SalesPerson[];
  leadList: SalesLeadOption[] = [];
  selectedSalesPersonIds: string[];
  selectedSalesLeadIds: string[];
  selectedFilters: AttendanceFilters;

  attendanceDetails = false;
  attendanceList: LeaveRequestRow[] = [];
  dataSource = []; // unused
  displayedColumns = [
    'salesPersonName',
    'mobileNumber',
    'leadName',
    'leadMobileNumber',
    'date',
    'reason',
    'appliedFor',
    'action',
    'createdDate',
  ];

  form: FormGroup;

  constructor(
    private salesPersonService: SalesPersonService,
    private authService: AuthService,
    private fb: FormBuilder,
    private userService: UserService,
    private egretLoader: AppLoaderService,
    private localStoreService: LocalStoreService
  ) {
    this.form = this.fb.group({
      startDate: [null, Validators.required],
      endDate: [null, Validators.required],
    });
  }

  async ngOnInit() {
    this.initializePermissionSubscription();
    await this.getLeadList();
    this.salesPersonList = await this.salesPersonService.getSalesPersons();
  }

  async initializePermissionSubscription() {
    this.permissionSubscription = this.authService.permission$.pipe(takeUntil(this.destroy$)).subscribe((permissions) => {
      if (permissions && Object.keys(permissions).length > 0) {
        this.permissionObj = permissions[this.pageId];
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Firestore `Users` where user_type == UserType.SalesLead (8). */
  async getLeadList() {
    const users = await this.userService.fetchSalesPersons(UserType.SalesLead);
    this.leadList = this.mapToLeads(users);
  }

  mapToLeads(users: UserDoc[]): SalesLeadOption[] {
    return users.map((user) => ({
      name: user.name,
      userId: user.id,
      user_type: user.user_type,
      mobileNumber: user.mobile_number,
    }));
  }

  getSelectedSalesPerson() {
    this.selectedSalesPersonIds = (this.salesPersonSelectRef.selected as MatOption[]).map((option) => option.value.id);
  }

  getSelectedLead() {
    this.selectedSalesLeadIds = (this.salesLeadSelectRef.selected as MatOption[]).map((option) => option.value.userId);
  }

  async searchAttendanceRequests() {
    if (!this.form.valid) {
      showWarning('Please select Start Date and End Date');
      return;
    }

    const startDate = this.form.get('startDate').value;
    const endDate = this.form.get('endDate').value;

    if (!startDate) {
      showWarning('Please select Start Date');
    } else if (!endDate) {
      showWarning('Please select End Date');
    } else if (startDate > endDate) {
      showWarning('Please select valid Start Date and End Date');
    } else {
      try {
        this.egretLoader.open();
        this.selectedFilters = this.prepareFilters(startDate, endDate);

        // AttendanceReport docs in range, minus plain check-in / check-out / none rows and minus the
        // leave-accepted (7) marker docs that updateLeaveStatus() writes into AttendanceReport (they have no
        // name / reason and duplicated the LeaveReport row) => keeps the early-logout requests (3,4,5).
        const attendanceReports: AttendanceReportDoc[] = await this.salesPersonService.getAttendanceDetails(
          this.selectedFilters.startDate,
          this.selectedFilters.endDate,
          this.selectedSalesPersonIds,
          this.selectedSalesLeadIds
        );
        const excludedStatuses = [
          AttendanceStatus.CHECKED_IN,
          AttendanceStatus.CHECKED_OUT,
          AttendanceStatus.NONE,
          AttendanceStatus.LEAVE_ACCEPTED,
        ];
        const requests = attendanceReports.filter((report) => !excludedStatuses.includes(report.status));

        // LeaveReport docs in range (all statuses)
        const leaveReports: AttendanceReportDoc[] = await this.salesPersonService.getLeaveDetails(
          this.selectedFilters.startDate,
          this.selectedFilters.endDate,
          this.selectedSalesPersonIds,
          this.selectedSalesLeadIds
        );

        const combined = [...requests, ...leaveReports];
        this.egretLoader.close();
        this.attendanceList = combined.map(this.mapToAttendanceReports);
        // "No Records Found" only when there are neither early-logout nor leave requests.
        this.handleResponse(combined);
      } catch (error) {
        this.handleErrorResponse(error);
      } finally {
        this.egretLoader.close();
      }
    }
  }

  handleResponse(response: any[]) {
    if (response && response.length > 0) {
      this.attendanceDetails = true;
    } else {
      this.attendanceDetails = true;
      showWarning('No Records Found');
      this.attendanceList = [];
    }
  }

  handleErrorResponse(error: any) {
    console.error('Error:', error);
    Swal.fire('error', 'An error occurred while showing Request.', 'error');
  }

  prepareFilters(startDate: Date, endDate: Date): AttendanceFilters {
    const formattedStartDate = formatDate(startDate, 'yyyy-MM-dd', 'en-US');
    const formattedEndDate = formatDate(endDate, 'yyyy-MM-dd', 'en-US');
    this.localStoreService.setItem('selectedFilters', {
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      salesPersonIds: this.selectedSalesPersonIds,
      salesLeadIds: this.selectedSalesLeadIds,
    });
    return {
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      salesPersonIds: this.selectedSalesPersonIds,
      salesLeadIds: this.selectedSalesLeadIds,
    };
  }

  mapToAttendanceReports(report: AttendanceReportDoc): LeaveRequestRow {
    return {
      id: report.id,
      status: report.status,
      createdTimeStamp: report.createdTimeStamp,
      salesPersonId: report.salesPersonId,
      salesPerson: {
        id: report.salesPersonId,
        name: report.salesPerson && report.salesPerson.name ? report.salesPerson.name : '',
        mobileNumber: report.salesPerson && report.salesPerson.mobileNumber ? report.salesPerson.mobileNumber : '',
      },
      salesLeadId: report.salesLeadId || '',
      salesManagerId: report.salesManagerId || '',
      salesLead: {
        id: report.salesLeadId,
        name: report.salesLead && report.salesLead.name ? report.salesLead.name : '',
        mobileNumber: report.salesLead && report.salesLead.mobileNumber ? report.salesLead.mobileNumber : '',
      },
      salesManager: {
        id: report.salesManagerId,
        name: report.salesManager && report.salesManager.name ? report.salesManager.name : '',
        mobileNumber:
          report.salesManager && report.salesManager.mobileNumber ? report.salesManager.mobileNumber : '',
      },
      reason: report.reason,
      createdDate: report.createdDate,
      appliedOn: report.appliedOn,
    };
  }

  /**
   * Approve (isApproved=true) / Reject (false) a request.
   *  - status 3 (REASON_FOR_EARLY_LOGOUT) -> AttendanceReport/{id}.status = 4 (accepted) | 5 (rejected)
   *      (SalesPersonService also stamps checkOutTime = Date.now() when accepted)
   *  - status 6 (APPLY_LEAVE) -> LeaveReport/{id}.status = 7 (accepted) | 8 (rejected)
   *      (SalesPersonService also creates an AttendanceReport doc with status 7 when accepted)
   */
  async updateStatus(row: LeaveRequestRow, status: number, isApproved: boolean) {
    let newStatus: number;
    let successMessage: string;

    switch (status) {
      case AttendanceStatus.REASON_FOR_EARLY_LOGOUT:
      case AttendanceStatus.APPLY_LEAVE:
        ({ newStatus, successMessage } = this.getStatusAndMessage(
          row,
          status,
          isApproved,
          'Reason for early log out',
          'Leave'
        ));
    }

    // Only pending early-logout (3) / leave (6) requests can be approved or rejected.
    if (newStatus === undefined) {
      return;
    }

    const swalOptions: SweetAlertOptions = {
      title: status === 3 ? 'Reason for early logout' : 'Leave',
      text: 'Do you want to proceed with the confirmation?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#13BB6F',
      confirmButtonText: 'Yes, Proceed!',
      cancelButtonText: 'Cancel',
    };

    const result = await Swal.fire(swalOptions);
    if (result.value) {
      const payload = { status: newStatus };
      try {
        if (status == 3) {
          await this.salesPersonService.updateAttendanceStatus(row.id, payload);
        } else {
          await this.salesPersonService.updateLeaveStatus(row.id, payload);
        }
      } catch (error) {
        console.error('Error updating request status:', error);
        Swal.fire('error', 'An error occurred while updating the request status.', 'error');
        return;
      }
      if (successMessage) {
        this.showStatusMessage(isApproved, successMessage);
        row.status = newStatus;
      }
    }
  }

  getStatusAndMessage(
    row: LeaveRequestRow,
    status: number,
    isApproved: boolean,
    earlyLogoutLabel: string,
    leaveLabel: string
  ): { newStatus: number; successMessage: string } {
    let newStatus: number;
    let successMessage: string;
    switch (status) {
      case AttendanceStatus.REASON_FOR_EARLY_LOGOUT:
        newStatus = isApproved
          ? AttendanceStatus.REASON_FOR_EARLY_LOGOUT_ACCEPTED
          : AttendanceStatus.REASON_FOR_EARLY_LOGOUT_REJECTED;
        successMessage = `${earlyLogoutLabel} ${isApproved ? 'approved' : 'rejected'}`;
        break;
      case AttendanceStatus.APPLY_LEAVE:
        newStatus = isApproved ? AttendanceStatus.LEAVE_ACCEPTED : AttendanceStatus.LEAVE_REJECTED;
        successMessage = `${leaveLabel} ${isApproved ? 'approved' : 'rejected'}`;
    }
    return { newStatus, successMessage };
  }

  showStatusMessage(isApproved: boolean, message: string) {
    Swal.fire({
      icon: isApproved ? 'success' : 'warning',
      title: isApproved ? 'Success!' : 'Warning!',
      text: message,
    });
  }

  clearFilters() {
    // Only the key this tab owns (localStorage.clear() used to wipe the session `uid` etc.).
    this.localStoreService.removeItem('selectedFilters');
    this.form.reset();
    this.selectedSalesPersonIds = [];
    this.selectedSalesLeadIds = [];
    this.selectedFilters = {
      startDate: null,
      endDate: null,
      salesPersonIds: [],
      salesLeadIds: [],
    };
    // The selects are not rendered without `view` permission.
    this.salesPersonSelectRef?.writeValue([]);
    this.salesLeadSelectRef?.writeValue([]);
    this.attendanceList = [];
  }
}
