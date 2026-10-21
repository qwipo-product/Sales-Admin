import { FirestoreOperator } from './enums';

/** Filter object consumed by FirestoreService.query*ByFilters()/queryNextPage() -> where(fieldName, operator, fieldValue). */
export interface FirestoreFilter {
  fieldName: string;
  operator: FirestoreOperator | string;
  fieldValue: any;
}
