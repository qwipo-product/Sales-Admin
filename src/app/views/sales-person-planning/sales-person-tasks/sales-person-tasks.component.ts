import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { DateAdapter } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject, Subscription, debounceTime, from, of, switchMap, takeUntil, catchError } from 'rxjs';
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
import {
  CompanyOption,
  CompanyShopShare,
  GenerateTasksData,
  PagePermission,
  SalesPerson,
  SalesPersonCustomerCount,
} from '../models/sales-person-planning.models';

type SelectAllState = 'checked' | 'indeterminate' | 'unchecked';

const DEFAULT_TASKS_PER_DAY = 35;

/** Dot colours of the Company options, in the order the API lists the companies. */
const COMPANY_COLORS = ['#a0522d', '#e53935', '#43a047', '#fb8c00', '#8e24aa', '#00897b', '#6d4c41', '#1e88e5', '#d81b60', '#546e7a'];

/** Filters that stay disabled until at least one sales person is selected. */
const DEPENDENT_CONTROLS = [
  'fromDate',
  'toDate',
  'customerStatusSelectRef',
  'businessStatusSelectRef',
  'businessTypeSelectRef',
  'customerOrderStatusRef',
  'companyIds',
];

/**
 * "Tasks" tab (selector `sales-person-tasks`, minified `Ry`).
 * Pick sales persons (only those with an area), a task date range, customer filters and companies, then
 * "Generate" -> count_by_salesperson -> Preview dialog -> "Generate Tasks" queues a CreateTasks message.
 * (The original picked dates one by one, chose sales persons and tasks/day in a table, and had no Company filter.)
 */
@Component({
  selector: 'sales-person-tasks',
  templateUrl: './sales-person-tasks.component.html',
  styleUrls: ['./sales-person-tasks.component.scss'],
})
export class SalesPersonTasksComponent implements OnInit, OnDestroy {
  pageId = PageIds.crm_salesperson_planning;
  selectAllBusinessStatusCheckbox = false;
  selectAllBusinessTypeCheckbox = false;
  businessTypesList = getBusinessTypes();
  businessStatusList = getBusinessStatusList();
  customerStatusList = getCustomerStatusList();
  customerOrderStatusList = getCustomerOrderStatusList();
  companies: CompanyOption[] = [];
  companiesLoading = false;
  companiesError = false;
  minDate: Date;
  salesPersonList: SalesPerson[];
  form: FormGroup;
  permissionObj: PagePermission;
  permissionSubscription: Subscription;
  private destroy$ = new Subject<void>();
  private companyShare$ = new Subject<string[]>();
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
    this.companyShare$
      .pipe(
        debounceTime(250),
        switchMap((ids) => {
          this.companiesLoading = true;
          return from(this.salesPersonService.getCompanyShopShare(ids)).pipe(catchError(() => of(undefined)));
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((shares: CompanyShopShare[] | undefined) => this.setCompanies(shares));
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
    this.form = this.fb.group({
      salesPersonIds: new FormControl<string[]>([]),
      fromDate: new FormControl<Date | null>({ value: null, disabled: true }),
      toDate: new FormControl<Date | null>({ value: null, disabled: true }),
      customerStatusSelectRef: new FormControl({ value: null, disabled: true }),
      businessStatusSelectRef: new FormControl({ value: null, disabled: true }),
      businessTypeSelectRef: new FormControl({ value: null, disabled: true }),
      customerOrderStatusRef: new FormControl({ value: null, disabled: true }),
      companyIds: new FormControl<string[]>({ value: [], disabled: true }),
    });
    this.form
      .get('salesPersonIds')
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((ids: string[]) => this.onSalesPersonsChange(ids || []));
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
      salesPerson.tasksCount = DEFAULT_TASKS_PER_DAY;
    }
  }

  private value(name: string): any {
    return this.form?.get(name)?.value;
  }

  // ------------------------------------------------------------------------------------------- sales persons
  get selectedSalesPersonIds(): string[] {
    return this.value('salesPersonIds') || [];
  }

  get selectedSalespersons(): SalesPerson[] {
    const ids = this.selectedSalesPersonIds;
    return (this.salesPersonList || []).filter((sp) => ids.includes(sp.id));
  }

  get salesPersonsSelectAllState(): SelectAllState {
    return this.selectAllState(this.selectedSalesPersonIds.length, this.salesPersonList?.length || 0);
  }

  get selectedCustomersTotal(): number {
    return this.selectedSalespersons.reduce((total, sp) => total + (Number(sp.customerCount) || 0), 0);
  }

  toggleAllSalesPersons() {
    const all = this.salesPersonsSelectAllState === 'checked';
    this.form.get('salesPersonIds').setValue(all ? [] : this.salesPersonList.map((sp) => sp.id));
  }

  /** The other filters unlock once a sales person is selected; the Company shares follow the selection. */
  onSalesPersonsChange(ids: string[]) {
    DEPENDENT_CONTROLS.forEach((name) => {
      const control = this.form.get(name);
      if (ids.length) {
        control.enable({ emitEvent: false });
      } else {
        control.disable({ emitEvent: false });
      }
    });
    if (ids.length) {
      this.companyShare$.next(ids);
    }
  }

  initials(name: string): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }

