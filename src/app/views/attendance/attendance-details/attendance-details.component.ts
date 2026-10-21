import { Component, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { formatDate } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatOption } from '@angular/material/core';
import { MatSelect } from '@angular/material/select';
import { animate, style, transition, trigger } from '@angular/animations';
import { Subject, Subscription, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { AuthService, LocalStoreService, SalesPersonService, UserService } from 'app/shared/services'; // main 9143 (e8, gy, Yf, KD)
import { AppLoaderService } from 'app/shared/services/app-loader/app-loader.service'; // main 7009
import { ExcelService } from 'app/shared/services/excel.service'; // common chunk 592, module 4249 (injected, unused)
import { showWarning } from 'app/shared/helpers/utils'; // main 1972 (N9)
import { AttendanceStatus, UserType } from 'app/shared/enums/common.enums'; // main 8352 (H8, FW)
import { PageIds } from 'app/shared/constants/page-ids'; // main 5774 (u)

import {
  AttendanceDetailsRow,
  AttendanceFilters,
  AttendanceReportDoc,
  PagePermission,
  SalesLeadOption,
  SalesPerson,
  UserDoc,
} from '../models/attendance.model';

/**
 * "Attendance Details" tab: raw AttendanceReport rows (check-in / check-out times, status, reason)
 * for a date range, optionally filtered by sales persons and sales leads. Read-only.
 */
@Component({
  selector: 'attendance-details',
  templateUrl: './attendance-details.component.html',
  styleUrls: ['./attendance-details.component.scss'],
  animations: [
    trigger('animate', [
      transition('* => *', [style({ opacity: 0 }), animate('300ms', style({ opacity: 1 }))]),
    ]),
  ],
})
export class AttendanceDetailsComponent implements OnInit, OnDestroy {
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

  dataSource = []; // unused
  attendanceDetails = false; // unused
  attendanceList: AttendanceDetailsRow[] = [];
  displayedColumns = [
    'salesPersonName',
    'mobileNumber',
    'leadName',
    'leadMobileNumber',
    'logIn',
    'logOut',
    'status',
    'appliedDate',
    'reason',
    'createdOn',
  ];

  form: FormGroup;

  constructor(
    public dialog: MatDialog,
    private salesPersonService: SalesPersonService,
    private authService: AuthService,
    private egretLoader: AppLoaderService,
    private excelService: ExcelService,
    private userService: UserService,
    private fb: FormBuilder,
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

        // AttendanceReport docs in range, excluding the rows created from accepted leaves (status 7)
        const reports: AttendanceReportDoc[] = (
          await this.salesPersonService.getAttendanceDetails(
            this.selectedFilters.startDate,
            this.selectedFilters.endDate,
            this.selectedSalesPersonIds,
            this.selectedSalesLeadIds
          )
        ).filter((report) => report.status !== AttendanceStatus.LEAVE_ACCEPTED);

        this.attendanceList = reports.map(this.mapToAttendanceReports);
      } catch (error) {
        console.error('Error:', error);
        Swal.fire('error', 'An error occurred while showing Request.', 'error');
      } finally {
        this.egretLoader.close();
      }
    }
  }

  mapToAttendanceReports(report: AttendanceReportDoc): AttendanceDetailsRow {
    return {
      id: report.id,
      status: report.status,
      checkInLatitude: report.checkInLatitude || 0,
      checkInLongitude: report.checkInLongitude || 0,
      // 0 / missing => '' (formatDate() throws on undefined, which used to abort the whole search)
      checkInTime: report.checkInTime ? formatDate(report.checkInTime, 'yyyy-MM-dd HH:mm:ss', 'en-US') : '',
      checkOutTime: report.checkOutTime ? formatDate(report.checkOutTime, 'yyyy-MM-dd HH:mm:ss', 'en-US') : '',
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
      createdDate: report.createdDate ? formatDate(report.createdDate, 'yyyy-MM-dd', 'en-US') : '',
      appliedOn: report.appliedOn || '',
    };
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
    this.attendanceList = [];
    // The selects are not rendered without `view` permission.
    this.salesPersonSelectRef?.writeValue([]);
    this.salesLeadSelectRef?.writeValue([]);
  }
}
