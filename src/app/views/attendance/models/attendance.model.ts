/**
 * Models used by the Attendance feature (chunk 205).
 * Field names are inferred from usage in the components and in SalesPersonService (main module 2937).
 * None of these interfaces exist as runtime code in the bundle (TS interfaces are erased);
 * they are reconstructed for type safety.
 */

/** Per-page permission object published by AuthService.permission$ (keyed by page_id). */
export interface PagePermission {
  view: boolean;
  create: boolean;
  delete: boolean;
  edit: boolean;
  import: boolean;
  export: boolean;
}

export type PermissionMap = Record<string, PagePermission>;

/** Shape returned by SalesPersonService.getSalesPersons() -> mapToSalesPerson() (Firestore `SalesPerson`). */
export interface SalesPerson {
  id: string;
  name: string;
  mobileNumber: string;
  businessName: string;
  isActive: boolean;
  areaName: string;
  areaId: string;
  area: any; // raw `cluster` object ({ id, name, ... }) or {}
  customerCount: number;
  salesLeadId: string;
  salesLeadName: string;
  salesLeadMobileNumber: string;
  salesManagerId: string;
  salesManagerName: string;
  salesManagerMobileNumber: string;
  enableLogOut: boolean;
}

/** Firestore `Users` document (user_type == UserType.SalesLead) as returned by UserService.fetchSalesPersons(). */
export interface UserDoc {
  id: string;
  name: string;
  user_type: number;
  mobile_number: string;
  [key: string]: any;
}

/** Lead option used by the "Lead Name" multi-select (LeaveRequest / AttendanceDetails). */
export interface SalesLeadOption {
  name: string;
  userId: string;
  user_type: number;
  mobileNumber: string;
}

/** Filters persisted to localStorage under key "selectedFilters". */
export interface AttendanceFilters {
  startDate: string | null; // yyyy-MM-dd
  endDate: string | null; // yyyy-MM-dd
  salesPersonIds: string[];
  salesLeadIds: string[];
}

/** Person reference embedded in AttendanceReport / LeaveReport documents. */
export interface PersonRef {
  id?: string;
  name: string;
  mobileNumber: string;
}

/**
 * Raw Firestore document of collection `AttendanceReport` or `LeaveReport`
 * (returned by FirestoreService.queryCollectionByFilters, with `id` = doc id).
 */
export interface AttendanceReportDoc {
  id: string;
  status: number; // AttendanceStatus
  createdTimeStamp: number; // epoch ms; used for the date range query
  createdDate?: any; // LeaveRequest renders it through `| date:'yyyy-MM-dd'`; AttendanceDetails formats it (0 = empty)
  appliedOn?: any; // leave "applied on" date (rendered as-is)
  reason?: string;
  salesPersonId: string;
  salesPerson?: { name?: string; mobileNumber?: string };
  salesLeadId?: string;
  salesLead?: { name?: string; mobileNumber?: string };
  salesManagerId?: string;
  salesManager?: { name?: string; mobileNumber?: string };
  checkInTime?: number; // epoch ms (0 = not checked in)
  checkOutTime?: number; // epoch ms (0 = not checked out)
  checkInLatitude?: number;
  checkInLongitude?: number;
  leaveId?: string; // only on AttendanceReport docs created from an accepted leave
}

/** Row model of the "Approval Request" tab (LeaveRequestComponent.mapToAttendanceReports). */
export interface LeaveRequestRow {
  id: string;
  status: number;
  createdTimeStamp: number;
  salesPersonId: string;
  salesPerson: PersonRef;
  salesLeadId: string;
  salesManagerId: string;
  salesLead: PersonRef;
  salesManager: PersonRef;
  reason: string;
  createdDate: any;
  appliedOn: any;
}

/** Row model of the "Attendance Details" tab (AttendanceDetailsComponent.mapToAttendanceReports). */
export interface AttendanceDetailsRow {
  id: string;
  status: number;
  checkInLatitude: number;
  checkInLongitude: number;
  checkInTime: string; // 'yyyy-MM-dd HH:mm:ss' or ''
  checkOutTime: string; // 'yyyy-MM-dd HH:mm:ss' or ''
  createdTimeStamp: number;
  salesPersonId: string;
  salesPerson: PersonRef;
  salesLeadId: string;
  salesManagerId: string;
  salesLead: PersonRef;
  salesManager: PersonRef;
  reason: string;
  createdDate: string; // 'yyyy-MM-dd' or ''
  appliedOn: any;
}

/** Firestore `Calendar/{monthYear}` document as mapped by SalesPersonService.mapToWorkingDays(). */
export interface CalendarMonth {
  month: string | number; // used as-is in `${year}-${month}-01`
  workingDays: number;
  monthName: string;
  days: number; // number of days in the month
  year: string | number;
}

/** Row model of the "Attendance Summary" tab. */
export interface AttendanceSummaryRow {
  name: string;
  businessName: string;
  mobileNumber: string;
  leadName: string;
  leadMobileNumber: string;
  leadId: string | number;
  daysInMonth: number;
  workingDays: number;
  managerId: string;
  managerName: string;
  managerMobileNumber: string;
  presentDays: number;
  leaveDays: number;
  absentDays: number;
}

/** Month option returned by the shared helper getMonthList() (main module 1972, export G4). */
export interface MonthOption {
  name: string; // "January" ...
  isSelected: boolean;
  value: string; // "january" ...
}
