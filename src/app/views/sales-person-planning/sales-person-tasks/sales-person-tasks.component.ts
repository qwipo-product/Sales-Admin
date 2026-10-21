import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { DateAdapter } from '@angular/material/core';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { Subject, Subscription, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { SalesPersonService } from '../../../shared/services/sales-person.service';
import { AuthService } from '../../../shared/services/auth/auth.service';
import { AppLoaderService } from '../../../shared/services/app-loader/app-loader.service';
import { PageIds } from '../../../shared/constants/page-ids';
import { BusinessType, MessageQueueStatus } from '../../../shared/models/enums';
// main 1972 helper names differ from the names this chunk was reconstructed with; aliased to keep the semantics:
// customer status = Active/InActive, business status = Lost ... None, customer order status = days since last order.
import {
  formatDates as formatDatesToYMD,
  getCustomerStatusList as getBusinessStatusList,
  getBusinessTypeList as getBusinessTypes,
  getLastOrderDaysList as getCustomerOrderStatusList,
  getStatusList as getCustomerStatusList,
  showWarningAlert,
} from '../../../shared/helpers/utils';
import { PreviewDialogComponent } from '../dialogs/preview-dialog/preview-dialog.component';
import { ScopedLoader } from '../services/scoped-loader';
import { GenerateTasksData, PagePermission, SalesPerson, SalesPersonCustomerCount } from '../models/sales-person-planning.models';

/**
 * "Tasks" tab (selector `sales-person-tasks`, minified `Ry`).
 * Pick task dates + customer filters + sales persons (only those with an area) + tasks/day, then
 * "Preview" -> count_by_salesperson -> Preview dialog -> "Generate Tasks" queues a CreateTasks message.
 */
@Component({
  selector: 'sales-person-tasks',
  templateUrl: './sales-person-tasks.component.html',
  styleUrls: ['./sales-person-tasks.component.scss'],
})
export class SalesPersonTasksComponent implements OnInit, OnDestroy {
  pageId = PageIds.crm_salesperson_planning;
  selectAllBusinessTypes = new FormControl(false); // unused
  selectedDates: Date[] = [];
  selectAllCheckbox = false;
  selectAllBusinessStatusCheckbox = false;
  selectAllBusinessTypeCheckbox = false;
  /** Row selection state keyed by sales person id (also read with option names, see template). */
  checkboxStates: { [key: string]: boolean } = {};
  businessTypesList = getBusinessTypes();
  selectedBusinessTypes: any[] = [];
  businessStatusList = getBusinessStatusList();
  selectedBusinessStatus: any[] = [];
  customerStatusList = getCustomerStatusList();
  selectedCustomerStatus: any[] = [];
  customerOrderStatusList = getCustomerOrderStatusList();
  selectedCustomerOrderStatus: any[] = [];
  selectedSalespersons: SalesPerson[] = [];
  salesPersonColumns: string[] = ['checkbox', 'Name', 'Area Name', 'Customer Count', 'Tasks Count'];
  minDate: Date;
  salesPersonList: SalesPerson[];
  form: FormGroup;
  permissionObj: PagePermission;
  permissionSubscription: Subscription;
  private destroy$ = new Subject<void>();
  private loader: ScopedLoader;

  constructor(
    private fb: FormBuilder,
    private salesPersonService: SalesPersonService,
    private dateAdapter: DateAdapter<Date>,
    private egretLoader: AppLoaderService,
    private dialog: MatDialog,
    private authService: AuthService
  ) {
    this.minDate = this.dateAdapter.today();
    this.loader = new ScopedLoader(this.egretLoader);
  }

  async ngOnInit() {
    this.permissionSubscription = this.authService.permission$.pipe(takeUntil(this.destroy$)).subscribe(async (permissions: any) => {
      if (permissions && Object.keys(permissions).length > 0) {
        this.permissionObj = permissions[this.pageId];
      }
    });
    this.loader.open();
    try {
      this.salesPersonList = await this.getSalesPersonsWithArea();
      this.initializeForm();
    } catch (error) {
      console.log('getSalesPersonsWithArea Error ::: ', error);
    } finally {
      this.loader.close();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // The tab is destroyed on every tab switch: never leave its "Please wait" dialog behind.
    this.loader.close();
  }

  initializeForm() {
    const checkboxControls = this.salesPersonList.reduce((controls: any, salesPerson) => {
      controls[salesPerson.id] = new FormControl(false);
      return controls;
    }, {});
    this.form = this.fb.group({
      selectAll: new FormControl(false),
      checkboxes: this.fb.group(checkboxControls),
      endDate: new FormControl(null),
      customerStatusSelectRef: new FormControl(null),
      businessStatusSelectRef: new FormControl(null),
      businessTypeSelectRef: new FormControl(null),
      customerOrderStatusRef: new FormControl(null),
    });
  }

  /** Only sales persons that already have an area (cluster) assigned. */
  async getSalesPersonsWithArea(): Promise<SalesPerson[]> {
    const salesPersons = await this.salesPersonService.getSalesPersons();
    if (salesPersons && salesPersons.length) {
      const withArea = salesPersons.filter((sp: SalesPerson) => sp.areaName && sp.areaName.length > 0);
      withArea.forEach((sp: SalesPerson) => this.setDefaultTasksCount(sp));
      return withArea || [];
    }
    return [];
  }

  setDefaultTasksCount(salesPerson: SalesPerson) {
    if (salesPerson.tasksCount == null || isNaN(salesPerson.tasksCount)) {
      salesPerson.tasksCount = 35;
    }
  }

  /** Datepicker (dateChange): add the picked date as a chip (a day that is already listed is not added again). */
  onSelect(event: MatDatepickerInputEvent<Date>) {
    const date = event.value;
    if (date && !this.selectedDates.some((d) => new Date(d).toDateString() === new Date(date).toDateString())) {
      this.selectedDates.push(date);
    }
  }

  removeDate(index: number) {
    this.selectedDates.splice(index, 1);
  }

  toggleSelectAll() {
    this.selectAllCheckbox = !this.selectAllCheckbox;
    for (const salesPerson of this.salesPersonList) {
      this.checkboxStates[salesPerson.id] = this.selectAllCheckbox;
    }
    // Rebuilt instead of pushed, so rows that were already ticked are not selected twice.
    this.selectedSalespersons = this.selectAllCheckbox ? [...this.salesPersonList] : [];
  }

  toggleCheckbox(salesPerson: SalesPerson) {
    this.checkboxStates[salesPerson.id] = !this.checkboxStates[salesPerson.id];
    if (this.checkboxStates[salesPerson.id]) {
      this.selectedSalespersons.push(salesPerson);
    } else {
      const index = this.selectedSalespersons.findIndex((sp) => sp.id === salesPerson.id);
      if (index !== -1) {
        this.selectedSalespersons.splice(index, 1);
      }
    }
    // checkboxStates only holds the rows toggled so far: check every row of the list.
    this.selectAllCheckbox = this.salesPersonList.every((sp) => this.checkboxStates[sp.id]);
  }

  toggleSelectAllBusinessTypes() {
    this.selectAllBusinessTypeCheckbox = !this.selectAllBusinessTypeCheckbox;
    if (this.selectAllBusinessTypeCheckbox) {
      this.form.get('businessTypeSelectRef').patchValue(this.businessTypesList.map((t) => t.value));
      this.selectedBusinessTypes = this.businessTypesList.map((t) => t.value);
    } else {
      this.form.get('businessTypeSelectRef').patchValue([]);
      this.selectedBusinessTypes = [];
    }
  }

  isAllBusinessTypesSelected(event: any) {
    const selected = this.form.get('businessTypeSelectRef').value || [];
    const all = this.businessTypesList.map((t) => t.value);
    this.selectAllBusinessTypeCheckbox = selected.length === all.length;
  }

  getSelectedBusinessTypes() {
    this.selectedBusinessTypes = this.form.controls['businessTypeSelectRef']?.value || [];
    // Keeps the (unbound) "Select All" checkbox in sync for keyboard selection too (option (click) is mouse-only).
    this.isAllBusinessTypesSelected(null);
  }

  toggleSelectAllBusinessStatus() {
    this.selectAllBusinessStatusCheckbox = !this.selectAllBusinessStatusCheckbox;
    if (this.selectAllBusinessStatusCheckbox) {
      this.form.get('businessStatusSelectRef').patchValue(this.businessStatusList.map((s) => s.value));
      this.selectedBusinessStatus = this.businessStatusList.map((s) => s.value);
    } else {
      this.form.get('businessStatusSelectRef').patchValue([]);
      this.selectedBusinessStatus = [];
    }
  }

  isAllBusinessStatusSelected(event: any) {
    const selected = this.form.get('businessStatusSelectRef').value || [];
    const all = this.businessStatusList.map((s) => s.value);
    this.selectAllBusinessStatusCheckbox = selected.length === all.length;
  }

  getSelectedBusinessStatus() {
    this.selectedBusinessStatus = this.form.controls['businessStatusSelectRef']?.value || [];
    // Keeps the (unbound) "Select All" checkbox in sync for keyboard selection too (option (click) is mouse-only).
    this.isAllBusinessStatusSelected(null);
  }

  getSelectedCustomerStatus() {
    this.selectedCustomerStatus = this.form.controls['customerStatusSelectRef']?.value || [];
  }

  getSelectedCustomerOrderStatus() {
    this.selectedCustomerOrderStatus = this.form.controls['customerOrderStatusRef']?.value || [];
  }

  mapToSalesPersons(salesPersons: SalesPerson[]) {
    return salesPersons.map((sp) => ({
      id: sp.id,
      // The Tasks Count input is a text field: send a number.
      taskCountPerDay: Number(sp.tasksCount),
      areaId: sp.areaId,
      areaName: sp.areaName,
    }));
  }

  /** "Preview" button. */
  async generateTasks() {
    try {
      if (this.validateSelections()) {
        const request = {
          salesPersons: this.mapToSalesPersons(this.selectedSalespersons),
          taskDates: formatDatesToYMD(this.selectedDates),
          filters: {
            businessTypes: this.selectedBusinessTypes,
            customerStatus: this.selectedCustomerStatus,
            businessStatus: this.selectedBusinessStatus,
            customerOrderStatus: this.selectedCustomerOrderStatus,
          },
        };
        await this.checkTaskCount(request);
      }
    } catch (error) {
      this.loader.close();
      console.log('ERROR:::', error);
    }
  }

  /** Customer Status is NOT validated. Tasks count must be > 0 for every selected sales person. */
  validateSelections(): boolean {
    const hasItems = (items: any[], message: string) => !!items.length || (showWarningAlert(message), false);
    if (
      !(
        hasItems(this.selectedBusinessStatus, 'Please select the Business Status') &&
        hasItems(this.selectedSalespersons, 'Please select the SalesPerson') &&
        hasItems(this.selectedBusinessTypes, 'Please select the Business Type') &&
        hasItems(this.selectedCustomerOrderStatus, 'Please select the Customer Order Status') &&
        hasItems(this.selectedDates, 'Please select the Date')
      )
    ) {
      return false;
    }
    if (this.selectedSalespersons && !this.selectedSalespersons.every((sp) => Number(sp.tasksCount) > 0)) {
      showWarningAlert('Please Enter Tasks');
      return false;
    }
    return true;
  }

  async checkTaskCount(request: any) {
    this.loader.open();
    try {
      // business type names ('Kirana', ...) -> numeric BusinessType enum values (1, ...)
      const businessTypeIds = this.selectedBusinessTypes.map((type) => (BusinessType as any)[type]);
      const customerCounts = await this.getCustomerCount(
        this.selectedSalespersons,
        this.selectedDates,
        this.selectedCustomerStatus,
        this.selectedBusinessStatus,
        businessTypeIds,
        this.selectedCustomerOrderStatus
      );
      const generateTasks: GenerateTasksData = {
        salesPersons: this.mergeResponses(customerCounts, request),
        taskDates: formatDatesToYMD(this.selectedDates),
        filters: {
          businessTypes: businessTypeIds,
          customerStatus: this.selectedCustomerStatus,
          businessStatus: this.selectedBusinessStatus,
          customerOrderStatus: this.selectedCustomerOrderStatus,
        },
      };
      this.loader.close();
      this.viewTaskDetails(generateTasks);
    } catch (error) {
      console.log('error', error);
      Swal.fire({ title: '', text: 'Something went wrong!', icon: 'error' });
    } finally {
      this.loader.close();
    }
  }

  async getCustomerCount(
    salesPersons: SalesPerson[],
    dates: Date[],
    customerStatus: any[],
    businessStatus: any[],
    businessTypes: any[],
    customerOrderStatus: any[]
  ) {
    const body = {
      isActive: customerStatus,
      businessStatus,
      businessType: businessTypes,
      salespersonIds: salesPersons.map((sp) => sp.id),
      customerOrderStatus,
    };
    const counts: SalesPersonCustomerCount[] = await this.salesPersonService.getCustomerCount(body);
    if (!Array.isArray(counts)) {
      // SalesPersonService.getCustomerCount swallows HTTP errors and resolves undefined.
      throw new Error('count_by_salesperson returned no data');
    }
    return counts.map((count) => ({
      salespersonId: count.salesperson_id,
      name: salesPersons.find((sp) => sp.id === count.salesperson_id)?.name || 'Unknown',
      dateLength: dates.length,
      customerCount: count.customer_count,
      tasksCount: Number(salesPersons.find((sp) => sp.id === count.salesperson_id)?.tasksCount),
      givenTaskCount: Math.ceil(dates.length * (Number(salesPersons.find((sp) => sp.id === count.salesperson_id)?.tasksCount) || 0)),
      expectedTaskCount: Math.ceil(count.customer_count / dates.length),
    }));
  }

  mergeResponses(customerCounts: any[], request: any) {
    return request.salesPersons.map((sp: any) => {
      const count = customerCounts.find((c) => c.salespersonId === sp.id);
      return {
        id: sp.id,
        name: this.selectedSalespersons.find((s) => s.id === sp.id)?.name || 'Unknown',
        dateLength: this.selectedDates.length,
        customerCount: count ? count.customerCount : 0,
        tasksCount: count ? count.tasksCount : sp.taskCountPerDay,
        givenTaskCount: count ? count.givenTaskCount : 0,
        expectedTaskCount: count ? count.expectedTaskCount : 0,
        taskCountPerDay: sp.taskCountPerDay,
        areaId: sp.areaId,
        areaName: sp.areaName,
      };
    });
  }

  async viewTaskDetails(generateTasks: GenerateTasksData) {
    this.dialog
      .open(PreviewDialogComponent, {
        width: '90%',
        height: '90%',
        disableClose: true,
        data: { generateTasks },
      })
      .afterClosed()
      .subscribe(async (result: any) => {
        // NOTE: the preview dialog closes with {} so this never clears the filters.
        if (result && result.taskStatus == MessageQueueStatus.Started) {
          this.clearTaskFilters();
        }
      });
  }

  clearTaskFilters() {
    this.form.reset();
    this.selectedDates = [];
    this.selectedCustomerStatus = [];
    this.selectedBusinessTypes = [];
    this.selectedSalespersons = [];
  }

  /** Unused helper (kept from bundle). */
  async mapToMessageQueue(message: any) {
    return message && message.messageQueueStatusId
      ? {
          messageQueueStatusId: message.messageQueueStatusId,
          createdDate: message.createdDate || Date.now(),
          messageType: message.messageType || '',
          status: message.status || 0,
          messagePayLoad: { salesPersons: message.messagePayLoad?.salesPersons || [] },
        }
      : null;
  }
}
