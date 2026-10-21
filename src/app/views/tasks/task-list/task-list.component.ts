// Reconstructed from chunk 704.86aaaae1881aced9.js (component "y", selector app-task-list).
// Screen title: "Task Report". Route: /task-report (and /task-report/task-report, /task-details).
import { MatOption } from '@angular/material/core';
import { Component, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { formatDate } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, NavigationExtras, Router } from '@angular/router';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { MatSelect } from '@angular/material/select';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { AppLoaderService } from 'app/shared/services/app-loader/app-loader.service'; // main.js 7009
import { ExcelService } from 'app/shared/services/excel.service'; // common.js 4249
// main.js 9143 is a barrel re-exporting AuthService (8175), LocalStoreService and SalesPersonService (2937)
import { AuthService } from 'app/shared/services/auth/auth.service';
import { LocalStoreService } from 'app/shared/services/local-store.service';
import { SalesPersonService } from 'app/shared/services/sales-person.service';
import { PageIds } from 'app/shared/constants/page-ids'; // main.js 5774 (export "u")
import { showWarningMessage } from 'app/shared/helpers/common.helper'; // main.js 1972 (export "N9")
import { PagePermission, TaskReportFilters, TaskReportRow, TASK_STATUS_LABELS } from '../models/task.model';

@Component({
  selector: 'app-task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.scss'],
  providers: [{ provide: MAT_DATE_LOCALE, useValue: 'en-US' }],
})
export class TaskListComponent implements OnInit, OnDestroy {
  @ViewChild('salesPersonSelectRef') salesPersonSelectRef: MatSelect;

  pageId = PageIds.crm_task_report; // "crm_task_report"
  displayedColumns: string[] = ['sno', 'date', 'salesPersonName', 'areaName', 'customerCount', 'action'];
  startDate = new Date(); // unused by template
  endDate = new Date(); // unused by template
  tasksList: TaskReportRow[] = [];
  taskDetails = false; // true once a search has completed (shows the table / "No Tasks Found")
  form: FormGroup = this.fb.group({
    startDate: [null, Validators.required],
    endDate: [null, Validators.required],
  });

  permissionSubscription: Subscription;
  permissionObj: PagePermission;
  salesPersonList: any[]; // SalesPersonService.mapToSalesPerson() rows: { id, name, mobileNumber, ... }
  localStoredFilters: TaskReportFilters; // read on init but never applied
  selectedSalesPersonIds: string[];
  selectedFilters: TaskReportFilters;
  private destroy$ = new Subject<void>();

  /**
   * Drops the persisted Task Report filters when the tab is reloaded/closed.
   * FIX: the bundle called clearFilters() -> localStorage.clear() here, wiping the session `uid` and every other key
   * (and it threw when the Sales Person select was not rendered).
   */
  @HostListener('window:beforeunload', ['$event'])
  unloadHandler(event: Event) {
    this.localStoreService.removeItem('selectedFilters');
  }