  // ------------------------------------------------------------------------------------------- dates
  /** A To date before the new From date is cleared. */
  onFromDateChange() {
    const fromDate: Date = this.value('fromDate');
    const toDate: Date = this.value('toDate');
    if (fromDate && toDate && this.dateAdapter.compareDate(toDate, fromDate) < 0) {
      this.form.get('toDate').setValue(null);
    }
  }

  get toDateMin(): Date {
    return this.value('fromDate') || this.minDate;
  }

  /** Every day from the From date to the To date, both included. */
  get taskDates(): Date[] {
    const fromDate: Date = this.value('fromDate');
    const toDate: Date = this.value('toDate');
    if (!fromDate || !toDate || this.dateAdapter.compareDate(toDate, fromDate) < 0) {
      return [];
    }
    const dates: Date[] = [];
    for (let day = fromDate; this.dateAdapter.compareDate(day, toDate) <= 0; day = this.dateAdapter.addCalendarDays(day, 1)) {
      dates.push(day);
    }
    return dates;
  }

  // ------------------------------------------------------------------------------------------- customer filters
  get selectedCustomerStatus(): any[] {
    return this.value('customerStatusSelectRef') || [];
  }

  get selectedBusinessStatus(): any[] {
    return this.value('businessStatusSelectRef') || [];
  }

  get selectedBusinessTypes(): any[] {
    return this.value('businessTypeSelectRef') || [];
  }

  get selectedCustomerOrderStatus(): any[] {
    return this.value('customerOrderStatusRef') || [];
  }

  toggleSelectAllBusinessTypes() {
    this.selectAllBusinessTypeCheckbox = !this.selectAllBusinessTypeCheckbox;
    this.form.get('businessTypeSelectRef').patchValue(this.selectAllBusinessTypeCheckbox ? this.businessTypesList.map((t) => t.value) : []);
  }

  /** Keeps the "Select All" checkbox in sync (also for keyboard selection). */
  getSelectedBusinessTypes() {
    this.selectAllBusinessTypeCheckbox = this.selectedBusinessTypes.length === this.businessTypesList.length;
  }

  toggleSelectAllBusinessStatus() {
    this.selectAllBusinessStatusCheckbox = !this.selectAllBusinessStatusCheckbox;
    this.form.get('businessStatusSelectRef').patchValue(this.selectAllBusinessStatusCheckbox ? this.businessStatusList.map((s) => s.value) : []);
  }

  /** Keeps the "Select All" checkbox in sync (also for keyboard selection). */
  getSelectedBusinessStatus() {
    this.selectAllBusinessStatusCheckbox = this.selectedBusinessStatus.length === this.businessStatusList.length;
  }

  // ------------------------------------------------------------------------------------------- companies
  get selectedCompanyIds(): string[] {
    return this.value('companyIds') || [];
  }

  get companiesSelectAllState(): SelectAllState {
    return this.selectAllState(this.selectedCompanyIds.length, this.companies.length);
  }

  toggleAllCompanies() {
    const all = this.companiesSelectAllState === 'checked';
    this.form.get('companyIds').setValue(all ? [] : this.companies.map((c) => c.id));
  }

  /** New shop shares for the selected sales persons; companies that are no longer offered are deselected. */
  setCompanies(shares: CompanyShopShare[] | undefined) {
    this.companiesLoading = false;
    this.companiesError = !Array.isArray(shares);
    this.companies = (shares || []).map((share, index) => ({
      id: share.company_id,
      name: share.company_name,
      color: COMPANY_COLORS[index % COMPANY_COLORS.length],
      shopPercentage: Math.round(Number(share.shop_percentage) || 0),
    }));
    const offered = this.selectedCompanyIds.filter((id) => this.companies.some((c) => c.id === id));
    if (offered.length !== this.selectedCompanyIds.length) {
      this.form.get('companyIds').setValue(offered);
    }
  }

  // ------------------------------------------------------------------------------------------- triggers
  get salesPersonTriggerText(): string {
    return this.triggerText(this.selectedSalespersons.map((sp) => sp.name), this.salesPersonList?.length || 0, 'All sales persons');
  }

