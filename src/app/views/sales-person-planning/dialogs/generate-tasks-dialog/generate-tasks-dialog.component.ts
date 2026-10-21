import { Component, Inject, LOCALE_ID, OnDestroy } from '@angular/core';
import { formatDate } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';

import { AppLoaderService } from '../../../../shared/services/app-loader/app-loader.service';
import { formatDates, generateMessageQueueStatusId } from '../../../../shared/helpers/utils';
import { MessageQueueService } from '../../services/message-queue.service';
import { ScopedLoader } from '../../services/scoped-loader';
import {
  CompanyOption,
  CreateTasksPayload,
  GenerateTasksDialogData,
  SalesPerson,
  ScheduleShop,
  ScheduledTaskDay,
} from '../../models/sales-person-planning.models';
import { SetDetailsDialogComponent, SetDetailsDialogData } from '../set-details-dialog/set-details-dialog.component';

/** A visit day column: the first date of each weekday in the selected range. Sundays are never visit days. */
export interface VisitDay {
  key: string; // 'yyyy-MM-dd' of `date`
  date: Date;
  deliveryDate: Date; // the next day
  /** Every date of the range on this weekday: a set picked for this day is visited on all of them. */
  dates: Date[];
}

export interface CompanyCount {
  id: string;
  name: string;
  color: string;
  count: number; // shops of the set this company delivers to the next day
}

export interface SetDayCell {
  companies: CompanyCount[]; // most shops first
  coveredShops: number; // different shops with at least one next-day delivery
  deliveries: number; // company deliveries (a shop with two companies counts twice)
}

export interface ShopSet {
  index: number; // 0-based; shown as "Set {index + 1}"
  shops: ScheduleShop[];
  /** Average number of the selected companies the set's shops stock. */
  companiesPerShop: number;
  cells: { [dayKey: string]: SetDayCell };
  bestDayKeys: string[];
}

export interface SalesPersonPlan {
  salesPerson: SalesPerson;
  /** Shops matching the filters, most companies first. */
  shops: ScheduleShop[];
  numberOfSets: number;
  retailersPerSet: number;
  sets: ShopSet[];
  /** `${numberOfSets}x${retailersPerSet}` the sets were built for (they are rebuilt when it changes). */
  builtFor: string;
  /** Set index -> visit day key. A day holds at most one set. */
  picks: { [setIndex: number]: string };
}

export interface ScheduleRow {
  day: VisitDay;
  set?: ShopSet;
  cell?: SetDayCell;
}

const DEFAULT_RETAILERS_PER_SET = 35;

/**
 * "Generate Tasks" dialog of the Tasks tab (replaces production's "View Tasks Preview" table).
 * 1. Sets: number of sets and retailers per set for every selected sales person. When the sets can't hold every
 *    shop, the shops that stock the most of the selected companies are kept.
 * 2. Pick days: one visit day per set, judged by next-day company deliveries (manual, or "Auto-pick days").
 * 3. Schedule: summary, then "Assign schedule" queues a CreateTasks message with the shops of every visit date.
 */
@Component({
  selector: 'generate-tasks-dialog',
  templateUrl: './generate-tasks-dialog.component.html',
  styleUrls: ['./generate-tasks-dialog.component.scss'],
})
export class GenerateTasksDialogComponent implements OnDestroy {
  readonly steps = ['Sets', 'Pick days', 'Schedule'];
  step = 0;
  visitDays: VisitDay[];
  plans: SalesPersonPlan[];
  activePlanIndex = 0;
  totals = { salesPersons: 0, sets: 0, shopsPerWeek: 0, nextDayShops: 0, visitDates: 0, tasks: 0, leftOut: 0 };
  private companies = new Map<string, CompanyOption>();
  private loader: ScopedLoader;

  constructor(
    public dialogRef: MatDialogRef<GenerateTasksDialogComponent>,
    private dialog: MatDialog,
    private egretLoader: AppLoaderService,
    private messageQueueService: MessageQueueService,
    @Inject(LOCALE_ID) private locale: string,
    @Inject(MAT_DIALOG_DATA) public data: GenerateTasksDialogData
  ) {
    this.loader = new ScopedLoader(this.egretLoader);
    (data.companies || []).forEach((company) => this.companies.set(company.id, company));
    this.visitDays = this.getVisitDays(data.dates || []);
    this.plans = (data.salesPersons || []).map((salesPerson) => {
      const shops = (data.shops || []).filter((shop) => shop.salesperson_id === salesPerson.id);
      return {
        salesPerson,
        shops: this.byCompanyCount(shops),
        numberOfSets: Math.max(1, this.visitDays.length),
        retailersPerSet: Number(salesPerson.tasksCount) || DEFAULT_RETAILERS_PER_SET,
        sets: [],
        builtFor: '',
        picks: {},
      };
    });
  }

