/**
 * Models for the Sales Person (MTD) Performance report (chunk 41).
 * Reconstructed from SalesPersonService.getSalesPersonsReport() + its mappers (main module 2937).
 */

/** Request body POSTed to `${cloudFunctionsUrl}/getSalesPersonReport`. */
export interface SalesPersonReportRequest {
  taskDate: string; // 'yyyy-MM-dd'
  salesPersonIds: string[]; // [] = all sales persons
}

/** Common fields of both `daily` and `monthly` rows of the cloud-function response. */
interface SalesPersonReportBase {
  salesPersonId: string;
  salesPersonName: string;
  /** Added client-side by SalesPersonService.mapSalesLeadName() from the `SalesPerson` collection (salesLead.name). */
  teamLeadName?: string;
  /** Added client-side by SalesPersonService.mapSalesLeadName() from the `SalesPerson` collection (cluster.name). */
  areaName?: string;
}

/** `response.monthly[]` row (fields consumed by the client). */
export interface MonthlySalesPersonReport extends SalesPersonReportBase {
  monthProductivityTarget: number;
  monthProductivityCount: number;
  productivityPercent: number;
  monthOverallRevenueTarget: number;
  monthOverallRevenue: number;
  overallRevenuePercent: number;
  monthFMCGRevenueTarget: number;
  monthFMCGRevenue: number;
  fmcgRevenuePercent: number;
  todayTarget: number;
  monthProductivityIncentive: number;
  monthOverallRevenueIncentive: number;
  monthFMCGRevenueIncentive: number;
  monthDailyFMCGLineItemsIncentive: number;
  monthDailyProductivityIncentive: number;
  monthSalesPersonAssigned: number;
  monthSelfOrderAssigned: number;
  monthSalesPersonUnAssigned: number;
  monthSelfOrderUnAssigned: number;
  monthSalesPersonAssignedRevenue: number;
  monthSelfOrderAssignedRevenue: number;
  monthSalesPersonUnAssignedRevenue: number;
  monthSelfOrderUnAssignedRevenue: number;
}

/** `response.daily[]` row (fields consumed by the client). */
export interface DailySalesPersonReport extends SalesPersonReportBase {
  tasksCount: number;
  achievedTasksCount: number;
  tasksPercent: number;
  productivityCount: number;
  productivityRevenue: number;
  avgOrderValue: number;
  fmcgOrders: number;
  productivityIncentive: number;
  fmcgLineItemsIncentive: number;
  salesPersonAssigned: number;
  selfOrderAssigned: number;
  salesPersonUnAssigned: number;
  selfOrderUnAssigned: number;
  salesPersonAssignedRevenue: number;
  selfOrderAssignedRevenue: number;
  salesPersonUnAssignedRevenue: number;
  selfOrderUnAssignedRevenue: number;
}

/** Raw HTTP response of the cloud function. */
export interface SalesPersonReportResponse {
  response?: {
    daily: DailySalesPersonReport[];
    monthly: MonthlySalesPersonReport[];
  };
}

/**
 * Value returned by SalesPersonService.getSalesPersonsReport(): five tables whose rows are objects
 * keyed by display header strings (see SalesPersonService.mapXxx). Every row also carries a
 * "SalesPerson Id" key that is NOT in the on-screen column lists but IS exported to Excel.
 * Key order (= Excel sheet order): mtdRevenueReport, dailyPerformanceIncentiveReport,
 * dailyCustomersReport, monthlyCustomerReport, monthlyIncentiveReport.
 * `{}` is returned when the response has no `response` property.
 */
export interface SalesPersonReportData {
  mtdRevenueReport: Record<string, any>[];
  dailyPerformanceIncentiveReport: Record<string, any>[];
  dailyCustomersReport: Record<string, any>[];
  monthlyCustomerReport: Record<string, any>[];
  monthlyIncentiveReport: Record<string, any>[];
}

export type SalesPersonReportKey = keyof SalesPersonReportData;
