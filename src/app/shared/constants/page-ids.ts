// Source: main.0ad03de76494ddf1.js webpack module 5774.
//   export `A` -> PageCode (numeric enum; used as `code` on top-level menu items)
//   export `u` -> PageIds  (Firestore `pages` collection `page_id` values; used as `pageId` on menu items and as
//                           `this.pageId` in feature components for AuthService.getPageAccessPermission())

/** Codes attached to top-level navigation items (`code` field). Not used for gating. */
export enum PageCode {
  Welcome = 0,
  Profile = 1,
  NotFound = 99,
}

/** page_id values of documents in the Firestore `pages` collection (permission keys). */
export const PageIds = {
  crm_sales_person_list: 'crm_sales_person_list',
  crm_attendance: 'crm_attendance',
  crm_salesperson_planning: 'crm_salesperson_planning',
  crm_task_report: 'crm_task_report',
  crm_interactions: 'crm_interactions',
  crm_performance_report: 'crm_performance_report',
};
