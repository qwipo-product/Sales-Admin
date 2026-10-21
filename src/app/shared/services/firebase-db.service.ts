// Source: main.0ad03de76494ddf1.js webpack module 1057 (export `l`).
// Thin wrapper over @angular/fire/database (Realtime Database, modular API).
import { Injectable } from '@angular/core';
import { Database, equalTo, get, objectVal, orderByChild, query, ref, set, update } from '@angular/fire/database';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FirebaseDbService {
  constructor(private database: Database) {}

  /** Live value of a node (rxfire objectVal – emits on every change). */
  fetchDataFromNode<T = any>(path: string): Observable<T> {
    const nodeRef = ref(this.database, path);
    return objectVal<T>(nodeRef);
  }

  /** Live value of `path` filtered with orderByChild(child).equalTo(value). */
  queryDataByValue<T = any>(path: string, child: string, value: any): Observable<T> {
    const nodeRef = ref(this.database, path);
    const nodeQuery = query(nodeRef, orderByChild(child), equalTo(value));
    return objectVal<T>(nodeQuery);
  }

  /** One-shot read; resolves a DataSnapshot (callers use `.val()`). */
  getDataFromNode(path: string) {
    const nodeRef = ref(this.database, path);
    return get(nodeRef);
  }

  /** One-shot query read (orderByChild/equalTo); resolves a DataSnapshot. */
  getDataByValue(path: string, child: string, value: any) {
    const nodeRef = ref(this.database, path);
    const nodeQuery = query(nodeRef, orderByChild(child), equalTo(value));
    return get(nodeQuery);
  }

  async updateData(path: string, data: any) {
    const nodeRef = ref(this.database, path);
    return update(nodeRef, data);
  }

  setData(path: string, data: any) {
    const nodeRef = ref(this.database, path);
    return set(nodeRef, data);
  }
}
