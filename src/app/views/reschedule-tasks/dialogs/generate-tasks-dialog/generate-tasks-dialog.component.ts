import { Component, Inject, LOCALE_ID, OnDestroy } from '@angular/core';
import { formatDate } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';

import { AppLoaderService } from '../../../../shared/services/app-loader/app-loader.service';
import { formatDates, generateMessageQueueStatusId } from '../../../../shared/helpers/utils';
import { MessageQueueService } from '../../../sales-person-planning/services/message-queue.service';
import { ScopedLoader } from '../../../sales-person-planning/services/scoped-loader';
import {
  CompanyOption,
  RescheduleDialogData,
  RescheduleTasksPayload,
  ScheduleShop,
  ScheduledTaskDay,
} from '../../models/reschedule-tasks.models';
import { SetDetailsDialogComponent, SetDetailsDialogData } from '../set-details-dialog/set-details-dialog.component';

/** A visit day column: one date of the selected range. Sundays are never visit days. */
export interface VisitDay {
  key: string; // 'yyyy-MM-dd' of `date`
  date: Date;
  deliveryDate: Date; // the next day
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

/** One existing day of tasks, which can be moved to another visit day. */
export interface ShopSet {
  index: number; // 0-based; shown as "Set {index + 1}"
  /** The date the set's tasks are on now ('yyyy-MM-dd'). */
  currentKey: string;
  currentDate: Date;
  shops: ScheduleShop[]; // stop order
  cells: { [dayKey: string]: SetDayCell };
  bestDayKeys: string[];
}

export interface ScheduleRow {
  day: VisitDay;
  set?: ShopSet;
  cell?: SetDayCell;
}

/**
 * "Reschedule Tasks" dialog, opened by the Reschedule Tasks page for one sales person and a date range. Each existing
 * day of tasks in the range is a set; the sets start on their current dates.
 * 1. Pick days: one visit day per set, judged by next-day company deliveries (manual, or "Auto-pick days").
 * 2. Schedule: the day-by-day preview, then "Assign schedule" queues a RescheduleTasks message that replaces the sales
 *    person's tasks in the range.
 */
@Component({
  selector: 'generate-tasks-dialog',
  templateUrl: './generate-tasks-dialog.component.html',
  styleUrls: ['./generate-tasks-dialog.component.scss'],
})
export class GenerateTasksDialogComponent implements OnDestroy {
  readonly steps = ['Pick days', 'Schedule'];
  step = 0;
  visitDays: VisitDay[];
  sets: ShopSet[];
  /** Set index -> visit day key. A day holds at most one set. */
  picks: { [setIndex: number]: string } = {};
  private companies = new Map<string, CompanyOption>();
  private loader: ScopedLoader;

  constructor(
    public dialogRef: MatDialogRef<GenerateTasksDialogComponent>,
    private dialog: MatDialog,
    private egretLoader: AppLoaderService,
    private messageQueueService: MessageQueueService,
    @Inject(LOCALE_ID) private locale: string,
    @Inject(MAT_DIALOG_DATA) public data: RescheduleDialogData
  ) {
    this.loader = new ScopedLoader(this.egretLoader);
    (data.companies || []).forEach((company) => this.companies.set(company.id, company));
    this.visitDays = (data.dates || [])
      .filter((date) => date.getDay() !== 0)
      .map((date) => ({ key: this.ymd(date), date, deliveryDate: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1) }));
    this.sets = (data.sets || []).map((existing, index) => this.buildSet(index, existing.taskDate, existing.shops));
    this.resetPicks();
  }

  ngOnDestroy(): void {
    this.loader.close();
  }

  // ------------------------------------------------------------------------------------------- navigation
  /** More sets than visit days (tasks on Sundays can cause it): some sets could not get a day. */
  get tooManySets(): boolean {
    return this.sets.length > this.visitDays.length;
  }

  get canGoNext(): boolean {
    return this.step === 0 && this.isComplete;
  }

