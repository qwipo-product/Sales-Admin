// Source: main.0ad03de76494ddf1.js webpack module 9143, export `gy` (class concatenated into the services barrel).
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LocalStoreService {
  private ls = window.localStorage;

  constructor() {}

  /** JSON.stringify()s the value. Always returns true. */
  public setItem(key: string, value: any): boolean {
    value = JSON.stringify(value);
    this.ls.setItem(key, value);
    return true;
  }

  /** JSON.parse()s the stored value; returns null on parse failure. */
  public getItem(key: string): any {
    const value = this.ls.getItem(key);
    try {
      return JSON.parse(value as string);
    } catch (e) {
      return null;
    }
  }

  public removeItem(key: string): void {
    this.ls.removeItem(key);
  }

  public clear(): void {
    this.ls.clear();
  }
}