  constructor(
    private router: Router,
    private salesPersonService: SalesPersonService,
    private fb: FormBuilder,
    private egretLoader: AppLoaderService,
    private excelService: ExcelService,
    private route: ActivatedRoute,
    private localStoreService: LocalStoreService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    this.permissionSubscription = this.authService.permission$.pipe(takeUntil(this.destroy$)).subscribe(async (permissions) => {
      console.log('this.permissionObj res:- ', permissions);
      if (permissions && Object.keys(permissions).length > 0) {
        this.permissionObj = permissions[this.pageId];
        console.log('this.permissionObj:- ', this.permissionObj);
      }
    });
    // Firestore collection "SalesPerson" (all docs)
    this.salesPersonList = await this.salesPersonService.getSalesPersons();
    this.localStoredFilters = this.localStoreService.getItem('selectedFilters');
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getSelectedSalesPerson() {
    this.selectedSalesPersonIds = (this.salesPersonSelectRef.selected as MatOption[]).map((option: any) => option.value.id);
  }

  mapToTasks(tasksReport: any[]): TaskReportRow[] {
    return tasksReport.map((task) => ({
      salesPersonId: task.salesPersonId,
      salesPersonName: task.salesPersonName,
      areaName: task.clusterName || '',
      customerCount: task.customerCount,
      date: task.taskDate,
      isActive: task.isActive,
      id: task.id,
    }));
  }

  async searchTasks() {
    if (!this.form.valid) {
      showWarningMessage('Please select Start Date and End Date');
      return;
    }
    const startDate = this.form.get('startDate').value;
    const endDate = this.form.get('endDate').value;
    if (!startDate) {
      showWarningMessage('Please select Start Date');
    } else if (!endDate) {
      showWarningMessage('Please select End Date');
    } else if (startDate > endDate) {
      showWarningMessage('Please select valid Start Date and End Date');
    } else {
      try {
        this.egretLoader.open();
        this.selectedFilters = this.prepareFilters(startDate, endDate);
        // Firestore "TasksReport": taskDateTimestamp in [start 00:00:00, end 23:59:59] (+ salesPersonId in [...])
        const response = await this.salesPersonService.getTasksReportByFilter(
          this.selectedFilters.startDate as string,
          this.selectedFilters.endDate as string,
          this.selectedSalesPersonIds
        );
        this.handleResponse(response);
      } catch (error) {
        // FIX: the bundle reported a failed search as 'An error occurred while downloading tasks.'
        console.error('Error fetching tasks:', error);
        Swal.fire('error', 'An error occurred while fetching tasks.', 'error');
      } finally {
        this.egretLoader.close();
      }
    }
  }

  async downloadTasks() {
    // NOTE: unlike searchTasks(), no form.valid check here.
    const startDate = this.form.get('startDate').value;
    const endDate = this.form.get('endDate').value;
    if (!startDate) {
      showWarningMessage('Please select Start Date');
    } else if (!endDate) {
      showWarningMessage('Please select End Date');
    } else if (startDate > endDate) {
      showWarningMessage('Please select valid Start Date and End Date');
    } else {
      try {
        this.egretLoader.open();
        this.selectedFilters = this.prepareFilters(startDate, endDate);
        // Firestore "Tasks": taskDateTimestamp in [start 00:00:00, end 23:59:59] (+ salesPersonId in [...])
        const tasks = await this.salesPersonService.getTasksByFilter(
          this.selectedFilters.startDate as string,
          this.selectedFilters.endDate as string,
          this.selectedSalesPersonIds
        );
        if (tasks.length == 0) {
          showWarningMessage('No Tasks Found');
          return;
        }
        const excelData = this.mapTasksToExcelData(tasks);
        this.exportTasksToExcel(excelData);
      } catch (error) {
        this.handleErrorResponse(error);
      } finally {
        this.egretLoader.close();
      }
    }
  }

  prepareFilters(startDate: Date, endDate: Date): TaskReportFilters {
    const formattedStartDate = formatDate(startDate, 'yyyy-MM-dd', 'en-US');
    const formattedEndDate = formatDate(endDate, 'yyyy-MM-dd', 'en-US');
    this.localStoreService.setItem('selectedFilters', {
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      salesPersonIds: this.selectedSalesPersonIds,
    });
    return {
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      salesPersonIds: this.selectedSalesPersonIds,
    };
  }

  handleResponse(response: any[]) {
    if (response && response.length > 0) {
      this.taskDetails = true;
      this.tasksList = this.mapToTasks(response);
    } else {
      this.taskDetails = true;
      showWarningMessage('No Tasks Found');
      this.tasksList = [];
    }
  }

  handleErrorResponse(error: any) {
    console.error('Error downloading tasks:', error);
    Swal.fire('error', 'An error occurred while downloading tasks.', 'error');
  }

  exportTasksToExcel(data: any[]) {
    // -> DownloadedTasks.xlsx, sheet "Tasks"
    this.excelService.exportToExcel(data, 'Tasks', 'DownloadedTasks');
    Swal.fire('success', 'Excel Downloaded Successfully', 'success');
  }

  mapTasksToExcelData(tasks: any[]) {
    return tasks.map((task) => ({
      'Task Date': task.taskDate,
      'Customer ID': task.customerId,
      'Business Name': task.customerInfo.businessName,
      'Customer Name': task.customerInfo.customerName,
      'Mobile Number': task.customerInfo.mobileNumber,
      'Business Type': task.customerInfo.businessType,
      'Sales Person ID': task.salesPersonId,
      'Sales Person Name': task.salesPersonInfo.name,
      'Sales Person Sub Area': task.salesPersonInfo.subAreaName,
      'Stop Number': task.stopNumber,
      Status: this.getTaskStatusString(task.status),
      Address: task.customerInfo.address,
      'Area Name': task.customerInfo.areaName,
      Latitude: task.customerInfo.latitude,
      Longitude: task.customerInfo.longitude,
    }));
  }

  getTaskStatusString(status: number): string {
    return TASK_STATUS_LABELS[status] || 'N/A'; // {1:'In Progress', 2:'Visited', 99:'Not Yet Visited'}
  }

  /** "View Customers" button: opens the per-sales-person stop list for this TasksReport doc. */
  navigateToTaskList(taskId: string) {
    const startDate = this.form.get('startDate').value;
    const endDate = this.form.get('endDate').value;
    this.selectedFilters = {
      startDate,
      endDate,
      salesPersonIds: this.selectedSalesPersonIds,
    };
    const navigationExtras: NavigationExtras = {
      queryParams: { selectedFilters: JSON.stringify(this.selectedFilters) }, // not read by TaskDetailsComponent
    };
    this.router.navigate(['/task-report/task-details', taskId], navigationExtras);
  }

  clearFilters() {
    // FIX: only this screen's key (the bundle called localStorage.clear(), which also wiped the session `uid`)
    this.localStoreService.removeItem('selectedFilters');
    this.form.reset();
    this.selectedSalesPersonIds = [];
    this.selectedFilters = { startDate: null, endDate: null, salesPersonIds: [] };
    this.salesPersonSelectRef?.writeValue([]);
    this.tasksList = [];
    // FIX: back to the "no search yet" state, so the "No Tasks Found" header does not linger
    this.taskDetails = false;
  }
}
