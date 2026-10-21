// Interfaces inferred from field usage in chunk 704 and SalesPersonService (main.js 2937).
// Field names are exactly those read/written by the bundle; types are inferred.

/** Task status codes used by getTaskStatusString(). */
export enum TaskStatus {
  InProgress = 1,
  Visited = 2,
  NotYetVisited = 99,
}

export const TASK_STATUS_LABELS: { [status: number]: string } = {
  1: 'In Progress',
  2: 'Visited',
  99: 'Not Yet Visited',
};

/** Firestore doc in collection "TasksReport" (one per sales person per task date). */
export interface TasksReportDoc {
  id: string; // doc id (added by FirestoreService.queryCollectionByFilters)
  salesPersonId: string;
  salesPersonName: string;
  clusterName?: string;
  customerCount: number;
  taskDate: string; // 'yyyy-MM-dd' (compared with == against Tasks.taskDate)
  taskDateTimestamp: number; // epoch ms, used for range filtering
  isActive?: boolean;
}

/** Row of the Task Report table (TaskListComponent.mapToTasks / TaskDetailsComponent.mapToTaskReport). */
export interface TaskReportRow {
  salesPersonId: string;
  salesPersonName: string;
  areaName: string; // clusterName || ''
  customerCount: number;
  date: string; // taskDate
  isActive?: boolean;
  id: string;
}

/** Firestore doc in collection "Tasks" (one per customer stop). */
export interface TaskDoc {
  id: string;
  taskDate: string;
  taskDateTimestamp: number;
  createdDate?: string;
  customerId: string;
  dealerId?: string;
  stopNumber: number;
  status: TaskStatus | number;
  interactionId?: string;
  salesPersonId: string;
  setInfo: { setName: string };
  customerInfo: {
    customerId: string;
    businessName: string;
    customerName: string;
    mobileNumber: string;
    businessType: number | string; // BusinessType enum value or already a name
    address: string;
    areaName: string;
    latitude: number;
    longitude: number;
  };
  salesPersonInfo: {
    id: string;
    name: string;
    subAreaName: string;
  };
}

/** Row of the Task Details table (TaskDetailsComponent.mapToTasks). */
export interface TaskDetailsRow {
  address: string;
  areaCode: string; // customerInfo.areaName
  businessName: string;
  businessType: number | string;
  customerId: string;
  customerName: string;
  latitude: number;
  longitude: number;
  mobileNumber: string;
  dealerId: string;
  id: string;
  setName: string;
  date: string; // createdDate
  status: string; // label
  stopNumber: number;
  taskDate: string;
  salesPersonAreaCode: string; // salesPersonInfo.subAreaName
  salesPersonId: string;
  salesPersonName: string;
  interactionId: string; // '' when no interaction
}

/** Filters persisted to localStorage key "selectedFilters" and passed as ?selectedFilters= JSON. */
export interface TaskReportFilters {
  startDate: string | Date | null;
  endDate: string | Date | null;
  salesPersonIds: string[];
}

/** Page-level permission object from AuthService.permission$ (keyed by page_id). */
export interface PagePermission {
  view: boolean;
  create: boolean;
  delete: boolean;
  edit: boolean;
  import: boolean;
  export: boolean;
}
