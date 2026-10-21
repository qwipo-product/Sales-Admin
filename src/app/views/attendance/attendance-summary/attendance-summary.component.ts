import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { animate, style, transition, trigger } from '@angular/animations';
import { Subject, Subscription, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { AuthService, SalesPersonService } from 'app/shared/services'; // main module 9143 barrel (e8, Yf)
import { AppLoaderService } from 'app/shared/services/app-loader/app-loader.service'; // main module 7009
import { ExcelService } from 'app/shared/services/excel.service'; // common chunk 592, module 4249
import { getMonthList, getNumberRange, showWarning } from 'app/shared/helpers/utils'; // main module 1972 (G4, Vl, N9)
import { AttendanceStatus } from 'app/shared/enums/common.enums'; // main module 8352 (H8)
import { PageIds } from 'app/shared/constants/page-ids'; // main module 5774 (u)

import {
  AttendanceSummaryRow,
  CalendarMonth,
  MonthOption,
  PagePermission,
  SalesPerson,
} from '../models/attendance.model';

/**
 * "Attendance Summary" tab: monthly present / absent / leave counts per sales person,
 * computed client-side from the `AttendanceReport` collection and the `Calendar` collection.
 */
@Component({
  selector: 'attendance-summary',
  templateUrl: './attendance-summary.component.html',
  styleUrls: ['./attendance-summary.component.scss'],
  animations: [
    trigger('animate', [
      transition('* => *', [style({ opacity: 0 }), animate('300ms', style({ opacity: 1 }))]),
    ]),
  ],
})
export class AttendanceSummaryComponent implements OnInit, OnDestroy {
  pageId = PageIds.crm_attendance; // 'crm_attendance'
  permissionObj: PagePermission;
  permissionSubscription: Subscription;
  private destroy$ = new Subject<void>();

  form: FormGroup;

  // --- declared but unused in the template / logic (kept for fidelity) ---
  selectAllMonths = new FormControl(false);
  selectedMonths = [];
  selectAllCheckbox = false;
  checkboxStates = {};
  selectedYears = [];

  /** [{ name: 'January', isSelected: false, value: 'january' }, ... 'December'] */
  monthList: MonthOption[] = getMonthList();
  /** [2023, 2024, ..., 2040] */
  yearList: number[] = getNumberRange(2023, 2040);

  selectedMonth: any = '';
  selectedYear: any = '';
  attendanceDetails = false;

  attendanceList: AttendanceSummaryRow[]; // NOTE: undefined until the first successful search
  salesPersonWorkingDays: number;
  daysInMonth: number;
  startDate: string;
  endDate: string;

  displayedColumns = [
    'name',
    'businessName',
    'mobileNumber',
    'leadName',
    'daysInMonth',
    'workingDays',
    'presentDays',
    'absentDays',
    'leaveDays',
  ];

  constructor(
    public dialog: MatDialog,
    private salesPersonService: SalesPersonService,
    private authService: AuthService,
    private egretLoader: AppLoaderService,
    private excelService: ExcelService,
    private fb: FormBuilder
  ) {}

  async ngOnInit() {
    this.permissionSubscription = this.authService.permission$.pipe(takeUntil(this.destroy$)).subscribe((permissions) => {
      if (permissions && Object.keys(permissions).length > 0) {
        this.permissionObj = permissions[this.pageId];
      }
    });

    this.form = this.fb.group({
      selectAll: new FormControl(false),
      monthSelectRef: new FormControl(null),
      yearSelectRef: new FormControl(null),
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getSelectedMonth() {
    this.selectedMonth = this.form.get('monthSelectRef')?.value;
  }

  getSelectedYear() {
    this.selectedYear = this.form.get('yearSelectRef')?.value;
  }

  async loadAttendanceDetails() {
    try {
      this.validateInputs();
      this.egretLoader.open();

      const salesPersons = await this.salesPersonService.getSalesPersons();
      const calendar: any = await this.fetchWorkingDays(this.selectedMonth, this.selectedYear);

      if (!calendar.days) {
        this.egretLoader.close();
        Swal.fire('warning', 'Something Went Wrong', 'warning');
        return;
      }

      this.salesPersonWorkingDays = calendar.workingDays;
      this.daysInMonth = calendar.days;
      this.startDate = `${calendar.year}-${calendar.month}-01`;
      this.endDate = `${calendar.year}-${calendar.month}-${calendar.days}`;

      this.attendanceList = await this.calculateAttendanceDetailsForSalesPerson(salesPersons);
      this.egretLoader.close();
      this.handleResponse(salesPersons);
    } catch (error) {
      this.egretLoader.close();
      console.error('Error loading attendance details:', error);
      // Validation errors already showed their own alert; anything else is a failed query.
      if (!String((error as any)?.message || '').startsWith('Validation error')) {
        Swal.fire('warning', 'Something Went Wrong', 'warning');
      }
    }
  }

  validateInputs() {
    if (!this.selectedMonth && !this.selectedYear) {
      Swal.fire('error', 'Please select both month and year.', 'error');
      throw new Error('Validation error: Please select both month and year.');
    }
    if (!this.selectedMonth) {
      Swal.fire('error', 'Please select month.', 'error');
      throw new Error('Validation error: Please select month.');
    }
    if (!this.selectedYear) {
      Swal.fire('error', 'Please select year.', 'error');
      throw new Error('Validation error: Please select year.');
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

  /**
   * One Firestore query per sales person, run in parallel (Promise.all keeps the sales-person order):
   * AttendanceReport where salesPersonId == id AND createdTimeStamp in [startDate 00:00:00, endDate 23:59:59].
   */
  async calculateAttendanceDetailsForSalesPerson(salesPersons: SalesPerson[]): Promise<AttendanceSummaryRow[]> {
    const startDate = this.startDate;
    const endDate = this.endDate;
    const daysInMonth = this.daysInMonth;
    const workingDays = this.salesPersonWorkingDays;
    const reportsPerSalesPerson = await Promise.all(
      salesPersons.map((salesPerson) =>
        this.salesPersonService.getAttendanceReportBySalesPersonId(salesPerson.id, startDate, endDate)
      )
    );
    return salesPersons.map((salesPerson, index) => {
      const reports = reportsPerSalesPerson[index] || [];
      const checkedOut = reports.filter((r) => r.status === AttendanceStatus.CHECKED_OUT) || [];
      const leavesAccepted = reports.filter((r) => r.status === AttendanceStatus.LEAVE_ACCEPTED) || [];
      const presentDays = checkedOut.length || 0;
      const leaveDays = leavesAccepted.length || 0;

      return {
        name: salesPerson.name,
        businessName: salesPerson.businessName,
        mobileNumber: salesPerson.mobileNumber,
        leadName: salesPerson.salesLeadName || '',
        leadMobileNumber: salesPerson.salesLeadMobileNumber || '',
        leadId: salesPerson.salesLeadId || 0,
        daysInMonth,
        workingDays,
        managerId: salesPerson.salesManagerId || '',
        managerName: salesPerson.salesManagerName || '',
        managerMobileNumber: salesPerson.salesManagerMobileNumber || '',
        presentDays,
        leaveDays,
        absentDays: workingDays - (leaveDays + presentDays),
      };
    });
  }

  /** Reads Firestore `Calendar/{month}{year}` e.g. `Calendar/january2024`. Returns [] when the doc is missing. */
  async fetchWorkingDays(month: string, year: number | string): Promise<CalendarMonth | any[]> {
    const calendarId = `${month}${year}`;
    return (await this.salesPersonService.getCalendar(calendarId)) || [];
  }

  async downloadToExcel() {
    if (!this.permissionObj?.export) {
      return;
    }
    try {
      // attendanceList is undefined until the first search.
      if (!this.attendanceList || this.attendanceList.length == 0) {
        await Swal.fire({
          title: 'Attendance Summary not found',
          icon: 'warning',
          confirmButtonText: 'Ok',
          allowOutsideClick: false,
          allowEscapeKey: false,
        });
        return;
      }

      const confirmation = await Swal.fire({
        title: 'Do you want to proceed?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes',
        cancelButtonText: 'No',
      });
      if (!confirmation.isConfirmed) {
        return;
      }

      this.egretLoader.open();
      const excelData = this.mapAttendanceListToExcelData(this.attendanceList);
      if (excelData && excelData.length > 0) {
        this.egretLoader.close();
        // -> file "DownloadedAttendanceSummary.xlsx", single sheet "AttendanceSummary"
        this.excelService.exportToExcel(excelData, 'AttendanceSummary', 'DownloadedAttendanceSummary');
        Swal.fire('success', 'Excel Downloaded Successfully', 'success');
      } else {
        this.egretLoader.close();
        Swal.fire('error', 'No AttendanceSummary Found.', 'error');
      }
    } catch (error) {
      this.egretLoader.close();
      console.error('Error downloading AttendanceSummary:', error);
      Swal.fire('error', 'An error occurred while downloading AttendanceSummary.', 'error');
    }
  }

  mapAttendanceListToExcelData(attendanceList: AttendanceSummaryRow[]) {
    return attendanceList.map((item) => ({
      'Sales Person': item.name,
      'Sales Person Business Name': item.businessName,
      'Sales Person Mobile Number': item.mobileNumber,
      'Sales Lead': item.leadName || '',
      'Sales Lead Mobile Number': item.leadMobileNumber || '',
      'Sales Manager': item.managerName || '',
      'Sales Manager Mobile Number': item.managerMobileNumber || '',
      'Total Days': item.daysInMonth,
      'Working Days': item.workingDays,
      'Present Days': item.presentDays || 0,
      Absent: item.absentDays || 0,
      Leave: item.leaveDays || 0,
    }));
  }
}
