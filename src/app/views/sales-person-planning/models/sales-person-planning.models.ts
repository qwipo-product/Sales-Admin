/**
 * Interfaces inferred from field usage in chunk 35 and in SalesPersonService (main.js module 2937).
 * None of these existed as runtime code (TS interfaces are erased); names are reconstructed.
 */
import { ClusterType, TaskCountStatus } from '../../../shared/models/enums';

/** One polygon vertex as stored in Firestore `SalesPersonClusters/{id}.coordinates[]`. */
export interface LatLng {
  latitude: number;
  longitude: number;
}

/** Map stored in `SalesPersonClusters/{id}.customers` (customerId -> { name: businessName }). */
export interface ClusterCustomers {
  [customerId: string]: { name: string };
}

/** Firestore collection `SalesPersonClusters` document ("Area" in the UI). Mapped by SalesPersonService.mapToCluster. */
export interface Cluster {
  id: string; // "AREA" + 10 random [A-Za-z0-9] chars (generateAreaId)
  name: string;
  type: ClusterType; // 1 = General, 2 = WholeSaler
  searchKey: string; // trimmed, lower-cased, single-spaced name (generateSearchKey)
  customerCount: number;
  coordinates: LatLng[] | null;
  createdDate?: any;
  updatedDate?: any;
  customers?: ClusterCustomers;
}

/** Sales person row as mapped by SalesPersonService.mapToSalesPerson (Firestore `SalesPerson`). */
export interface SalesPerson {
  id: string;
  name: string;
  mobileNumber: string;
  businessName: string;
  isActive: boolean;
  areaName: string; // cluster.name
  areaId: string; // cluster.id
  area: { id?: string; name?: string };
  customerCount: number;
  salesLeadId: string;
  salesLeadName: string;
  salesLeadMobileNumber: string;
  salesManagerId: string;
  salesManagerName: string;
  salesManagerMobileNumber: string;
  enableLogOut: boolean;
  /** Added client-side on the Tasks tab (default 35, editable per row). */
  tasksCount?: any;
}

/** Light-weight sales person passed to the Select Area dialog. */
export interface ExistingSalesPerson {
  id: string;
  name: string;
  areaId: string;
  areaName: string;
}

/** Result of SalesPersonService.getMappedSalesPersonFromClusterIds. */
export interface MappedSalesPerson {
  salesPersonName: string; // SalesPerson.businessName
  salesPersonId: string;
  clusterName: string;
  clusterId: string;
}

/** Body POSTed to `${messagingServiceUrl}` (MessageQueueService.postMessageToQueue). */
export interface MessageQueueRequest {
  messageType: MessageType;
  /** JSON.stringify(...) of the message-specific payload. */
  input: string;
}

export type MessageType =
  | 'UpdateClusterPolygon' // input: { salesPersonId, currentAreaId }
  | 'DeActivateSalesPerson' // input: { salesPersonId, currentAreaId }
  | 'RefreshClusters' // input: { areaIds: string[] }
  | 'MapSalesPersonToCluster' // input: { salesPersonId, currentAreaId, newAreaId, newAreaTaggedSalesPersonId }
  | 'CreateTasks'; // input: CreateTasksPayload

/** GeoJSON geometry sent to `${coreUrl}/customer/customers_by_geojson`. */
export interface GeoJsonPolygonGeometry {
  type: 'Polygon';
  coordinates: number[][][];
}

/** Item of `customers_by_geojson` response `.data` (only these two fields are consumed here). */
export interface GeoJsonCustomer {
  id: string;
  businessName: string;
  [key: string]: any;
}

/** Uploaded GeoJSON Feature (Upload Geo Json / Add Area / Update Polygon dialogs). */
export interface GeoJsonFeature {
  type: 'Feature';
  properties: { [key: string]: any }; // must contain id, type, AreaCode for bulk upload
  geometry: { type: string; coordinates: number[][][] };
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

/** Item of `${coreUrl}/customer/count_by_salesperson` response `.data`. */
export interface SalesPersonCustomerCount {
  salesperson_id: string;
  customer_count: number;
}

export interface TaskFilters {
  businessTypes: any[]; // BusinessType numeric enum values (Kirana = 1 ...)
  customerStatus: any[]; // 1 = Active, 0 = InActive
  businessStatus: any[]; // 1..11, 99
  customerOrderStatus: any[]; // '0-7' | '8-30' | '31-60' | '61-90' | '91-365' | '365+'
}

/** Sales person entry inside the data handed to the Preview dialog / CreateTasks payload. */
export interface TaskSalesPerson {
  id: string;
  name: string;
  dateLength: number;
  customerCount: number;
  tasksCount: any;
  givenTaskCount: number;
  expectedTaskCount: number;
  taskCountPerDay: any;
  areaId: string;
  areaName: string;
}

export interface GenerateTasksData {
  salesPersons: TaskSalesPerson[];
  taskDates: string[]; // 'yyyy-MM-dd'
  filters: TaskFilters;
}

/** `input` of the CreateTasks message. */
export interface CreateTasksPayload extends GenerateTasksData {
  messageQueueStatusId: string; // "MESQU" + 10 random chars
}

/** Row of the "View Tasks Preview" table. */
export interface TaskPreviewRow {
  id: string;
  customerCount: number;
  name: string;
  selectedDaysCount: number;
  expectedTaskCount: number;
  givenTaskCount: number;
  taskCount: any;
  message: string;
  status: TaskCountStatus | undefined;
}

/** Shape of AuthService.permission$ value[pageId]. */
export interface PagePermission {
  view: boolean;
  create: boolean;
  delete: boolean;
  edit: boolean;
  import: boolean;
  export: boolean;
}
