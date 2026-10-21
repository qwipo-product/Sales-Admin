import { Component, EventEmitter, Inject, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject, Subscription, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { SalesPersonService } from '../../../../shared/services/sales-person.service';
import { AuthService } from '../../../../shared/services/auth/auth.service';
import { AppLoaderService } from '../../../../shared/services/app-loader/app-loader.service';
import { TaskCountStatus } from '../../../../shared/models/enums';
import { generateMessageQueueStatusId, showWarningAlert } from '../../../../shared/helpers/utils';
import { MessageQueueService } from '../../services/message-queue.service';
import { ScopedLoader } from '../../services/scoped-loader';
import {
  CreateTasksPayload,
  GenerateTasksData,
  PagePermission,
  TaskPreviewRow,
  TaskSalesPerson,
} from '../../models/sales-person-planning.models';

/**
 * "View Tasks Preview" dialog (selector `preview-dialog`, minified `ly`).
 * Opened by SalesPersonTasksComponent.viewTaskDetails() (90% x 90%) with data { generateTasks: GenerateTasksData }.
 * "Generate Tasks" posts { messageType: 'CreateTasks', input: JSON.stringify(taskPayLoad) } and closes with {}.
 */
@Component({
  selector: 'preview-dialog',
  templateUrl: './preview-dialog.component.html',
  styleUrls: ['./preview-dialog.component.scss'],
})
export class PreviewDialogComponent implements OnInit, OnDestroy {
  @Output() dialogClosed = new EventEmitter<any>();

  displayColumns: string[] = ['name', 'customerCount', 'selectedDaysCount', 'taskCount', 'expectedTaskCount', 'message'];
  generateTasksBtn = true;
  /** Permission page id looked up in AuthService.permission$ (permissionObj is not used by the template). */
  pageId = 'preview_dialog';
  permissionObj: PagePermission;
  permissionSubscription: Subscription;
  taskPayLoad: CreateTasksPayload;
  tasksList: TaskPreviewRow[];
  private destroy$ = new Subject<void>();
  private loader: ScopedLoader;

  constructor(
    public dialogRef: MatDialogRef<PreviewDialogComponent>,
    private fb: FormBuilder,
    private egretLoader: AppLoaderService,
    private messageQueueService: MessageQueueService,
    private salesPersonService: SalesPersonService,
    private authService: AuthService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.loader = new ScopedLoader(this.egretLoader);
  }

  async ngOnInit() {
    this.permissionSubscription = this.authService.permission$.pipe(takeUntil(this.destroy$)).subscribe(async (permissions: any) => {
      console.log('this.permissionObj res:- ', permissions);
      if (permissions && Object.keys(permissions).length > 0) {
        this.permissionObj = permissions[this.pageId];
        console.log('this.permissionObj:- ', this.permissionObj);
      }
    });
    this.loader.open();
    try {
      this.taskPayLoad = this.mapToTaskPayLoad(this.data.generateTasks);
      this.tasksList = this.mapToCheckTaskCount(this.data.generateTasks.salesPersons);
    } finally {
      this.loader.close();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.loader.close();
  }

  mapToTaskPayLoad(generateTasks: GenerateTasksData): CreateTasksPayload {
    return {
      messageQueueStatusId: generateMessageQueueStatusId(),
      salesPersons: generateTasks.salesPersons,
      taskDates: generateTasks.taskDates,
      filters: {
        businessTypes: generateTasks.filters.businessTypes,
        customerStatus: generateTasks.filters.customerStatus,
        businessStatus: generateTasks.filters.businessStatus,
        customerOrderStatus: generateTasks.filters.customerOrderStatus,
      },
    };
  }

  mapToCheckTaskCount(salesPersons: TaskSalesPerson[]): TaskPreviewRow[] {
    return salesPersons.map((sp) => ({
      id: sp.id,
      customerCount: sp.customerCount,
      name: sp.name,
      selectedDaysCount: sp.dateLength,
      expectedTaskCount: sp.expectedTaskCount,
      givenTaskCount: sp.givenTaskCount,
      taskCount: sp.tasksCount,
      message: this.getStatusMessage(sp),
      status: this.alertStatus(sp),
    }));
  }

  /** NOTE: compares expected tasks/day (ceil(customers / days)) with the entered tasks/day (string from the input). */
  alertStatus(sp: TaskSalesPerson): TaskCountStatus | undefined {
    return sp.customerCount === 0
      ? TaskCountStatus.ZERO
      : sp.expectedTaskCount > sp.tasksCount
      ? TaskCountStatus.GREATER_THAN
      : sp.expectedTaskCount < sp.tasksCount
      ? TaskCountStatus.LESS_THAN
      : sp.expectedTaskCount == sp.tasksCount
      ? TaskCountStatus.EQUAL_TO
      : undefined;
  }

  getStatusMessage(sp: TaskSalesPerson): string | undefined {
    return sp.customerCount == 0
      ? 'No Customers Found based on your Filters'
      : sp.expectedTaskCount == sp.tasksCount
      ? 'Success'
      : sp.expectedTaskCount > sp.tasksCount
      ? 'Insufficient task assignments for selected dates.'
      : sp.expectedTaskCount < sp.tasksCount
      ? 'There may be days when there will be no tasks assigned'
      : undefined;
  }

  getMessageColor(status: TaskCountStatus): string {
    switch (status) {
      case TaskCountStatus.GREATER_THAN:
        return 'red';
      case TaskCountStatus.LESS_THAN:
        return 'orange';
      case TaskCountStatus.EQUAL_TO:
        return 'green';
      case TaskCountStatus.ZERO:
        return 'red';
      default:
        return '';
    }
  }

  /** "Generate Tasks" button: blocked if any row is GREATER_THAN (1, shortage) or ZERO (4, no customers). */
  async generateTasks() {
    const shortageRow = this.tasksList.find((row) => row.status === 1);
    const noCustomersRow = this.tasksList.find((row) => row.status === 4);
    if (shortageRow) {
      this.showTaskShortageWarning();
    } else if (noCustomersRow) {
      this.showNoCustomersWarning();
    } else {
      await this.processSuccessfulTaskGeneration();
    }
  }

  showTaskShortageWarning() {
    showWarningAlert(
      'There is a shortage of tasks that need assignment. To address this, you can either increase the number of task dates or raise the task count per day. Make sure that all selected dates have an adequate number of task assignments to meet customer demand.'
    );
  }

  showNoCustomersWarning() {
    showWarningAlert('Based on your Filter, there are no customers for this salesperson.');
  }

  async processSuccessfulTaskGeneration() {
    this.loader.open();
    try {
      await this.postMessageToAzureQueue('CreateTasks', this.taskPayLoad);
      this.showSuccessMessage();
      this.loader.close();
      this.dialogRef.close({});
      this.generateTasksBtn = false;
    } catch (error) {
      console.log('processSuccessfulTaskGeneration Error ::: ', error);
      Swal.fire({ title: '', text: 'Something went wrong!', icon: 'error' });
    } finally {
      this.loader.close();
    }
  }

  /** Unused helper (kept from bundle). */
  mapToSalesPerson(salesPersons: any[]) {
    return salesPersons.map((sp) => ({ id: sp.id, name: sp.name, areaId: sp.areaId, areaName: sp.areaName }));
  }

  showSuccessMessage() {
    Swal.fire({ title: 'Success!', text: 'Tasks are being generated. Please wait for 5 minutes.', icon: 'success' });
  }

  async postMessageToAzureQueue(messageType: string, payload: any) {
    return this.messageQueueService.postMessageToQueue({ messageType, input: JSON.stringify(payload) });
  }
}
