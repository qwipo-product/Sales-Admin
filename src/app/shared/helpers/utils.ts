// Source: main.0ad03de76494ddf1.js webpack module 1972 (shared helper functions, used by main + lazy chunks).
// Export-letter -> function (names are inferred; bodies are exact):
//   h4 generateAreaId            wR generateMessageQueueStatusId  OQ isValidMobileNumber   M8 generateUUID
//   Iq arrayToObject             Ip getStatusList                 oc getLastOrderDaysList  yR getCustomerStatusList
//   O3 getBusinessTypeList       G4 getMonthList                  sv getClusterTypeName    Ah getBusinessTypesByClusterType
//   vM groupBy                   rV generateSearchKey             HG isValidAreaName       VT formatDates
//   uO toTimestamp               fm capitalizeFirstLetter         rz isValidGeoJsonFile    v6 convertKeysToLowerCase
//   F3 chunkArray                fD convertToLatLng               N9 showWarning           i$ formatDateTime
//   d6 millisecondsToMinutes     Vl getNumberRange                TY generateAttendanceId  bW isValidPinCode
//   H6 restrictMaxLength
import { FormGroup } from '@angular/forms';
import Swal from 'sweetalert2';

const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** "AREA" + 10 random alphanumerics. */
export function generateAreaId(): string {
  let id = 'AREA';
  for (let i = 0; i < 10; i++) {
    id += ALPHANUMERIC.charAt(Math.floor(Math.random() * 62));
  }
  return id;
}

/** "MESQU" + 10 random alphanumerics (MessageQueueStatus doc id). */
export function generateMessageQueueStatusId(): string {
  let id = 'MESQU';
  for (let i = 0; i < 10; i++) {
    id += ALPHANUMERIC.charAt(Math.floor(Math.random() * 62));
  }
  return id;
}

export function isValidMobileNumber(mobileNumber: any): boolean {
  return /^\d{10}$/.test(mobileNumber) && mobileNumber.toString().length == 10;
}

/** xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (random hex, not RFC4122-versioned). */
export function generateUUID(): string {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

export function arrayToObject<T = any>(array: T[], key = 'id'): Record<string, T> {
  return array.reduce((obj: any, item: any) => {
    obj[item[key]] = item;
    return obj;
  }, {});
}

export function getStatusList() {
  return [
    { name: 'Active', status: true, isSelected: true, value: 1 },
    { name: 'InActive', status: false, isSelected: false, value: 0 },
  ];
}

export function getLastOrderDaysList() {
  return [
    { name: '0-7 Days', isSelected: true, value: '0-7' },
    { name: '8-30 Days', isSelected: false, value: '8-30' },
    { name: '31-60 Days', isSelected: false, value: '31-60' },
    { name: '61-90 Days', isSelected: false, value: '61-90' },
    { name: '91-365 Days', isSelected: false, value: '91-365' },
    { name: '365+ Days', isSelected: false, value: '365+' },
  ];
}

export function getCustomerStatusList() {
  return [
    { name: 'Lost', isSelected: false, value: 1 },
    { name: 'Lost-Not-Interested', isSelected: false, value: 2 },
    { name: 'Business-Shutdown', isSelected: false, value: 3 },
    { name: 'Internal-User', isSelected: false, value: 4 },
    { name: 'Active-User', isSelected: true, value: 5 },
    { name: 'Duplicate', isSelected: false, value: 6 },
    { name: 'Temporary-Shutdown', isSelected: false, value: 7 },
    { name: 'Distributor-Sales', isSelected: false, value: 8 },
    { name: 'KYC-Pending', isSelected: false, value: 9 },
    { name: 'KYC-Review', isSelected: false, value: 10 },
    { name: 'KYC-Rejected', isSelected: false, value: 11 },
    { name: 'None', isSelected: false, value: 99 },
  ];
}

export function getBusinessTypeList() {
  return [
    { name: 'Kirana', isSelected: false, value: 'Kirana' },
    { name: 'Restaurant', isSelected: false, value: 'Restaurant' },
    { name: 'Caterers', isSelected: false, value: 'Caterers' },
    { name: 'TiffinCenters', isSelected: false, value: 'TiffinCenters' },
    { name: 'PG/Hostel', isSelected: false, value: 'PgHostel' },
    { name: 'Institutional', isSelected: false, value: 'Institutional' },
    { name: 'Bakery', isSelected: false, value: 'Bakery' },
    { name: 'Sweet House', isSelected: false, value: 'SweetHouse' },
    { name: 'Vegetable shops', isSelected: false, value: 'VegetableShops' },
    { name: 'Tier2Customer', isSelected: false, value: 'Tier2Customer' },
    { name: 'Medicals', isSelected: false, value: 'Medicals' },
    { name: 'chemist', isSelected: false, value: 'Chemist' },
    { name: 'cosmetic', isSelected: false, value: 'Cosmetic' },
    { name: 'supermarket', isSelected: false, value: 'Supermarket' },
    { name: 'Wholesale', isSelected: false, value: 'Wholesale' },
    { name: 'Rice Traders', isSelected: false, value: 'RiceTraders' },
    { name: 'Oil Traders', isSelected: false, value: 'OilTraders' },
    { name: 'Others', isSelected: false, value: 'Others' },
    { name: 'None', isSelected: false, value: 'None' },
  ];
}

export function getMonthList() {
  return [
    { name: 'January', isSelected: false, value: 'january' },
    { name: 'February', isSelected: false, value: 'february' },
    { name: 'March', isSelected: false, value: 'march' },
    { name: 'April', isSelected: false, value: 'april' },
    { name: 'May', isSelected: false, value: 'may' },
    { name: 'June', isSelected: false, value: 'june' },
    { name: 'July', isSelected: false, value: 'july' },
    { name: 'August', isSelected: false, value: 'august' },
    { name: 'September', isSelected: false, value: 'september' },
    { name: 'October', isSelected: false, value: 'october' },
    { name: 'November', isSelected: false, value: 'november' },
    { name: 'December', isSelected: false, value: 'december' },
  ];
}

/** ClusterType -> name (1 general, 2 wholesale; default 'general'). */
export function getClusterTypeName(type: number): string {
  const names: Record<number, string> = { 1: 'general', 2: 'wholesale' };
  return names[type] || 'general';
}

/** ClusterType -> allowed BusinessType values (NB: falls back to the STRING 'general' as shipped). */
export function getBusinessTypesByClusterType(type: number): number[] | string {
  const map: Record<number, number[]> = {
    1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 99],
    2: [16],
  };
  return map[type] || 'general';
}

