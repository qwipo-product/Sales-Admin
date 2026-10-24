// Models of the "Reschedule Tasks" page (not part of the original app).
import { SalesPerson } from '../../sales-person-planning/models/sales-person-planning.models';

export { PagePermission, SalesPerson } from '../../sales-person-planning/models/sales-person-planning.models';

/** Item of `${coreUrl}/customer/company_share_by_salesperson` response `.data`. */
export interface CompanyShopShare {
  company_id: string;
  company_name: string;
  shop_count: number;
  total_shops: number;
  shop_percentage: number; // 0..100, share of the sales person's shops that stock the company
}

/** A company as shown in the Reschedule dialog (dot colour from the API order). */
export interface CompanyOption {
  id: string;
  name: string;
  color: string;
  shopPercentage: number;
}

/** Item of `${coreUrl}/customer/shops_for_schedule` response `.data`: a shop of the sales person. */
export interface ScheduleShop {
  customer_id: string;
  business_name: string;
  area_name: string;
  salesperson_id: string;
  latitude: number;
  longitude: number;
  /** Companies the shop stocks and the weekdays (0 = Sunday ... 6 = Saturday) each one delivers to it. */
  companies: { company_id: string; delivery_days: number[] }[];
}

/** One existing day of tasks: the set of shops the sales person visits on `taskDate`, in stop order. */
export interface ExistingTaskSet {
  taskDate: string; // 'yyyy-MM-dd'
  shops: ScheduleShop[];
}

/** Data handed to the Reschedule dialog by the Reschedule Tasks page. */
export interface RescheduleDialogData {
  salesPerson: SalesPerson;
  /** Every day of the selected From - To range. */
  dates: Date[];
  /** Every company (with its dot colour). */
  companies: CompanyOption[];
  /** The sales person's existing tasks in the range, one set per task date (earliest first). */
  sets: ExistingTaskSet[];
}

/** One day of the new schedule: the shops of one set on one date. */
export interface ScheduledTaskDay {
  taskDate: string; // 'yyyy-MM-dd'
  setNumber: number; // 1-based
  /** The date the set's tasks were on before. */
  previousTaskDate: string;
  customerIds: string[]; // stop order
}

/**
 * `input` of the RescheduleTasks message sent by "Assign schedule": the sales person's tasks from `fromDate` to `toDate`
 * are replaced by `schedule`.
 */
export interface RescheduleTasksPayload {
  messageQueueStatusId: string; // "MESQU" + 10 random chars
  salesPersonId: string;
  salesPersonName: string;
  areaId: string;
  areaName: string;
  fromDate: string; // 'yyyy-MM-dd'
  toDate: string; // 'yyyy-MM-dd'
  schedule: ScheduledTaskDay[];
}
