// Mock implementation of FirebaseDbService (Realtime Database), backed by MockDatabase.
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MockDatabase } from './mock-database';

/** Minimal DataSnapshot stand-in: callers only use `.val()`. */
class MockSnapshot {
  constructor(private value: any) {}
  val() {
    return this.value;
  }
  exists() {
    return this.value !== null && this.value !== undefined;
  }
}

@Injectable()
export class MockFirebaseDbService {
  private db = MockDatabase.instance;

  private filterChildren(path: string, child: string, value: any) {
    const node = this.db.getNode(path) || {};
    const result: any = {};
    Object.keys(node).forEach((key) => {
      if (node[key] && node[key][child] === value) result[key] = node[key];
    });
    return Object.keys(result).length ? result : null;
  }

  fetchDataFromNode<T = any>(path: string): Observable<T> {
    return this.db.watch(() => this.db.getNode(path));
  }

  queryDataByValue<T = any>(path: string, child: string, value: any): Observable<T> {
    return this.db.watch(() => this.filterChildren(path, child, value));
  }

  getDataFromNode(path: string) {
    return Promise.resolve(new MockSnapshot(this.db.getNode(path)));
  }

  getDataByValue(path: string, child: string, value: any) {
    return Promise.resolve(new MockSnapshot(this.filterChildren(path, child, value)));
  }

  async updateData(path: string, data: any) {
    this.db.updateNode(path, data);
  }

  setData(path: string, data: any) {
    this.db.setNode(path, data);
    return Promise.resolve();
  }
}
