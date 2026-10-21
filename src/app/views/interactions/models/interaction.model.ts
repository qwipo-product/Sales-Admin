// Interfaces inferred from field usage in chunk 374 / 704 and SalesPersonService (main.js 2937).

/** Firestore doc in collection "Interactions". */
export interface InteractionDoc {
  id?: string; // doc id added by FirestoreService
  interactionId: string;
  taskId: string;
  customerId: string;
  salesPersonId: string;
  createdDate: string;
  createdTimeStamp: number; // epoch ms; range filter + orderBy field
  customerInfo: { customerId: string; name: string; mobileNumber: string };
  salesPersonInfo: { salesPersonId: string; name: string; mobileNumber: string; businessName: string };
  interactionInfo: { interactionId: string; comments: string; commentCategory: string; imageUrl: string };
  checkInfo: {
    checkInTime: number; // epoch ms (0 = not set)
    checkOutTime: number; // epoch ms (0 = not set)
    checkInLatitude: number;
    checkInLongitude: number;
    checkOutLatitude?: number;
    checkOutLongitude?: number;
    checkInDistance: number; // metres
    checkOutDistance?: number; // metres
  };
}

/** Row shape produced by InteractionListComponent.mapToInteraction(). */
export interface InteractionRow {
  interactionId: string;
  customerId: string;
  salesPersonId: string;
  customerInfo: { id: string; name: string; mobileNumber: string };
  salesPersonInfo: { id: string; name: string; mobileNumber: string; businessName: string };
  interactionInfo: { interactionId: string; comments: string; commentCategory: string; imageUrl: string };
  checkInfo: {
    checkInDistance: number;
    checkOutDistance: number | '';
    checkInLatitude: number;
    checkInLongitude: number;
    checkOutLatitude: number | '';
    checkOutLongitude: number | '';
    checkInTime: string | 0; // 'yyyy-MM-dd HH:mm' or 0
    checkOutTime: string | 0;
    customerDuration: number; // minutes
  };
  createdDate: string;
  createdTimeStamp: number;
  taskId: string;
}

/** Search criteria used by the list and returned by SearchInteractionDialogComponent. */
export interface InteractionSearchInput {
  mobileNumber: string;
  salesPersonIds: any; // string[] (ids) in searchInteractionInput, {id,name}[] in the dialog result, [] after badge removal
  startDate?: string; // 'yyyy-MM-dd'
  endDate?: string; // 'yyyy-MM-dd'
  dateRange?: string; // unused: removing the "Date Range" badge now resets startDate/endDate to today
}

/** A filter "badge" shown above the table. */
export interface SearchItem {
  id: number;
  text: string; // key into keyLabelMap
  searchText: string;
  entity?: string; // never populated by the bundle; template compares it to 'Sales Person'
}

/** Row of the Interaction Summary dialog table / Excel. */
export interface InteractionSummaryRow {
  salesPersonId: string;
  salesPersonName: string;
  salesPersonMobileNumber: string;
  taskCount: number; // sum of TasksReport.customerCount
  interactionCount: number; // all interactions matching the current filters for that sales person
}
