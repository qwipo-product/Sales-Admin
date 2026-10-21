// Mock implementation of FirestoreService (same public API and return shapes), backed by MockDatabase.
import { Injectable } from '@angular/core';
import { FirestoreFilter } from 'app/shared/models/firestore-filter.model';
import { MOCK_DELETE_FIELD, MockDatabase } from './mock-database';

const delay = <T>(value: T, ms = 120): Promise<T> => new Promise((resolve) => setTimeout(() => resolve(value), ms));

@Injectable()
export class MockFirestoreService {
  private db = MockDatabase.instance;

  private sub(collectionName: string, docId: string, subCollectionName: string) {
    return `${collectionName}/${docId}/${subCollectionName}`;
  }

  async fetchCollection(collectionName: string): Promise<any[]> {
    return delay(this.db.listDocs(collectionName).map((d) => d.data));
  }

  async queryCollectionByFilter(collectionName: string, fieldName: string, fieldValue: any, operator: any) {
    return this.queryCollectionByFilters(collectionName, [{ fieldName, fieldValue, operator }]);
  }

  async queryCollectionByFilters(collectionName: string, filters: FirestoreFilter[]): Promise<any[]> {
    const rows = this.db.query(collectionName, filters as any);
    return delay(rows.map((r) => Object.assign(r.data, { id: r.id })));
  }

  async queryNextPage(
    collectionName: string,
    filters: FirestoreFilter[],
    orderByField: string,
    pageSize: number,
    ascending?: any,
  ): Promise<any[]> {
    const rows = this.db.query(collectionName, filters as any, { field: orderByField, direction: ascending ? 'asc' : 'desc' }, pageSize);
    return delay(rows.map((r) => Object.assign(r.data, { id: r.id })));
  }

  async fetchDocument(collectionName: string, docId: string): Promise<any> {
    return delay(this.db.getDoc(collectionName, docId));
  }

  async insertDoc(collectionName: string, data: any = {}): Promise<string> {
    return delay(this.db.addDoc(collectionName, data));
  }

  async insertDocWithId(collectionName: string, docId: string, data: any = {}) {
    this.db.setDoc(collectionName, docId, data);
    return delay(undefined);
  }

  async deleteDoc(collectionName: string, docId: string) {
    this.db.deleteDoc(collectionName, docId);
    return delay(undefined);
  }

  async deleteFieldDoc(collectionName: string, docId: string, fieldName: string): Promise<void> {
    this.db.updateDoc(collectionName, docId, { [fieldName]: MOCK_DELETE_FIELD });
    return delay(undefined);
  }

  async deleteSubCollectionDoc(collectionName: string, docId: string, subCollectionName: string, subDocId: string) {
    this.db.deleteDoc(this.sub(collectionName, docId, subCollectionName), subDocId);
    return delay(undefined);
  }

  async updateDocument(collectionName: string, docId: string, data: any = {}): Promise<void> {
    this.db.updateDoc(collectionName, docId, data);
    return delay(undefined);
  }

  async fetchSubCollection(collectionName: string, docId: string, subCollectionName: string): Promise<any[]> {
    return delay(this.db.listDocs(this.sub(collectionName, docId, subCollectionName)).map((d) => d.data));
  }

  async fetchSubCollectionDocIds(collectionName: string, docId: string, subCollectionName: string): Promise<string[]> {
    return delay(this.db.listDocs(this.sub(collectionName, docId, subCollectionName)).map((d) => d.id));
  }

  async querySubCollectionByFilters(
    collectionName: string,
    docId: string,
    subCollectionName: string,
    filters: FirestoreFilter[],
  ): Promise<any[]> {
    const rows = this.db.query(this.sub(collectionName, docId, subCollectionName), filters as any);
    return delay(rows.map((r) => Object.assign(r.data, { id: r.id })));
  }

  async insertDocSubCollection(collectionName: string, docId: string, subCollectionName: string, data: any = {}) {
    return delay(this.db.addDoc(this.sub(collectionName, docId, subCollectionName), data));
  }

  async insertDocWithIdSubCollection(
    collectionName: string,
    docId: string,
    subCollectionName: string,
    subDocId: string,
    data: any = {},
  ) {
    this.db.setDoc(this.sub(collectionName, docId, subCollectionName), subDocId, data);
    return delay(undefined);
  }

  async updateSubCollectionDocument(
    collectionName: string,
    docId: string,
    subCollectionName: string,
    subDocId: string,
    data: any,
  ) {
    this.db.updateDoc(this.sub(collectionName, docId, subCollectionName), subDocId, data);
    return delay(undefined);
  }

  async writeDataToSubCollectionInBatches(
    collectionName: string,
    docId: string,
    subCollectionName: string,
    items: any[],
  ): Promise<null> {
    items.forEach((item) => this.db.setDoc(this.sub(collectionName, docId, subCollectionName), item.id, item));
    return delay(null);
  }
}
