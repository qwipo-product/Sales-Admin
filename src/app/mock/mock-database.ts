// In-memory backend used when config.json has `"env": "mock"`.
// - Firestore-like document store (collections + sub-collections, where/orderBy/limit queries, deleteField).
// - Realtime-Database-like JSON tree.
// - "Core API" customer table used by the mock REST endpoints.
// The generated seed is rebuilt on every load; every write is also recorded in a small overlay that is persisted to
// localStorage (key below) and replayed on top of the seed, so changes survive page reloads.
import { BehaviorSubject, Observable, distinctUntilChanged, map } from 'rxjs';
import { MockCustomer, generateMockSeed } from './mock-seed';

const STORAGE_KEY = 'salesAdminMockDb.v1';

/** Sentinel written by `deleteFieldDoc` (equivalent of Firestore's deleteField()). */
export const MOCK_DELETE_FIELD = { __mockDeleteField: true };

export interface MockFilter {
  fieldName: string;
  operator: string;
  fieldValue: any;
}

type FsOverlayEntry = { op: 'set'; data: any } | { op: 'update'; data: any } | { op: 'delete' };
interface Overlay {
  fs: { path: string; id: string; entry: FsOverlayEntry }[];
  rtdb: { path: string; op: 'set' | 'update'; data: any }[];
  customers: { id: string; data: Partial<MockCustomer> | null }[];
}

function clone<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

export function getField(doc: any, path: string): any {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), doc);
}

