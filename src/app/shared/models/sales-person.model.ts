// Shapes produced/consumed by SalesPersonService (main.js module 2937). Field names are exact (from mappers).

export interface Cluster {
  id: string;
  name: string;
  type: number; // ClusterType
  searchKey: string;
  customerCount: number;
  coordinates: any;
  createdDate: any;
  updatedDate: any;
  customers: any;
}

/** Output of SalesPersonService.mapToSalesPerson() (raw doc = Firestore `SalesPerson/{id}`). */
export interface SalesPersonRow {
  name: string;
  mobileNumber: string;
  id: string;
  businessName: string;
  isActive: boolean;
  areaName: string; // cluster.name
  areaId: string; // cluster.id
  area: any; // cluster object
  customerCount: number;
  salesLeadId: string;
  salesLeadName: string; // salesLead.name
  salesLeadMobileNumber: string; // salesLead.mobileNumber
  salesManagerId: string;
  salesManagerName: string; // salesManager.name
  salesManagerMobileNumber: string; // salesManager.mobileNumber
  enableLogOut: boolean;
}

export interface MappedSalesPersonFromCluster {
  salesPersonName: string; // businessName
  salesPersonId: string;
  clusterName: string;
  clusterId: string;
}

export interface WorkingDaysMonth {
  month: any;
  workingDays: any;
  monthName: string;
  days: any;
  year: any;
}

/** Result of SalesPersonService.getSalesPersonsReport(): rows are keyed by human-readable column titles. */
export interface SalesPersonReport {
  mtdRevenueReport: Record<string, any>[];
  dailyPerformanceIncentiveReport: Record<string, any>[];
  dailyCustomersReport: Record<string, any>[];
  monthlyCustomerReport: Record<string, any>[];
  monthlyIncentiveReport: Record<string, any>[];
}