  get companyTriggerText(): string {
    const names = this.companies.filter((c) => this.selectedCompanyIds.includes(c.id)).map((c) => c.name);
    return this.triggerText(names, this.companies.length, 'All companies');
  }

  private triggerText(names: string[], total: number, allLabel: string): string {
    if (!names.length) {
      return '';
    }
    if (names.length === total && total > 1) {
      return `${allLabel} (${total})`;
    }
    const others = names.length - 1;
    return others ? `${names[0]} (+${others} ${others === 1 ? 'other' : 'others'})` : names[0];
  }

  private selectAllState(selected: number, total: number): SelectAllState {
    return selected === 0 || total === 0 ? 'unchecked' : selected >= total ? 'checked' : 'indeterminate';
  }

  // ------------------------------------------------------------------------------------------- generate
  /** "Generate" is enabled once every filter has a value. */
  get canGenerate(): boolean {
    return (
      !!this.form &&
      this.selectedSalesPersonIds.length > 0 &&
      this.taskDates.length > 0 &&
      this.selectedCustomerStatus.length > 0 &&
      this.selectedBusinessStatus.length > 0 &&
      this.selectedBusinessTypes.length > 0 &&
      this.selectedCustomerOrderStatus.length > 0 &&
      this.selectedCompanyIds.length > 0
    );
  }

  mapToSalesPersons(salesPersons: SalesPerson[]) {
    return salesPersons.map((sp) => ({
      id: sp.id,
      taskCountPerDay: Number(sp.tasksCount),
      areaId: sp.areaId,
      areaName: sp.areaName,
    }));
  }

  /** "Generate" button. */
  async generateTasks() {
    if (!this.canGenerate) {
      showWarningAlert('Please select all the filters');
      return;
    }
    try {
      const request = { salesPersons: this.mapToSalesPersons(this.selectedSalespersons) };
      await this.checkTaskCount(request);
    } catch (error) {
      this.loader.close();
      console.log('ERROR:::', error);
    }
  }

  async checkTaskCount(request: any) {
    this.loader.open();
    try {
      const dates = this.taskDates;
      // business type names ('Kirana', ...) -> numeric BusinessType enum values (1, ...)
      const businessTypeIds = this.selectedBusinessTypes.map((type) => (BusinessType as any)[type]);
      const customerCounts = await this.getCustomerCount(
        this.selectedSalespersons,
        dates,
        this.selectedCustomerStatus,
        this.selectedBusinessStatus,
        businessTypeIds,
        this.selectedCustomerOrderStatus,
        this.selectedCompanyIds
      );
      const generateTasks: GenerateTasksData = {
        salesPersons: this.mergeResponses(customerCounts, request, dates),
        taskDates: formatDatesToYMD(dates),
        filters: {
          businessTypes: businessTypeIds,
          customerStatus: this.selectedCustomerStatus,
          businessStatus: this.selectedBusinessStatus,
          customerOrderStatus: this.selectedCustomerOrderStatus,
          companyIds: this.selectedCompanyIds,
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
    customerOrderStatus: any[],
    companyIds: string[]
  ) {
    const body = {
      isActive: customerStatus,
      businessStatus,
      businessType: businessTypes,
      salespersonIds: salesPersons.map((sp) => sp.id),
      customerOrderStatus,
      companyIds,
    };
    const counts: SalesPersonCustomerCount[] = await this.salesPersonService.getCustomerCount(body);
    if (!Array.isArray(counts)) {
      // SalesPersonService.getCustomerCount swallows HTTP errors and resolves undefined.
      throw new Error('count_by_salesperson returned no data');
    }
    return counts.map((count) => {
      const tasksCount = Number(salesPersons.find((sp) => sp.id === count.salesperson_id)?.tasksCount);
      return {
        salespersonId: count.salesperson_id,
        name: salesPersons.find((sp) => sp.id === count.salesperson_id)?.name || 'Unknown',
        dateLength: dates.length,
        customerCount: count.customer_count,
        tasksCount,
        givenTaskCount: Math.ceil(dates.length * (tasksCount || 0)),
        expectedTaskCount: Math.ceil(count.customer_count / dates.length),
      };
    });
  }

  mergeResponses(customerCounts: any[], request: any, dates: Date[]) {
    return request.salesPersons.map((sp: any) => {
      const count = customerCounts.find((c) => c.salespersonId === sp.id);
      return {
        id: sp.id,
        name: this.selectedSalespersons.find((s) => s.id === sp.id)?.name || 'Unknown',
        dateLength: dates.length,
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
    this.form.reset({ salesPersonIds: [], companyIds: [] });
    this.selectAllBusinessStatusCheckbox = false;
    this.selectAllBusinessTypeCheckbox = false;
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
