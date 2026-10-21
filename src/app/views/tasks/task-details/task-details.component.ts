// Reconstructed from chunk 704.86aaaae1881aced9.js (component defined inline in the routes array,
// selector app-task-details). Route: /task-report/task-details/:taskId  (taskId = TasksReport doc id).
// Screen title: "Tasks" (the customer stops of one sales person for one task date).
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { AppLoaderService } from 'app/shared/services/app-loader/app-loader.service';
import { SalesPersonService } from 'app/shared/services/sales-person.service';
import { BusinessType } from 'app/shared/models/enums'; // main.js 8352 (export "_$")
import { InteractionDetailsComponent } from '../interaction-details/interaction-details.component';
import { TaskDetailsRow, TaskReportRow, TASK_STATUS_LABELS } from '../models/task.model';

@Component({
  selector: 'app-task-details',
  templateUrl: './task-details.component.html',
  styleUrls: ['./task-details.component.scss'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [style({ opacity: 0 }), animate('300ms', style({ opacity: 1 }))]),
      transition(':leave', [animate('300ms', style({ opacity: 0 }))]),
    ]),
  ],
})
export class TaskDetailsComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;

  taskDetails: TaskReportRow[] = [];
  // FIX: the table now binds this data source, connected to the mat-paginator (the bundle bound the plain
  // tasksList array, so the paginator was decorative and every row showed at once)
  dataSource = new MatTableDataSource<TaskDetailsRow>();
  pageSize = 25;
  pageNumber = 1;
  displayedColumns: string[] = [
    'taskDate',
    'stopNumber',
    'status',
    'customerId',
    'businessName',
    'customerName',
    'areaCode',
    'businessType',
    'address',
    'salesPersonName',
    'salesPersonId',
    'latitude',
    'longitude',
    'mobileNumber',
    'dealerId',
    'salesPersonAreaCode',
    'interactionId',
  ];

  selectedTaskId: string;
  tasksList: TaskDetailsRow[];
  totalPages: number;
  timer: any; // never assigned
  private destroy$ = new Subject<void>();

  constructor(
    private salesPersonService: SalesPersonService,
    private egretLoader: AppLoaderService,
    private route: ActivatedRoute,
    private dialog: MatDialog
  ) {}

  async ngOnInit() {
    this.dataSource.paginator = this.paginator;
    this.egretLoader.open();
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.selectedTaskId = params.taskId;
    });
    try {
      // Firestore doc TasksReport/{taskId}
      const task = await this.salesPersonService.getTask(this.selectedTaskId);
      if (task) {
        this.taskDetails = this.mapToTaskReport([task]);
        this.tasksList = await this.getDataByFilters(this.taskDetails[0]);
      } else {
        // FIX: a missing TasksReport doc made the mapper throw and left the loader open
        this.showWarningMessage('No Tasks Found');
        this.tasksList = [];
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      this.showWarningMessage('No Tasks Found');
      this.tasksList = [];
    } finally {
      this.egretLoader.close();
    }
    this.dataSource.data = this.tasksList;
    this.totalPages = this.tasksList.length;
  }

  /** Not bound in the template: paging is handled by dataSource.paginator. */
  onPageChange(event: PageEvent) {
    this.pageNumber = event.pageIndex + 1;
    this.pageSize = event.pageSize;
  }

  ngOnDestroy() {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  async getDataByFilters(taskReport: TaskReportRow): Promise<TaskDetailsRow[]> {
    try {
      // Firestore "Tasks" where taskDate == date AND salesPersonId == salesPersonId
      const tasks = await this.salesPersonService.getTasksByTaskDateAndSalesPerson(
        taskReport.date,
        taskReport.salesPersonId
      );
      if (tasks && tasks.length > 0) {
        return this.mapToTasks(tasks).sort((a, b) => a.stopNumber - b.stopNumber);
      }
      this.showWarningMessage('No Tasks Found');
      return [];
    } catch {
      this.showWarningMessage('No Tasks Found');
      return []; // FIX: the bundle returned undefined -> ngOnInit threw on tasksList.length, loader never closed
    }
  }

  showWarningMessage(message: string) {
    Swal.fire('warning', message, 'warning');
    return new Error(message);
  }

  getBusinessType(businessType: number | string) {
    return typeof businessType === 'number' ? BusinessType[businessType] : businessType;
  }

  mapToTaskReport(tasksReport: any[]): TaskReportRow[] {
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

  mapToTasks(tasks: any[]): TaskDetailsRow[] {
    return tasks.map((task) => ({
      address: task.customerInfo.address,
      areaCode: task.customerInfo.areaName,
      businessName: task.customerInfo.businessName,
      businessType: task.customerInfo.businessType,
      customerId: task.customerInfo.customerId,
      customerName: task.customerInfo.customerName,
      latitude: task.customerInfo.latitude,
      longitude: task.customerInfo.longitude,
      mobileNumber: task.customerInfo.mobileNumber,
      dealerId: task.dealerId,
      id: task.id,
      setName: task.setInfo.setName,
      date: task.createdDate,
      status: this.getTaskStatusString(task.status),
      stopNumber: task.stopNumber,
      taskDate: task.taskDate,
      salesPersonAreaCode: task.salesPersonInfo.subAreaName,
      salesPersonId: task.salesPersonInfo.id,
      salesPersonName: task.salesPersonInfo.name,
      interactionId: task.interactionId || '',
    }));
  }

  getTaskStatusString(status: number): string {
    return TASK_STATUS_LABELS[status] || 'N/A';
  }

  /** "View Interaction": loads Interactions/{interactionId} and shows it in InteractionDetailsComponent. */
  async navigateToTaskList(interactionId: string) {
    let interaction: any = null;
    try {
      interaction = await this.salesPersonService.getInteraction(interactionId);
    } catch (error) {
      console.error('Error fetching interaction:', error);
    }
    if (!interaction) {
      // FIX: a missing/unreadable Interactions doc made the dialog constructor throw (nothing opened)
      this.showWarning();
      return;
    }
    this.dialog
      .open(InteractionDetailsComponent, {
        width: '85%',
        disableClose: true,
        data: interaction,
      })
      .afterClosed()
      .subscribe(async () => {});
  }

  showWarning() {
    Swal.fire('warning', 'No interaction found', 'warning'); // FIX: typo "interation" in the bundle
  }
}