  ngOnDestroy(): void {
    this.loader.close();
  }

  // ------------------------------------------------------------------------------------------- navigation
  get plansWithShops(): SalesPersonPlan[] {
    return this.plans.filter((plan) => plan.shops.length > 0);
  }

  get activePlan(): SalesPersonPlan | undefined {
    return this.plansWithShops[this.activePlanIndex];
  }

  get canGoNext(): boolean {
    if (this.step === 0) {
      return this.visitDays.length > 0 && this.plansWithShops.length > 0 && this.plansWithShops.every((plan) => this.isPlanValid(plan));
    }
    if (this.step === 1) {
      return this.plansWithShops.every((plan) => this.isPlanComplete(plan));
    }
    return false;
  }

  /** Why "Next" is disabled. */
  get nextHint(): string {
    if (this.step === 0) {
      if (!this.visitDays.length) {
        return 'The selected dates have no visit days';
      }
      if (!this.plansWithShops.length) {
        return 'No shops match the filters';
      }
      return this.canGoNext ? '' : 'Check the number of sets and retailers per set';
    }
    if (this.step === 1 && !this.canGoNext) {
      const plans = this.plansWithShops;
      if (plans.length === 1) {
        return `Pick a day for every set (${this.pickedCount(plans[0])} of ${plans[0].sets.length} picked)`;
      }
      const done = plans.filter((plan) => this.isPlanComplete(plan)).length;
      return `Pick a day for every set (${done} of ${plans.length} sales persons done)`;
    }
    return '';
  }

  next() {
    if (!this.canGoNext) {
      return;
    }
    if (this.step === 0) {
      this.plansWithShops.forEach((plan) => this.buildSets(plan));
      this.activePlanIndex = Math.min(this.activePlanIndex, this.plansWithShops.length - 1);
    } else if (this.step === 1) {
      this.totals = this.computeTotals();
    }
    this.step++;
  }

  back() {
    if (this.step > 0) {
      this.step--;
    }
  }

  /** Step labels go back to a completed step. */
  goTo(step: number) {
    if (step < this.step) {
      this.step = step;
    }
  }

  // ------------------------------------------------------------------------------------------- step 1: sets
  isPlanValid(plan: SalesPersonPlan): boolean {
    const sets = Number(plan.numberOfSets);
    const perSet = Number(plan.retailersPerSet);
    return Number.isInteger(sets) && sets >= 1 && sets <= this.visitDays.length && Number.isInteger(perSet) && perSet >= 1;
  }

  slots(plan: SalesPersonPlan): number {
    return plan.numberOfSets * plan.retailersPerSet;
  }

  leftOut(plan: SalesPersonPlan): number {
    return Math.max(0, plan.shops.length - this.slots(plan));
  }

  suggestedPerSet(plan: SalesPersonPlan): number {
    return Math.ceil(plan.shops.length / plan.numberOfSets);
  }

  useSuggested(event: Event, plan: SalesPersonPlan) {
    event.preventDefault();
    plan.retailersPerSet = this.suggestedPerSet(plan);
  }

  companiesPerShop(shops: ScheduleShop[]): number {
    return shops.length ? shops.reduce((total, shop) => total + this.companyCount(shop), 0) / shops.length : 0;
  }

  // ------------------------------------------------------------------------------------------- step 2: pick days
  isBest(set: ShopSet, day: VisitDay): boolean {
    return set.bestDayKeys.includes(day.key);
  }

  isPicked(plan: SalesPersonPlan, set: ShopSet, day: VisitDay): boolean {
    return plan.picks[set.index] === day.key;
  }

  /** The other set that already holds this day, if any. */
  takenBy(plan: SalesPersonPlan, set: ShopSet, day: VisitDay): ShopSet | undefined {
    return plan.sets.find((other) => other !== set && plan.picks[other.index] === day.key);
  }