  /** Why "Next" is disabled. */
  get nextHint(): string {
    if (this.step !== 0 || this.isComplete) {
      return '';
    }
    if (this.tooManySets) {
      return `${this.sets.length} sets but only ${this.visitDays.length} visit days`;
    }
    return `Pick a day for every set (${this.pickedCount} of ${this.sets.length} picked)`;
  }

  next() {
    if (this.canGoNext) {
      this.step++;
    }
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

  // ------------------------------------------------------------------------------------------- step 1: pick days
  isBest(set: ShopSet, day: VisitDay): boolean {
    return set.bestDayKeys.includes(day.key);
  }

  isPicked(set: ShopSet, day: VisitDay): boolean {
    return this.picks[set.index] === day.key;
  }

  isCurrent(set: ShopSet, day: VisitDay): boolean {
    return set.currentKey === day.key;
  }

  /** The other set that already holds this day, if any. */
  takenBy(set: ShopSet, day: VisitDay): ShopSet | undefined {
    return this.sets.find((other) => other !== set && this.picks[other.index] === day.key);
  }

  /** Picks the day for the set (the set that held the day loses it); picking the picked day again clears it. */
  pick(set: ShopSet, day: VisitDay) {
    if (this.picks[set.index] === day.key) {
      delete this.picks[set.index];
      return;
    }
    const holder = this.takenBy(set, day);
    if (holder) {
      delete this.picks[holder.index];
    }
    this.picks[set.index] = day.key;
  }

  get pickedCount(): number {
    return Object.keys(this.picks).length;
  }

  get isComplete(): boolean {
    return this.sets.length > 0 && this.pickedCount === this.sets.length;
  }

  /** Every set back on its current date (sets now on a Sunday or outside the visit days stay unpicked). */
  resetPicks() {
    this.picks = {};
    this.sets.forEach((set) => {
      if (this.visitDays.some((day) => day.key === set.currentKey)) {
        this.picks[set.index] = set.currentKey;
      }
    });
  }

  clearPicks() {
    this.picks = {};
  }

  /**
   * Gives every set its own day so that the most different shops get a next-day delivery (ties: most deliveries, then
   * keeping a set on its current date). Optimal assignment (Hungarian method), so it scales to long date ranges.
   */
  autoPick() {
    const days = this.visitDays;
    if (!this.sets.length || this.tooManySets) {
      return;
    }
    const weight = (set: ShopSet, day: VisitDay) => {
      const cell = set.cells[day.key];
      return cell.coveredShops * 1_000_000 + cell.deliveries * 10 + (set.currentKey === day.key ? 1 : 0);
    };
    const maxWeight = Math.max(...this.sets.flatMap((set) => days.map((day) => weight(set, day))));
    const cost = this.sets.map((set) => days.map((day) => maxWeight - weight(set, day)));
    const assignment = hungarian(cost);
    this.picks = {};
    this.sets.forEach((set, i) => {
      if (assignment[i] >= 0) {
        this.picks[set.index] = days[assignment[i]].key;
      }
    });
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

  /** The set's retailers with the companies each one stocks ("N shops" in step 1, "Set N" in step 2). */
  openShops(event: Event, set: ShopSet, day?: VisitDay) {
    event.preventDefault();
    event.stopPropagation();
    this.openDetails({
      title: day ? `Set ${set.index + 1} · ${this.dayName(day.date)}` : `Set ${set.index + 1}`,
      subtitle: `${this.data.salesPerson.name} · ${set.shops.length} shops`,
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

  // ------------------------------------------------------------------------------------------- step 2: schedule
  get scheduleRows(): ScheduleRow[] {
    return this.visitDays.map((day) => {
      const set = this.sets.find((s) => this.picks[s.index] === day.key);
      return { day, set, cell: set?.cells[day.key] };
    });
  }

  async assignSchedule() {
    const payload = this.buildPayload();
    this.loader.open();
    try {
      await this.messageQueueService.postMessageToQueue({ messageType: 'RescheduleTasks', input: JSON.stringify(payload) });
      this.loader.close();
      Swal.fire({ title: 'Success!', text: 'Tasks are being rescheduled. Please wait for 5 minutes.', icon: 'success' });
      this.dialogRef.close({ assigned: true });
    } catch (error) {
      console.log('assignSchedule Error ::: ', error);
      Swal.fire({ title: '', text: 'Something went wrong!', icon: 'error' });
    } finally {
      this.loader.close();
    }
  }

  buildPayload(): RescheduleTasksPayload {
    const salesPerson = this.data.salesPerson;
    const schedule: ScheduledTaskDay[] = this.sets
      .filter((set) => this.picks[set.index])
      .map((set) => ({
        taskDate: this.picks[set.index],
        setNumber: set.index + 1,
        previousTaskDate: set.currentKey,
        customerIds: set.shops.map((shop) => shop.customer_id),
      }))
      .sort((a, b) => a.taskDate.localeCompare(b.taskDate));
    const dates = this.data.dates || [];
    return {
      messageQueueStatusId: generateMessageQueueStatusId(),
      salesPersonId: salesPerson.id,
      salesPersonName: salesPerson.name,
      areaId: salesPerson.areaId,
      areaName: salesPerson.areaName,
      fromDate: this.ymd(dates[0]),
      toDate: this.ymd(dates[dates.length - 1]),
      schedule,
    };
  }

  // ------------------------------------------------------------------------------------------- sets
  private buildSet(index: number, currentKey: string, shops: ScheduleShop[]): ShopSet {
    const cells: { [dayKey: string]: SetDayCell } = {};
    this.visitDays.forEach((day) => {
      const deliveryWeekday = day.deliveryDate.getDay();
      const counts = new Map<string, number>();
      let coveredShops = 0;
      let deliveries = 0;
      shops.forEach((shop) => {
        const delivering = this.knownCompanies(shop).filter((stocked) => (stocked.delivery_days || []).includes(deliveryWeekday));
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
    const [year, month, date] = currentKey.split('-').map(Number);
    return {
      index,
      currentKey,
      currentDate: new Date(year, month - 1, date),
      shops,
      cells,
      bestDayKeys: best > 0 ? this.visitDays.filter((day) => cells[day.key].coveredShops === best).map((day) => day.key) : [],
    };
  }

  /** Most companies first (stable for equal counts). */
  private byCompanyCount(shops: ScheduleShop[]): ScheduleShop[] {
    return [...shops].sort((a, b) => this.companyCount(b) - this.companyCount(a) || a.customer_id.localeCompare(b.customer_id));
  }

  /** The companies the shop stocks that the API listed. */
  private knownCompanies(shop: ScheduleShop) {
    return (shop.companies || []).filter((stocked) => this.companies.has(stocked.company_id));
  }

  private companyCount(shop: ScheduleShop): number {
    return this.knownCompanies(shop).length;
  }

  private companyNames(shop: ScheduleShop): string[] {
    return this.knownCompanies(shop).map((stocked) => this.companies.get(stocked.company_id)?.name || stocked.company_id);
  }

  // ------------------------------------------------------------------------------------------- dates
  dayName(date: Date): string {
    return formatDate(date, 'd EEE', this.locale);
  }

  private ymd(date: Date): string {
    return formatDates([date])[0];
  }
}

/**
 * Minimum-cost assignment of each row to its own column (rows <= columns), Hungarian method in O(rows² · columns).
 * Returns, per row, the chosen column index.
 */
function hungarian(cost: number[][]): number[] {
  const n = cost.length;
  const m = n ? cost[0].length : 0;
  const u = new Array(n + 1).fill(0);
  const v = new Array(m + 1).fill(0);
  const p = new Array(m + 1).fill(0); // p[j]: row (1-based) assigned to column j
  const way = new Array(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(m + 1).fill(Infinity);
    const used = new Array(m + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = 0;
      for (let j = 1; j <= m; j++) {
        if (!used[j]) {
          const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minv[j]) {
            minv[j] = cur;
            way[j] = j0;
          }
          if (minv[j] < delta) {
            delta = minv[j];
            j1 = j;
          }
        }
      }
      for (let j = 0; j <= m; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0);
  }
  const result = new Array(n).fill(-1);
  for (let j = 1; j <= m; j++) {
    if (p[j]) {
      result[p[j] - 1] = j - 1;
    }
  }
  return result;
}
