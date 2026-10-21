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
import { BusinessType } from '../../../shared/models/enums';
// main 1972 helper names differ from the names this chunk was reconstructed with; aliased to keep the semantics:
// customer status = Active/InActive, business status = Lost ... None, customer order status = days since last order.
import {
  getCustomerStatusList as getBusinessStatusList,
  getBusinessTypeList as getBusinessTypes,
  getLastOrderDaysList as getCustomerOrderStatusList,
  getStatusList as getCustomerStatusList,
  showWarningAlert,
} from '../../../shared/helpers/utils';
import { GenerateTasksDialogComponent } from '../dialogs/generate-tasks-dialog/generate-tasks-dialog.component';
import { ScopedLoader } from '../services/scoped-loader';
import {
  CompanyOption,
  CompanyShopShare,
  GenerateTasksDialogData,
  PagePermission,
  SalesPerson,
  ScheduleShop,
  TaskFilters,
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
 * "Generate" -> shops_for_schedule -> Generate Tasks dialog (sets, a day per set, schedule) -> "Assign schedule"
 * queues a CreateTasks message.
 * (The original picked dates one by one, chose sales persons and tasks/day in a table, had no Company filter, and
 * showed a "View Tasks Preview" table instead of the dialog.)
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
      salesPersonId: new FormControl<string | null>(null),
      fromDate: new FormControl<Date | null>({ value: null, disabled: true }),
      toDate: new FormControl<Date | null>({ value: null, disabled: true }),
      customerStatusSelectRef: new FormControl({ value: null, disabled: true }),
      businessStatusSelectRef: new FormControl({ value: null, disabled: true }),
      businessTypeSelectRef: new FormControl({ value: null, disabled: true }),
      customerOrderStatusRef: new FormControl({ value: null, disabled: true }),
      companyIds: new FormControl<string[]>({ value: [], disabled: true }),
    });
    this.form
      .get('salesPersonId')
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((id: string | null) => this.onSalesPersonChange(id));
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
  /** Tasks are generated for one sales person at a time. */
  get selectedSalesPersonId(): string | null {
    return this.value('salesPersonId') || null;
  }

  get selectedSalesPerson(): SalesPerson | undefined {
    return (this.salesPersonList || []).find((sp) => sp.id === this.selectedSalesPersonId);
  }

  /** The other filters unlock once a sales person is selected; the Company shares follow the selection. */
  onSalesPersonChange(id: string | null) {
    DEPENDENT_CONTROLS.forEach((name) => {
      const control = this.form.get(name);
      if (id) {
        control.enable({ emitEvent: false });
      } else {
        control.disable({ emitEvent: false });
      }
    });
    if (id) {
      this.companyShare$.next([id]);
    }
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
      !!this.selectedSalesPerson &&
      this.taskDates.length > 0 &&
      this.selectedCustomerStatus.length > 0 &&
      this.selectedBusinessStatus.length > 0 &&
      this.selectedBusinessTypes.length > 0 &&
      this.selectedCustomerOrderStatus.length > 0 &&
      this.selectedCompanyIds.length > 0
    );
  }

  /** "Generate" button: loads the matching shops, then opens the Generate Tasks dialog (sets -> pick days -> schedule). */
  async generateTasks() {
    if (!this.canGenerate) {
      showWarningAlert('Please select all the filters');
      return;
    }
    const filters: TaskFilters = {
      // business type names ('Kirana', ...) -> numeric BusinessType enum values (1, ...)
      businessTypes: this.selectedBusinessTypes.map((type) => (BusinessType as any)[type]),
      customerStatus: this.selectedCustomerStatus,
      businessStatus: this.selectedBusinessStatus,
      customerOrderStatus: this.selectedCustomerOrderStatus,
      companyIds: this.selectedCompanyIds,
    };
    this.loader.open();
    try {
      const shops: ScheduleShop[] = await this.salesPersonService.getShopsForSchedule({
        isActive: filters.customerStatus,
        businessStatus: filters.businessStatus,
        businessType: filters.businessTypes,
        salespersonIds: [this.selectedSalesPersonId],
        customerOrderStatus: filters.customerOrderStatus,
        companyIds: filters.companyIds,
      });
      if (!Array.isArray(shops)) {
        throw new Error('shops_for_schedule returned no data');
      }
      const data: GenerateTasksDialogData = {
        salesPerson: this.selectedSalesPerson,
        dates: this.taskDates,
        filters,
        companies: this.companies.filter((company) => this.selectedCompanyIds.includes(company.id)),
        shops,
      };
      this.loader.close();
      this.dialog.open(GenerateTasksDialogComponent, { width: '90%', height: '90%', maxWidth: '96vw', disableClose: true, data });
    } catch (error) {
      console.log('generateTasks Error ::: ', error);
      Swal.fire({ title: '', text: 'Something went wrong!', icon: 'error' });
    } finally {
      this.loader.close();
    }
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