  /** Picks the day for the set (the set that held the day loses it); picking the picked day again clears it. */
  pick(plan: SalesPersonPlan, set: ShopSet, day: VisitDay) {
    if (plan.picks[set.index] === day.key) {
      delete plan.picks[set.index];
      return;
    }
    const holder = this.takenBy(plan, set, day);
    if (holder) {
      delete plan.picks[holder.index];
    }
    plan.picks[set.index] = day.key;
  }

  pickedCount(plan: SalesPersonPlan): number {
    return Object.keys(plan.picks).length;
  }

  isPlanComplete(plan: SalesPersonPlan): boolean {
    return plan.sets.length > 0 && this.pickedCount(plan) === plan.sets.length;
  }

  clearPicks(plan: SalesPersonPlan) {
    plan.picks = {};
  }

  /** Gives every set its own day so that the most different shops get a next-day delivery (ties: most deliveries). */
  autoPick(plan: SalesPersonPlan) {
    const days = this.visitDays;
    const sets = plan.sets;
    const memo = new Map<string, { shops: number; deliveries: number; choice: number[] }>();
    const solve = (i: number, used: number): { shops: number; deliveries: number; choice: number[] } => {
      if (i === sets.length) {
        return { shops: 0, deliveries: 0, choice: [] };
      }
      const key = `${i}|${used}`;
      const cached = memo.get(key);
      if (cached) {
        return cached;
      }
      let best = { shops: -1, deliveries: -1, choice: [] as number[] };
      days.forEach((day, d) => {
        if (used & (1 << d)) {
          return;
        }
        const cell = sets[i].cells[day.key];
        const rest = solve(i + 1, used | (1 << d));
        const shops = cell.coveredShops + rest.shops;
        const deliveries = cell.deliveries + rest.deliveries;
        if (shops > best.shops || (shops === best.shops && deliveries > best.deliveries)) {
          best = { shops, deliveries, choice: [d, ...rest.choice] };
        }
      });
      memo.set(key, best);
      return best;
    };
    const { choice } = solve(0, 0);
    plan.picks = {};
    sets.forEach((set, i) => {
      if (choice[i] !== undefined) {
        plan.picks[set.index] = days[choice[i]].key;
      }
    });
  }

  autoPickAll() {
    this.plansWithShops.forEach((plan) => this.autoPick(plan));
  }

  /** "Next-day coverage" line of the picked sets, or '' before anything is picked. */
  coverageText(plan: SalesPersonPlan): string {
    const picked = plan.sets.filter((set) => plan.picks[set.index]);
    if (!picked.length) {
      return '';
    }
    const covered = picked.reduce((total, set) => total + set.cells[plan.picks[set.index]].coveredShops, 0);
    const shops = picked.reduce((total, set) => total + set.shops.length, 0);
    const percent = shops ? Math.round((covered * 100) / shops) : 0;
    return `${covered} of ${shops} shops get a next-day delivery (${percent}%) · ${picked.length} of ${plan.sets.length} sets picked`;
  }

  get gridColumns(): string {
    return `112px repeat(${this.visitDays.length}, minmax(168px, 1fr))`;
  }

  openCompanies(event: Event, set: ShopSet, day: VisitDay) {
    event.stopPropagation();
    const cell = set.cells[day.key];
    this.openDetails({
      title: `Set ${set.index + 1} · ${this.dayName(day.date)}`,
      subtitle: `Delivery ${this.dayName(day.deliveryDate)} · ${cell.coveredShops} of ${set.shops.length} shops`,
      items: cell.companies.map((company) => ({ label: company.name, value: company.count, color: company.color })),
    });
  }

  openShops(event: Event, plan: SalesPersonPlan, set: ShopSet) {
    event.preventDefault();
    event.stopPropagation();
    this.openDetails({
      title: `Set ${set.index + 1} · ${set.shops.length} shops`,
      subtitle: `${plan.salesPerson.name} · ${set.companiesPerShop.toFixed(1)} companies per shop`,
      items: this.byCompanyCount(set.shops).map((shop) => {
        const count = this.companyCount(shop);
        return {
          label: shop.business_name,
          detail: this.companyNames(shop).join(', '),
          value: `${count} ${count === 1 ? 'company' : 'companies'}`,
        };
      }),
    });
  }