function compare(a: any, b: any): number {
  if (a === b) return 0;
  if (a === undefined || a === null) return -1;
  if (b === undefined || b === null) return 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

export function matchesFilter(doc: any, filter: MockFilter): boolean {
  const value = getField(doc, filter.fieldName);
  const target = filter.fieldValue;
  switch (filter.operator) {
    case '==':
      return value === target;
    case '!=':
      return value !== undefined && value !== target;
    case '<':
      return value !== undefined && compare(value, target) < 0;
    case '<=':
      return value !== undefined && compare(value, target) <= 0;
    case '>':
      return value !== undefined && compare(value, target) > 0;
    case '>=':
      return value !== undefined && compare(value, target) >= 0;
    case 'in':
      return Array.isArray(target) && target.includes(value);
    case 'not-in':
      return value !== undefined && Array.isArray(target) && !target.includes(value);
    case 'array-contains':
      return Array.isArray(value) && value.includes(target);
    case 'array-contains-any':
      return Array.isArray(value) && Array.isArray(target) && target.some((t) => value.includes(t));
    default:
      throw new Error(`Unsupported operator ${filter.operator}`);
  }
}

/** Applies a Firestore-style update: top-level keys replace, dotted keys set nested values, sentinel deletes. */
function applyUpdate(target: any, data: any) {
  Object.keys(data).forEach((key) => {
    const value = data[key];
    const parts = key.split('.');
    let node = target;
    for (let i = 0; i < parts.length - 1; i++) {
      if (typeof node[parts[i]] !== 'object' || node[parts[i]] === null) node[parts[i]] = {};
      node = node[parts[i]];
    }
    const last = parts[parts.length - 1];
    if (value && value.__mockDeleteField) {
      delete node[last];
    } else {
      node[last] = clone(value);
    }
  });
}

export class MockDatabase {
  private static _instance: MockDatabase | null = null;

  static get instance(): MockDatabase {
    if (!MockDatabase._instance) {
      MockDatabase._instance = new MockDatabase();
    }
    return MockDatabase._instance;
  }

  private collections = new Map<string, Map<string, any>>();
  private rtdbTree: any = {};
  private customerTable = new Map<string, MockCustomer>();
  private overlay: Overlay = { fs: [], rtdb: [], customers: [] };
  private version$ = new BehaviorSubject<number>(0);
  private saveTimer: any = null;

  private constructor() {
    const seed = generateMockSeed(new Date());
    Object.keys(seed.firestore).forEach((name) => {
      const docs = new Map<string, any>();
      Object.keys(seed.firestore[name]).forEach((id) => docs.set(id, seed.firestore[name][id]));
      this.collections.set(name, docs);
    });
    this.rtdbTree = seed.rtdb;
    seed.customers.forEach((c) => this.customerTable.set(c.id, c));
    this.replayOverlay();
    (window as any).salesAdminMock = { reset: () => MockDatabase.reset(), db: this };
    console.info('Sales Admin is running on local sample data. Run salesAdminMock.reset() in the console to discard your changes.');
  }

  /** Clears every change made in mock mode and reloads the page with fresh sample data. */
  static reset() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    window.location.reload();
  }

  // ------------------------------------------------------------------------------------------- change tracking
  /** Emits whenever anything changes (used for live docData/collectionData/objectVal streams). */
  watch<T>(read: () => T): Observable<T> {
    return this.version$.pipe(
      map(() => clone(read())),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
    );
  }

  private changed() {
    this.version$.next(this.version$.value + 1);
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.persist(), 200);
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.overlay));
    } catch (e) {
      console.warn('Mock database: unable to persist changes', e);
    }
  }

  private replayOverlay() {
    let stored: Overlay | null = null;
    try {
      stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch (e) {
      stored = null;
    }
    if (!stored) return;
    stored.fs.forEach((w) => this.applyFs(w.path, w.id, w.entry));
    stored.rtdb.forEach((w) => this.applyRtdb(w.path, w.op, w.data));
    stored.customers.forEach((w) => this.applyCustomer(w.id, w.data));
    this.overlay = stored;
  }

  // ------------------------------------------------------------------------------------------- Firestore
  private col(path: string): Map<string, any> {
    if (!this.collections.has(path)) this.collections.set(path, new Map());
    return this.collections.get(path)!;
  }

  private applyFs(path: string, id: string, entry: FsOverlayEntry) {
    const docs = this.col(path);
    if (entry.op === 'set') {
      docs.set(id, clone(entry.data));
    } else if (entry.op === 'update') {
      const existing = docs.get(id);
      if (existing) applyUpdate(existing, entry.data);
    } else {
      docs.delete(id);
    }
  }

  private recordFs(path: string, id: string, entry: FsOverlayEntry) {
    this.applyFs(path, id, entry);
    this.overlay.fs.push({ path, id, entry: clone(entry) });
    this.changed();
  }

  getDoc(path: string, id: string): any | null {
    const doc = this.col(path).get(id);
    return doc === undefined ? null : clone(doc);
  }

  /** All documents of a collection as `{ id, data }`. */
  listDocs(path: string): { id: string; data: any }[] {
    return Array.from(this.col(path).entries()).map(([id, data]) => ({ id, data: clone(data) }));
  }

  query(
    path: string,
    filters: MockFilter[] = [],
    order?: { field: string; direction: 'asc' | 'desc' },
    limit?: number,
  ): { id: string; data: any }[] {
    let rows = Array.from(this.col(path).entries()).filter(([, data]) => filters.every((f) => matchesFilter(data, f)));
    if (order) {
      rows = rows.filter(([, data]) => getField(data, order.field) !== undefined);
      rows.sort(([, a], [, b]) => compare(getField(a, order.field), getField(b, order.field)) * (order.direction === 'desc' ? -1 : 1));
    }
    if (limit !== undefined) rows = rows.slice(0, limit);
    return rows.map(([id, data]) => ({ id, data: clone(data) }));
  }

  setDoc(path: string, id: string, data: any) {
    this.recordFs(path, id, { op: 'set', data });
  }

  addDoc(path: string, data: any): string {
    const id = Array.from({ length: 20 }, () => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 62)]).join('');
    this.setDoc(path, id, data);
    return id;
  }

  updateDoc(path: string, id: string, data: any) {
    if (!this.col(path).has(id)) {
      throw new Error(`No document to update: ${path}/${id}`);
    }
    this.recordFs(path, id, { op: 'update', data });
  }

  deleteDoc(path: string, id: string) {
    this.recordFs(path, id, { op: 'delete' });
  }

  // ------------------------------------------------------------------------------------------- Realtime Database
  private splitPath(path: string): string[] {
    return path.split('/').filter((p) => p.length > 0);
  }

  getNode(path: string): any {
    const value = this.splitPath(path).reduce((acc, key) => (acc == null ? undefined : acc[key]), this.rtdbTree);
    return value === undefined ? null : clone(value);
  }

  private applyRtdb(path: string, op: 'set' | 'update', data: any) {
    const parts = this.splitPath(path);
    if (op === 'set') {
      if (parts.length === 0) {
        this.rtdbTree = clone(data);
        return;
      }
      let node = this.rtdbTree;
      for (let i = 0; i < parts.length - 1; i++) {
        if (typeof node[parts[i]] !== 'object' || node[parts[i]] === null) node[parts[i]] = {};
        node = node[parts[i]];
      }
      if (data === null) delete node[parts[parts.length - 1]];
      else node[parts[parts.length - 1]] = clone(data);
      return;
    }
    // update(): every key is a relative path that is overwritten
    Object.keys(data || {}).forEach((key) => this.applyRtdb(`${path}/${key}`, 'set', data[key]));
  }

  setNode(path: string, data: any) {
    this.applyRtdb(path, 'set', data);
    this.overlay.rtdb.push({ path, op: 'set', data: clone(data) });
    this.changed();
  }

  updateNode(path: string, data: any) {
    this.applyRtdb(path, 'update', data);
    this.overlay.rtdb.push({ path, op: 'update', data: clone(data) });
    this.changed();
  }

  // ------------------------------------------------------------------------------------------- Core API customers
  private applyCustomer(id: string, data: Partial<MockCustomer> | null) {
    if (data === null) {
      this.customerTable.delete(id);
    } else {
      this.customerTable.set(id, { ...(this.customerTable.get(id) || ({} as MockCustomer)), ...clone(data), id });
    }
  }

  customers(): MockCustomer[] {
    return Array.from(this.customerTable.values());
  }

  getCustomer(id: string): MockCustomer | null {
    return clone(this.customerTable.get(id) || null);
  }

  saveCustomer(id: string, data: Partial<MockCustomer> | null) {
    this.applyCustomer(id, data);
    this.overlay.customers.push({ id, data: clone(data) });
    this.changed();
  }

  /** Bulk update of the in-memory customer table without persisting each row (used for sales-person mapping). */
  saveCustomers(updates: { id: string; data: Partial<MockCustomer> }[]) {
    updates.forEach((u) => {
      this.applyCustomer(u.id, u.data);
      this.overlay.customers.push({ id: u.id, data: clone(u.data) });
    });
    this.changed();
  }
}