/** Groups items by item[key]; returns an array of groups (Map insertion order). */
export function groupBy<T = any>(list: T[], key: string): T[][] {
  let map = new Map<any, T[]>();
  map = new Map(Array.from(list, (item: any) => [item[key], []]));
  list.forEach((item: any) => map.get(item[key])!.push(item));
  return Array.from(map.values());
}

export function generateSearchKey(value: string): string {
  return value.trim().toLowerCase().replace(/ +/g, ' ');
}

export function isValidAreaName(value: string): boolean {
  const trimmed = value.trim();
  return /^(?!.* {2})[A-Za-z0-9-]+(?:[ \t]+[A-Za-z0-9-]+)*$/.test(trimmed);
}

/** Dates -> 'YYYY-MM-DD' strings. */
export function formatDates(dates: any[]): string[] {
  return dates.map((d) => {
    const date = new Date(d);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date
      .getDate()
      .toString()
      .padStart(2, '0')}`;
  });
}

/** new Date(value).getTime() – used with 'YYYY-MM-DD 00:00:00' / '... 23:59:59' strings. */
export function toTimestamp(value: any): number {
  return new Date(value).getTime();
}

export function capitalizeFirstLetter(value: string): string {
  return value && value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts[parts.length - 1];
}

export function isValidGeoJsonFile(fileName: string): boolean {
  const ext = getFileExtension(fileName);
  return ext.toLowerCase() === 'geojson' || ext.toLowerCase() === 'json';
}

export function convertKeysToLowerCase(obj: any = {}): any {
  if (obj === null || typeof obj !== 'object') return obj;
  const result: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) result[key.toLowerCase()] = obj[key];
  }
  return result;
}

export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
  return chunks;
}

/** GeoJSON [lng, lat] pairs -> { latitude, longitude }. */
export function convertToLatLng(coordinates: [number, number][]): { latitude: number; longitude: number }[] {
  return coordinates.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
}

/**
 * Shows a SweetAlert2 warning and RETURNS (does not throw) an Error.
 * NB: Swal.fire(title, html, icon) is called with title 'warning', text = message.
 */
export function showWarning(message: string): Error {
  Swal.fire('warning', message, 'warning');
  return new Error(message);
}
/** Integration aliases for showWarning (feature reconstructions used different names for export N9). */
export const warningError = showWarning;
export const showWarningAlert = showWarning;

/** 'YYYY-MM-DD HH:mm' */
export function formatDateTime(value: any): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(
    2,
    '0',
  )} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function millisecondsToMinutes(ms: number): number {
  return Math.floor(ms / 60000);
}

/** Inclusive integer range [start..end]. */
export function getNumberRange(start: number, end: number): number[] {
  const range: number[] = [];
  for (let i = start; i <= end; i++) range.push(i);
  return range;
}

/** 'ATD' + 14 random digits (AttendanceReport doc id). */
export function generateAttendanceId(): string {
  function randomDigits() {
    let digits = '';
    for (let i = 0; i < 14; i++) digits += '0123456789'.charAt(Math.floor(Math.random() * 10));
    return digits;
  }
  return `ATD${randomDigits()}`;
}

export function isValidPinCode(value: any): boolean {
  return value.toString().length === 6 && /^\d{6}$/.test(value.toString());
}

export interface MaxLengthRule {
  property: string;
  maxLength: number;
}

/** Truncates the listed form controls' values to maxLength on every valueChanges (emitEvent:false). */
export function restrictMaxLength(form: FormGroup, rules: MaxLengthRule[]): void {
  for (const rule of rules) {
    const control = form.get(rule.property);
    if (control) {
      control.valueChanges.subscribe((value) => {
        const maxLength = rule.maxLength;
        if (value && value.toString().length > maxLength) {
          const truncated = value.toString().slice(0, maxLength);
          // keep number inputs numeric (the original turned them into strings)
          control.setValue(typeof value === 'number' ? Number(truncated) : truncated, { emitEvent: false });
        }
      });
    }
  }
}
