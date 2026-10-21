// Source: main.0ad03de76494ddf1.js webpack module 1343 (export `C`).
// Promise-based helpers over @angular/fire/firestore (modular API). All query helpers merge the doc id into the
// returned objects as `id` (Object.assign(doc.data(), { id: doc.id })), EXCEPT fetchCollection/fetchSubCollection
// which return doc.data() only.
import { Injectable } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from '@angular/fire/firestore';
import { FirestoreFilter } from '../models/firestore-filter.model';

/** Firestore limits a query to 30 disjunctions (`in` values multiplied together). */
const MAX_DISJUNCTIONS = 30;

/** Splits filters with large `in` lists into several filter sets that each respect Firestore's disjunction limit. */
export function splitDisjunctions(filters: FirestoreFilter[]): FirestoreFilter[][] {
  const inFilters = filters.filter((f) => f.operator === 'in' && Array.isArray(f.fieldValue));
  const product = inFilters.reduce((acc, f) => acc * Math.max(1, f.fieldValue.length), 1);
  if (product <= MAX_DISJUNCTIONS) {
    return [filters];
  }
  const largest = inFilters.reduce((a, b) => (b.fieldValue.length > a.fieldValue.length ? b : a));
  const others = product / largest.fieldValue.length;
  const size = Math.max(1, Math.floor(MAX_DISJUNCTIONS / others));
  const sets: FirestoreFilter[][] = [];
  for (let i = 0; i < largest.fieldValue.length; i += size) {
    const chunk = { ...largest, fieldValue: largest.fieldValue.slice(i, i + size) };
    sets.push(...splitDisjunctions(filters.map((f) => (f === largest ? chunk : f))));
  }
  return sets;
}

function uniqueById(rows: any[]): any[] {
  const seen = new Set<string>();
  return rows.filter((row) => (seen.has(row.id) ? false : (seen.add(row.id), true)));
}

@Injectable({
  providedIn: 'root',
})
export class FirestoreService {
  constructor(private db: Firestore) {}

  async fetchCollection(collectionName: string): Promise<any[]> {
    const snapshot = await getDocs(collection(this.db, collectionName));
    return snapshot.docs.map((d) => d.data());
  }

  async queryCollectionByFilter(collectionName: string, fieldName: string, fieldValue: any, operator: any) {
    const q = query(collection(this.db, collectionName), where(fieldName, operator, fieldValue));
    const snapshot = await getDocs(q);
    const result: any[] = [];
    snapshot.forEach((d) => {
      result.push(Object.assign(d.data(), { id: d.id }));
    });
    return result;
  }

  async queryCollectionByFilters(collectionName: string, filters: FirestoreFilter[]): Promise<any[]> {
    const chunks = splitDisjunctions(filters);
    if (chunks.length > 1) {
      // Firestore allows at most 30 `in` values per query: run one query per chunk and merge the results.
      const results = await Promise.all(chunks.map((chunk) => this.queryCollectionByFilters(collectionName, chunk)));
      return uniqueById(results.flat());
    }
    const q = query(
      collection(this.db, collectionName),
      ...filters.map((f) => where(f.fieldName, f.operator as any, f.fieldValue)),
    );
    const snapshot = await getDocs(q);
    const result: any[] = [];
    snapshot.forEach((d) => {
      result.push(Object.assign(d.data(), { id: d.id }));
    });
    return result;
  }

  /**
   * One page ordered by `orderByField` (desc, or asc when `ascending` is truthy), at most `pageSize` documents.
   * Callers express the page boundary as a range filter on the order field.
   */
  async queryNextPage(
    collectionName: string,
    filters: FirestoreFilter[],
    orderByField: string,
    pageSize: number,
    ascending?: any,
  ): Promise<any[]> {
    const chunks = splitDisjunctions(filters);
    if (chunks.length > 1) {
      // Run each chunk with the same order/limit, then merge and keep the first `pageSize` documents overall.
      const results = uniqueById(
        (await Promise.all(chunks.map((chunk) => this.queryNextPage(collectionName, chunk, orderByField, pageSize, ascending)))).flat(),
      );
      results.sort((a, b) => (a[orderByField] > b[orderByField] ? 1 : a[orderByField] < b[orderByField] ? -1 : 0) * (ascending ? 1 : -1));
      return results.slice(0, pageSize);
    }
    const q = query(
      collection(this.db, collectionName),
      ...filters.map((f) => where(f.fieldName, f.operator as any, f.fieldValue)),
      orderBy(orderByField, ascending ? 'asc' : 'desc'),
      limit(pageSize),
    );
    const snapshot = await getDocs(q);
    const result: any[] = [];
    snapshot.forEach((d) => {
      result.push(Object.assign(d.data(), { id: d.id }));
    });
    return result;
  }