  private openDetails(data: SetDetailsDialogData) {
    this.dialog.open(SetDetailsDialogComponent, { width: '380px', maxWidth: '92vw', autoFocus: false, data });
  }

  // ------------------------------------------------------------------------------------------- step 3: schedule
  scheduleRows(plan: SalesPersonPlan): ScheduleRow[] {
    return this.visitDays.map((day) => {
      const set = plan.sets.find((s) => plan.picks[s.index] === day.key);
      return { day, set, cell: set?.cells[day.key] };
    });
  }

  /** "Also 29 Oct, 5 Nov" for a day that repeats in the selected range. */
  repeatText(day: VisitDay): string {
    const more = day.dates.slice(1);
    const shown = more.slice(0, 2).map((date) => formatDate(date, 'd MMM', this.locale));
    return `Also ${shown.join(', ')}${more.length > 2 ? ` +${more.length - 2}` : ''}`;
  }

  async assignSchedule() {
    const payload = this.buildPayload();
    this.loader.open();
    try {
      await this.messageQueueService.postMessageToQueue({ messageType: 'CreateTasks', input: JSON.stringify(payload) });
      this.loader.close();
      Swal.fire({ title: 'Success!', text: 'Tasks are being generated. Please wait for 5 minutes.', icon: 'success' });
      this.dialogRef.close({ assigned: true });
    } catch (error) {
      console.log('assignSchedule Error ::: ', error);
      Swal.fire({ title: '', text: 'Something went wrong!', icon: 'error' });
    } finally {
      this.loader.close();
    }
  }

  buildPayload(): CreateTasksPayload {
    const schedule: ScheduledTaskDay[] = [];
    this.plansWithShops.forEach((plan) => {
      plan.sets.forEach((set) => {
        const day = this.visitDays.find((d) => d.key === plan.picks[set.index]);
        (day?.dates || []).forEach((date) => {
          schedule.push({
            salesPersonId: plan.salesPerson.id,
            taskDate: this.ymd(date),
            setNumber: set.index + 1,
            customerIds: set.shops.map((shop) => shop.customer_id),
          });
        });
      });
    });
    schedule.sort((a, b) => a.taskDate.localeCompare(b.taskDate) || a.salesPersonId.localeCompare(b.salesPersonId));
    return {
      messageQueueStatusId: generateMessageQueueStatusId(),
      salesPersons: this.plansWithShops.map((plan) => ({
        id: plan.salesPerson.id,
        name: plan.salesPerson.name,
        areaId: plan.salesPerson.areaId,
        areaName: plan.salesPerson.areaName,
        taskCountPerDay: plan.retailersPerSet,
        numberOfSets: plan.sets.length,
      })),
      taskDates: [...new Set(schedule.map((day) => day.taskDate))],
      filters: this.data.filters,
      schedule,
    };
  }

  private computeTotals() {
    const plans = this.plansWithShops;
    const payload = this.buildPayload();
    return {
      salesPersons: plans.length,
      sets: plans.reduce((total, plan) => total + plan.sets.length, 0),
      shopsPerWeek: plans.reduce((total, plan) => total + plan.sets.reduce((sum, set) => sum + set.shops.length, 0), 0),
      nextDayShops: plans.reduce(
        (total, plan) => total + plan.sets.reduce((sum, set) => sum + (set.cells[plan.picks[set.index]]?.coveredShops || 0), 0),
        0
      ),
      visitDates: payload.taskDates.length,
      tasks: payload.schedule.reduce((total, day) => total + day.customerIds.length, 0),
      leftOut: plans.reduce((total, plan) => total + this.leftOut(plan), 0),
    };
  }

