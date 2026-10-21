// Source: main.0ad03de76494ddf1.js webpack module 8352.
// Export map: FW=UserType, RN=AlertType, _$=BusinessType, d3=SalesPersonStatus, $q=STATES, YQ=FirestoreOperator,
//             Wm=ClusterType, BB=MessageQueueStatus, _n=TaskCountStatus, H8=AttendanceStatus.
// Enum names are inferred from values/usages (minified); member names and values are exact.

export enum UserType {
  Customer = 1,
  Dealer = 2,
  Merchant = 3,
  FieldAgent = 4,
  SupportMember = 5,
  MarketingAgent = 6,
  SalesPerson = 7,
  SalesLead = 8,
  SalesManager = 9,
  Guest = 99,
}

/**
 * Not exported from the bundle (no consumer kept it) but declared in the same file. It is declared TWICE in the
 * source (TypeScript enum declaration merging) – the bundle contains a second `(Q || (Q = {}))` block.
 * The name is a guess.
 */
export enum PrescriptionType {
  Image = 1,
  Text = 2,
  None = 99,
}
// eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
export enum PrescriptionType {
  prescriptionImageUrl = 1,
  text = 2,
}

/** SweetAlert icon names. */
export enum AlertType {
  Error = 'error',
  Warning = 'warning',
  Success = 'success',
}

export enum BusinessType {
  Kirana = 1,
  Restaurant = 2,
  Caterers = 3,
  TiffinCenters = 4,
  PgHostel = 5,
  Institutional = 6,
  Bakery = 7,
  SweetHouse = 8,
  VegetableShops = 9,
  Tier2Customer = 10,
  Medicals = 11,
  Chemist = 13,
  Cosmetic = 14,
  Supermarket = 15,
  Wholesale = 16,
  RiceTraders = 17,
  OilTraders = 18,
  Others = 19,
  None = 99,
}

export enum SalesPersonStatus {
  InActive = 0,
  Active = 1,
}

export interface IndianState {
  id: number;
  name: string;
  /** GST state code */
  stateCode: number;
}

export const STATES: IndianState[] = [
  { id: 1, name: 'Andhra Pradesh', stateCode: 37 },
  { id: 2, name: 'Arunachal Pradesh', stateCode: 12 },
  { id: 3, name: 'Assam', stateCode: 18 },
  { id: 4, name: 'Bihar', stateCode: 10 },
  { id: 5, name: 'Chhattisgarh', stateCode: 22 },
  { id: 6, name: 'Delhi / New Delhi', stateCode: 7 },
  { id: 7, name: 'Goa', stateCode: 30 },
  { id: 8, name: 'Gujarat', stateCode: 24 },
  { id: 9, name: 'Haryana', stateCode: 6 },
  { id: 10, name: 'Himachal Pradesh', stateCode: 2 },
  { id: 11, name: 'Jammu & Kashmir', stateCode: 1 },
  { id: 12, name: 'Jharkhand', stateCode: 20 },
  { id: 13, name: 'Karnataka', stateCode: 29 },
  { id: 14, name: 'Kerala', stateCode: 32 },
  { id: 15, name: 'Madhya Pradesh', stateCode: 23 },
  { id: 16, name: 'Maharashtra', stateCode: 27 },
  { id: 17, name: 'Manipur', stateCode: 14 },
  { id: 18, name: 'Meghalaya', stateCode: 17 },
  { id: 19, name: 'Mizoram', stateCode: 15 },
  { id: 20, name: 'Nagaland', stateCode: 13 },
  { id: 21, name: 'Odisha (Orissa)', stateCode: 21 },
  { id: 22, name: 'Punjab', stateCode: 3 },
  { id: 23, name: 'Rajasthan', stateCode: 8 },
  { id: 24, name: 'Sikkim', stateCode: 11 },
  { id: 25, name: 'Tamil Nadu', stateCode: 33 },
  { id: 26, name: 'Telangana', stateCode: 36 },
  { id: 27, name: 'Tripura', stateCode: 16 },
  { id: 28, name: 'Uttar Pradesh', stateCode: 9 },
  { id: 29, name: 'Uttarakhand', stateCode: 5 },
  { id: 30, name: 'West Bengal', stateCode: 19 },
];
/** Integration alias (some feature reconstructions use `States`). */
export const States = STATES;

/** Firestore `where()` operators used by FirestoreService filters. */
export enum FirestoreOperator {
  LessThan = '<',
  GreaterThan = '>',
  EqualTo = '==',
  LessThanOrEqualTo = '<=',
  GreaterThanOrEqualTo = '>=',
  NotEqualTo = '!=',
  ArrayContains = 'array-contains',
  ArrayContainsAny = 'array-contains-any',
  In = 'in',
  NotIn = 'not-in',
}

/** Cluster (area) type. See helpers/utils getClusterTypeName() / getBusinessTypesByClusterType(). */
export enum ClusterType {
  General = 1,
  WholeSaler = 2,
  None = 99,
}

/** Firestore `MessageQueueStatus` documents `status` field. */
export enum MessageQueueStatus {
  Not_Started = 1,
  Started = 2,
  In_Progress = 3,
  Completed = 4,
  Errors = 5,
}

export enum TaskCountStatus {
  GREATER_THAN = 1,
  LESS_THAN = 2,
  EQUAL_TO = 3,
  ZERO = 4,
}

/** `status` of AttendanceReport / LeaveReport documents. */
export enum AttendanceStatus {
  CHECKED_IN = 1,
  CHECKED_OUT = 2,
  REASON_FOR_EARLY_LOGOUT = 3,
  REASON_FOR_EARLY_LOGOUT_ACCEPTED = 4,
  REASON_FOR_EARLY_LOGOUT_REJECTED = 5,
  APPLY_LEAVE = 6,
  LEAVE_ACCEPTED = 7,
  LEAVE_REJECTED = 8,
  LEAVE_CANCELLED = 9,
  NONE = 99,
}