  /** doc.data() or null when missing (id NOT merged). */
  async fetchDocument(collectionName: string, docId: string): Promise<any> {
    const docRef = doc(this.db, collectionName, docId);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? snapshot.data() : null;
  }

  /** addDoc -> new id */
  async insertDoc(collectionName: string, data: any = {}): Promise<string> {
    return (await addDoc(collection(this.db, collectionName), data)).id;
  }

  /** setDoc(doc(collection, id), data). Errors are logged and rethrown (the original swallowed them). */
  async insertDocWithId(collectionName: string, docId: string, data: any = {}) {
    try {
      return await setDoc(doc(this.db, collectionName, docId), data);
    } catch (error) {
      console.log('Firestore Service insertDocWithId error ::: ', error);
      throw error;
    }
  }

  async deleteDoc(collectionName: string, docId: string) {
    return await deleteDoc(doc(this.db, collectionName, docId));
  }

  /** updateDoc(docRef, { [field]: deleteField() }) */
  async deleteFieldDoc(collectionName: string, docId: string, fieldName: string): Promise<void> {
    const docRef = doc(this.db, collectionName, docId);
    const data = { [fieldName]: deleteField() };
    await updateDoc(docRef, data);
  }

  async deleteSubCollectionDoc(collectionName: string, docId: string, subCollectionName: string, subDocId: string) {
    const parentRef = doc(this.db, collectionName, docId);
    return await deleteDoc(doc(parentRef, subCollectionName, subDocId));
  }

  /** updateDoc; errors are re-thrown. (The original also attached an onSnapshot listener per call that was never removed.) */
  async updateDocument(collectionName: string, docId: string, data: any = {}): Promise<void> {
    const docRef = doc(this.db, collectionName, docId);
    await updateDoc(docRef, data);
  }

  async fetchSubCollection(collectionName: string, docId: string, subCollectionName: string): Promise<any[]> {
    const parentRef = doc(this.db, collectionName, docId);
    const snapshot = await getDocs(collection(parentRef, subCollectionName));
    return snapshot.docs.map((d) => d.data());
  }

  async fetchSubCollectionDocIds(collectionName: string, docId: string, subCollectionName: string): Promise<string[]> {
    const parentRef = doc(this.db, collectionName, docId);
    const snapshot = await getDocs(collection(parentRef, subCollectionName));
    const ids: string[] = [];
    snapshot.forEach((d) => {
      ids.push(d.id);
    });
    return ids;
  }

  async querySubCollectionByFilters(
    collectionName: string,
    docId: string,
    subCollectionName: string,
    filters: FirestoreFilter[],
  ): Promise<any[]> {
    const parentRef = doc(this.db, collectionName, docId);
    const q = query(
      collection(parentRef, subCollectionName),
      ...filters.map((f) => where(f.fieldName, f.operator as any, f.fieldValue)),
    );
    const snapshot = await getDocs(q);
    const result: any[] = [];
    snapshot.forEach((d) => {
      result.push(Object.assign(d.data(), { id: d.id }));
    });
    return result;
  }

  async insertDocSubCollection(collectionName: string, docId: string, subCollectionName: string, data: any = {}) {
    const parentRef = doc(this.db, collectionName, docId);
    return (await addDoc(collection(parentRef, subCollectionName), data)).id;
  }

  async insertDocWithIdSubCollection(
    collectionName: string,
    docId: string,
    subCollectionName: string,
    subDocId: string,
    data: any = {},
  ) {
    const parentRef = doc(this.db, collectionName, docId);
    return setDoc(doc(parentRef, subCollectionName, subDocId), data);
  }

  async updateSubCollectionDocument(
    collectionName: string,
    docId: string,
    subCollectionName: string,
    subDocId: string,
    data: any,
  ) {
    const parentRef = doc(this.db, collectionName, docId);
    const subDocRef = doc(parentRef, subCollectionName, subDocId);
    return updateDoc(subDocRef, data);
  }

  /** One writeBatch with batch.set(doc(sub, item.id), item) for every item (no 500-op chunking). */
  async writeDataToSubCollectionInBatches(
    collectionName: string,
    docId: string,
    subCollectionName: string,
    items: any[],
  ): Promise<null> {
    try {
      const parentRef = doc(this.db, collectionName, docId);
      const batch = writeBatch(this.db);
      for (const item of items) {
        const subCollectionRef = collection(parentRef, subCollectionName);
        const itemRef = doc(subCollectionRef, item.id);
        batch.set(itemRef, item);
      }
      await batch.commit();
      console.log(`Added ${items.length} documents to subCollection ${subCollectionName}`);
      return null;
    } catch (error) {
      console.error('Error writing data to subCollection:', error);
      throw error;
    }
  }
}
