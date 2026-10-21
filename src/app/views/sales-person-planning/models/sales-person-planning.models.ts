/**
 * Interfaces inferred from field usage in chunk 35 and in SalesPersonService (main.js module 2937).
 * None of these existed as runtime code (TS interfaces are erased); names are reconstructed.
 */
import { ClusterType } from '../../../shared/models/enums';

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
  /** Added client-side on the Tasks tab (tasks per day, default 35). */
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

/** Item of `${coreUrl}/customer/company_share_by_salesperson` response `.data`. */
export interface CompanyShopShare {
  company_id: string;
  company_name: string;
  shop_count: number;
  total_shops: number;
  shop_percentage: number; // 0..100, share of the sales persons' shops that stock the company
}

/** Option of the Tasks tab "Company" filter. */
export interface CompanyOption {
  id: string;
  name: string;
  color: string;
  shopPercentage: number;
}

export interface TaskFilters {
  businessTypes: any[]; // BusinessType numeric enum values (Kirana = 1 ...)
  customerStatus: any[]; // 1 = Active, 0 = InActive
  businessStatus: any[]; // 1..11, 99
  customerOrderStatus: any[]; // '0-7' | '8-30' | '31-60' | '61-90' | '91-365' | '365+'
  companyIds: string[]; // only shops that stock at least one of these companies
}

/** Item of `${coreUrl}/customer/shops_for_schedule` response `.data`: a shop that matches the Tasks filters. */
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

/** Data handed to the Generate Tasks dialog by the Tasks tab. */
export interface GenerateTasksDialogData {
  /** Tasks are generated for one sales person at a time. */
  salesPerson: SalesPerson;
  /** Every day of the selected From - To range. */
  dates: Date[];
  filters: TaskFilters;
  /** The selected companies, with their dot colours. */
  companies: CompanyOption[];
  shops: ScheduleShop[];
}

/** Sales person entry of the CreateTasks payload. */
export interface TaskSalesPerson {
  id: string;
  name: string;
  areaId: string;
  areaName: string;
  taskCountPerDay: number; // retailers per set
  numberOfSets: number;
}

/** One visit of the weekly schedule: the shops of one set on one date. */
export interface ScheduledTaskDay {
  salesPersonId: string;
  taskDate: string; // 'yyyy-MM-dd'
  setNumber: number; // 1-based
  customerIds: string[];
}

/** `input` of the CreateTasks message. */
export interface CreateTasksPayload {
  messageQueueStatusId: string; // "MESQU" + 10 random chars
  salesPersons: TaskSalesPerson[];
  taskDates: string[]; // 'yyyy-MM-dd'
  filters: TaskFilters;
  /** Which shops to visit on which date (the sets picked in the Generate Tasks dialog). */
  schedule: ScheduledTaskDay[];
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