  // ------------------------------------------------------------------------------------------- sets
  /**
   * Splits the plan's shops into sets: the `numberOfSets x retailersPerSet` shops stocking the most selected companies
   * are kept, put in route order (a sweep around their centre, so a set is one neighbourhood) and cut into evenly
   * sized sets. Picks are cleared when the sets change.
   */
  private buildSets(plan: SalesPersonPlan) {
    const builtFor = `${plan.numberOfSets}x${plan.retailersPerSet}`;
    if (plan.builtFor === builtFor) {
      return;
    }
    const total = Math.min(plan.shops.length, plan.numberOfSets * plan.retailersPerSet);
    const route = this.routeOrder(plan.shops.slice(0, total));
    const sets: ShopSet[] = [];
    let cursor = 0;
    for (let i = 0; i < plan.numberOfSets; i++) {
      const size = Math.floor(total / plan.numberOfSets) + (i < total % plan.numberOfSets ? 1 : 0);
      const shops = route.slice(cursor, cursor + size);
      cursor += size;
      if (shops.length) {
        sets.push(this.buildSet(sets.length, shops));
      }
    }
    plan.sets = sets;
    plan.picks = {};
    plan.builtFor = builtFor;
  }

  private buildSet(index: number, shops: ScheduleShop[]): ShopSet {
    const cells: { [dayKey: string]: SetDayCell } = {};
    this.visitDays.forEach((day) => {
      const deliveryWeekday = day.deliveryDate.getDay();
      const counts = new Map<string, number>();
      let coveredShops = 0;
      let deliveries = 0;
      shops.forEach((shop) => {
        const delivering = this.selectedCompanies(shop).filter((stocked) => (stocked.delivery_days || []).includes(deliveryWeekday));
        delivering.forEach((stocked) => counts.set(stocked.company_id, (counts.get(stocked.company_id) || 0) + 1));
        deliveries += delivering.length;
        if (delivering.length) {
          coveredShops++;
        }
      });
      const companies = [...counts.entries()]
        .map(([id, count]) => {
          const company = this.companies.get(id);
          return { id, name: company?.name || id, color: company?.color || '#9e9e9e', count };
        })
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
      cells[day.key] = { companies, coveredShops, deliveries };
    });
    const best = Math.max(0, ...Object.values(cells).map((cell) => cell.coveredShops));
    return {
      index,
      shops,
      companiesPerShop: this.companiesPerShop(shops),
      cells,
      bestDayKeys: best > 0 ? this.visitDays.filter((day) => cells[day.key].coveredShops === best).map((day) => day.key) : [],
    };
  }

  /** Shops in a sweep around their centre point, so consecutive shops are neighbours. */
  private routeOrder(shops: ScheduleShop[]): ScheduleShop[] {
    if (shops.length < 2) {
      return [...shops];
    }
    const latitude = shops.reduce((total, shop) => total + Number(shop.latitude), 0) / shops.length;
    const longitude = shops.reduce((total, shop) => total + Number(shop.longitude), 0) / shops.length;
    const angle = (shop: ScheduleShop) => Math.atan2(Number(shop.latitude) - latitude, Number(shop.longitude) - longitude);
    return [...shops].sort((a, b) => angle(a) - angle(b) || a.customer_id.localeCompare(b.customer_id));
  }

  /** Most selected companies first (stable for equal counts). */
  private byCompanyCount(shops: ScheduleShop[]): ScheduleShop[] {
    return [...shops].sort((a, b) => this.companyCount(b) - this.companyCount(a) || a.customer_id.localeCompare(b.customer_id));
  }

  /** The companies the shop stocks that are among the selected ones. */
  private selectedCompanies(shop: ScheduleShop) {
    return (shop.companies || []).filter((stocked) => this.companies.has(stocked.company_id));
  }

  private companyCount(shop: ScheduleShop): number {
    return this.selectedCompanies(shop).length;
  }

  private companyNames(shop: ScheduleShop): string[] {
    return this.selectedCompanies(shop).map((stocked) => this.companies.get(stocked.company_id)?.name || stocked.company_id);
  }

  // ------------------------------------------------------------------------------------------- dates
  /** First date of each weekday in the range, in date order; Sundays are skipped. */
  private getVisitDays(dates: Date[]): VisitDay[] {
    const days: VisitDay[] = [];
    dates
      .filter((date) => date.getDay() !== 0)
      .forEach((date) => {
        const existing = days.find((day) => day.date.getDay() === date.getDay());
        if (existing) {
          existing.dates.push(date);
        } else {
          const deliveryDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
          days.push({ key: this.ymd(date), date, deliveryDate, dates: [date] });
        }
      });
    return days;
  }

  initials(name: string): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }

  dayName(date: Date): string {
    return formatDate(date, 'd EEEE', this.locale);
  }

  private ymd(date: Date): string {
    return formatDates([date])[0];
  }
}
