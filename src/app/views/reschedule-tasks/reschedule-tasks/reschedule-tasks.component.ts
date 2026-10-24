import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { DateAdapter } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { SalesPersonService } from '../../../shared/services/sales-person.service';
import { AuthService } from '../../../shared/services/auth/auth.service';
import { AppLoaderService } from '../../../shared/services/app-loader/app-loader.service';
import { PageIds } from '../../../shared/constants/page-ids';
import { ScopedLoader } from '../../sales-person-planning/services/scoped-loader';
import { GenerateTasksDialogComponent } from '../dialogs/generate-tasks-dialog/generate-tasks-dialog.component';
import { formatDates, showWarningAlert } from '../../../shared/helpers/utils';
import {
  CompanyOption,
  CompanyShopShare,
  ExistingTaskSet,
  PagePermission,
  RescheduleDialogData,
  SalesPerson,
  ScheduleShop,
} from '../models/reschedule-tasks.models';

/** Company dot colours in the dialog, in the order the API lists the companies. */
const COMPANY_COLORS = ['#a0522d', '#e53935', '#43a047', '#fb8c00', '#8e24aa', '#00897b', '#6d4c41', '#1e88e5', '#d81b60', '#546e7a'];

/**
 * "Reschedule Tasks" page (not in the original app). Pick a sales person (only those with an area) and a From - To date
 * range, then "Reschedule" loads the sales person's existing tasks in that range (created from Planning → Tasks). Each
 * task date is a set; the dialog moves sets to the days whose next-day company deliveries reach the most shops, and
 * "Assign schedule" replaces the tasks in the range. Every company counts.
 * Shown to users who may see Planning (same page permission).
 */
@Component({
  selector: 'app-reschedule-tasks',
  templateUrl: './reschedule-tasks.component.html',
  styleUrls: ['./reschedule-tasks.component.scss'],
})
export class RescheduleTasksComponent implements OnInit, OnDestroy {
  pageId = PageIds.crm_salesperson_planning;
  minDate: Date;
  salesPersonList: SalesPerson[];
  form: FormGroup;
  permissionObj: PagePermission;
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
    this.authService.permission$.pipe(takeUntil(this.destroy$)).subscribe((permissions: any) => {
      if (permissions && Object.keys(permissions).length > 0) {
        this.permissionObj = permissions[this.pageId];
      }
    });
    this.form = this.fb.group({
      salesPersonId: new FormControl<string | null>(null),
      fromDate: new FormControl<Date | null>(null),
      toDate: new FormControl<Date | null>(null),
    });
    this.loader.open();
    try {
      const salesPersons: SalesPerson[] = (await this.salesPersonService.getSalesPersons()) || [];
      this.salesPersonList = salesPersons.filter((sp) => sp.areaName && sp.areaName.length > 0);
    } catch (error) {
      console.log('getSalesPersons Error ::: ', error);
      this.salesPersonList = [];
    } finally {
      this.loader.close();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.loader.close();
  }

  private value(name: string): any {
    return this.form?.get(name)?.value;
  }

  get selectedSalesPerson(): SalesPerson | undefined {
    const id = this.value('salesPersonId');
    return (this.salesPersonList || []).find((sp) => sp.id === id);
  }

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

  /** "Reschedule" is enabled once a sales person and a date range are picked. */
  get canReschedule(): boolean {
    return !!this.selectedSalesPerson && this.taskDates.length > 0;
  }

  /** "Reschedule": loads the sales person's tasks in the range, their shops and the companies, then opens the dialog. */
  async reschedule() {
    const salesPerson = this.selectedSalesPerson;
    if (!this.canReschedule || !salesPerson) {
      return;
    }
    const dates = this.taskDates;
    const [fromDate, toDate] = formatDates([dates[0], dates[dates.length - 1]]);
    const body = { isActive: [], businessStatus: [], businessType: [], salespersonIds: [salesPerson.id], customerOrderStatus: [] };
    this.loader.open();
    try {
      const [tasks, shares, shops]: [any[], CompanyShopShare[], ScheduleShop[]] = await Promise.all([
        this.salesPersonService.getTasksByFilter(fromDate, toDate, [salesPerson.id]),
        this.salesPersonService.getCompanyShopShare(body),
        this.salesPersonService.getShopsForSchedule({ ...body, companyIds: [] }),
      ]);
      if (!Array.isArray(tasks) || !Array.isArray(shares) || !Array.isArray(shops)) {
        throw new Error('tasks / company_share_by_salesperson / shops_for_schedule returned no data');
      }
      if (!tasks.length) {
        this.loader.close();
        showWarningAlert(`${salesPerson.name} has no tasks between these dates. Generate them from Planning → Tasks first.`);
        return;
      }
      const companies: CompanyOption[] = shares.map((share, index) => ({
        id: share.company_id,
        name: share.company_name,
        color: COMPANY_COLORS[index % COMPANY_COLORS.length],
        shopPercentage: Math.round(Number(share.shop_percentage) || 0),
      }));
      const data: RescheduleDialogData = { salesPerson, dates, companies, sets: this.toSets(tasks, shops) };
      this.loader.close();
      this.dialog.open(GenerateTasksDialogComponent, { width: '90%', height: '90%', maxWidth: '96vw', disableClose: true, data });
    } catch (error) {
      console.log('reschedule Error ::: ', error);
      Swal.fire({ title: '', text: 'Something went wrong!', icon: 'error' });
    } finally {
      this.loader.close();
    }
  }

  /** One set per task date (earliest first), its shops in stop order. Shops the API did not return stock no company. */
  private toSets(tasks: any[], shops: ScheduleShop[]): ExistingTaskSet[] {
    const shopsById = new Map(shops.map((shop) => [shop.customer_id, shop]));
    const byDate = new Map<string, any[]>();
    tasks.forEach((task) => byDate.set(task.taskDate, [...(byDate.get(task.taskDate) || []), task]));
    return [...byDate.keys()].sort().map((taskDate) => ({
      taskDate,
      shops: byDate
        .get(taskDate)
        .sort((a, b) => (Number(a.stopNumber) || 0) - (Number(b.stopNumber) || 0))
        .map((task) => {
          const info = task.customerInfo || {};
          return (
            shopsById.get(task.customerId) || {
              customer_id: task.customerId,
              business_name: info.businessName || task.customerId,
              area_name: info.areaName || '',
              salesperson_id: task.salesPersonId,
              latitude: Number(info.latitude) || 0,
              longitude: Number(info.longitude) || 0,
              companies: [],
            }
          );
        }),
    }));
  }
}
