// Models for the permission system implemented in AuthService (main.js module 8175).

/** Six CRUD-style flags per page. */
export interface PagePermission {
  view: boolean;
  create: boolean;
  delete: boolean;
  edit: boolean;
  import: boolean;
  export: boolean;
}

/** AuthService.permission$ value: page_id -> PagePermission. */
export type PermissionMap = Record<string, PagePermission>;

/** Firestore `pages/{id}` document (collectionData with idField 'id'). Only `page_id` is read. */
export interface PageDoc {
  id: string;
  page_id: string;
  [key: string]: any;
}

/** Firestore `Roles/{id}` document. `permissions` is keyed by page_id. */
export interface RoleDoc {
  id: string;
  permissions: Record<string, Partial<PagePermission>>;
  [key: string]: any;
}

/** Firestore `Users/{uid}` document (docData with idField 'id'). */
export interface UserDoc {
  id: string;
  /** array of RoleDoc ids */
  roles?: string[];
  /** per-user overrides keyed by page_id; MUST exist when the user has at least one role (no null-check in code) */
  extended_permissions: Record<string, Partial<PagePermission>>;
  /** used by UserService.fetchSalesPersons(userType) */
  user_type?: number;
  [key: string]: any;
}
