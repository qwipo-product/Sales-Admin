// Source: main.0ad03de76494ddf1.js webpack module 2937 (export `Y`; re-exported by the services barrel as `Yf`).
// Method names are exact (not minified); parameter names are inferred.
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom, lastValueFrom, map } from 'rxjs';
import { DbCollections } from '../constants/db-collections';
import { chunkArray, generateAttendanceId, toTimestamp } from '../helpers/utils';
import { AttendanceStatus, FirestoreOperator, MessageQueueStatus } from '../models/enums';
import { FirestoreFilter } from '../models/firestore-filter.model';
import {
  Cluster,
  MappedSalesPersonFromCluster,
  SalesPersonReport,
  SalesPersonRow,
  WorkingDaysMonth,
} from '../models/sales-person.model';
import { ConfigService } from './config.service';
import { FirebaseDbService } from './firebase-db.service';
import { FirestoreService } from './firestore.service';

@Injectable({
  providedIn: 'root',
})
export class SalesPersonService {
  constructor(
    private firestoreService: FirestoreService,
    private fireBaseService: FirebaseDbService,
    private http: HttpClient,
    private configService: ConfigService,
  ) {}

  // ---------------------------------------------------------------------------------------------------------------
  // Clusters (Firestore `SalesPersonClusters`, sub-collection `Customers`)
  // ---------------------------------------------------------------------------------------------------------------

  mapToCluster(data: any): any {
    return Array.isArray(data)
      ? data
          .map(
            (item: any): Cluster => ({
              id: item.id,
              name: item.name,
              type: item.type,
              searchKey: item.searchKey,
              customerCount: item.customerCount || 0,
              coordinates: item.coordinates,
              createdDate: item.createdDate,
              updatedDate: item.updatedDate,
              customers: item.customers,
            }),
          )
          .sort((a: Cluster, b: Cluster) => b.customerCount - a.customerCount)
      : ({
          id: data.id,
          name: data.name,
          type: data.type,
          searchKey: data.searchKey,
          customerCount: data.customerCount,
          coordinates: data.coordinates,
          createdDate: data.createdDate,
          updatedDate: data.updatedDate,
          customers: data.customers,
        } as Cluster);
  }

  async getAllClusters(): Promise<Cluster[]> {
    const clusters = await this.firestoreService.fetchCollection(DbCollections.SALES_PERSON_CLUSTERS);
    return this.mapToCluster(clusters);
  }

  async getCluster(clusterId: string): Promise<Cluster> {
    const cluster = await this.firestoreService.fetchDocument(DbCollections.SALES_PERSON_CLUSTERS, clusterId);
    if (cluster) return this.mapToCluster(cluster);
    throw new Error('No such document!');
  }

  async createCluster(cluster: any) {
    return await this.firestoreService.insertDocWithId(DbCollections.SALES_PERSON_CLUSTERS, cluster.id, cluster);
  }

  async updateCluster(clusterId: string, data: any) {
    return await this.firestoreService.updateDocument(DbCollections.SALES_PERSON_CLUSTERS, clusterId, data);
  }

  async getClusterCustomers(clusterId: string) {
    return await this.firestoreService.fetchSubCollection(
      DbCollections.SALES_PERSON_CLUSTERS,
      clusterId,
      DbCollections.CUSTOMERS,
    );
  }

  async getClusterCustomersIds(clusterId: string) {
    return await this.firestoreService.fetchSubCollectionDocIds(
      DbCollections.SALES_PERSON_CLUSTERS,
      clusterId,
      DbCollections.CUSTOMERS,
    );
  }

  async deleteCluster(clusterId: string) {
    return await this.firestoreService.deleteDoc(DbCollections.SALES_PERSON_CLUSTERS, clusterId);
  }

  /** Removes the `customers` FIELD of the cluster doc (deleteField). */
  async deleteClusterCustomers(clusterId: string) {
    return await this.firestoreService.deleteFieldDoc(DbCollections.SALES_PERSON_CLUSTERS, clusterId, 'customers');
  }

  async addCustomersToClusterInBatches(clusterId: string, customers: any[]) {
    return this.firestoreService.writeDataToSubCollectionInBatches(
      DbCollections.SALES_PERSON_CLUSTERS,
      clusterId,
      DbCollections.CUSTOMERS,
      customers,
    );
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Sales persons (Firestore `SalesPerson`, RTDB `Customer/{id}`)
  // ---------------------------------------------------------------------------------------------------------------

  mapToSalesPerson(data: any[] = []): SalesPersonRow[] {
    return data
      .map((item: any) => ({
        name: item.name || '',
        mobileNumber: item.mobileNumber || '',
        id: item.id || '',
        businessName: item.businessName || '',
        isActive: item.isActive || false,
        areaName: (item.cluster && item.cluster.name) || '',
        areaId: (item.cluster && item.cluster.id) || '',
        area: item.cluster || {},
        customerCount: item.customerCount || 0,
        salesLeadId: item.salesLeadId || '',
        salesLeadName: (item.salesLead && item.salesLead.name) || '',
        salesLeadMobileNumber: (item.salesLead && item.salesLead.mobileNumber) || '',
        salesManagerId: item.salesManagerId || '',
        salesManagerName: (item.salesManager && item.salesManager.name) || '',
        salesManagerMobileNumber: (item.salesManager && item.salesManager.mobileNumber) || '',
        enableLogOut: (item.enableLogOut && item.enableLogOut) || false,
      }))
      .sort((a, b) => b.customerCount - a.customerCount);
  }

  async getSalesPersons(): Promise<SalesPersonRow[]> {
    const salesPersons = await this.firestoreService.fetchCollection(DbCollections.SALES_PERSON);
    return this.mapToSalesPerson(salesPersons);
  }

  async createSalesPersons(salesPersonId: string, data: any): Promise<void> {
    await this.firestoreService.insertDocWithId(DbCollections.SALES_PERSON, salesPersonId, data);
  }

  async getSalesPersonById(salesPersonId: string) {
    return await this.firestoreService.fetchDocument(DbCollections.SALES_PERSON, salesPersonId);
  }

  /** First SalesPerson whose clusterId == clusterId. */
  async getSalesPersonByClusterId(clusterId: string) {
    const filters: FirestoreFilter[] = [
      { fieldName: 'clusterId', fieldValue: clusterId, operator: FirestoreOperator.EqualTo },
    ];
    const result = await this.firestoreService.queryCollectionByFilters(DbCollections.SALES_PERSON, filters);
    return result && result[0];
  }

  /** clusterId `in` queries in chunks of 10, flattened. */
  async getSalesPersonsByClusterIds(clusterIds: string[]): Promise<any[]> {
    const chunks = chunkArray(clusterIds, 10);
    const results = await Promise.all(
      chunks.map(async (chunk) => {
        const filters: FirestoreFilter[] = [
          { fieldName: 'clusterId', fieldValue: chunk, operator: FirestoreOperator.In },
        ];
        return (await this.firestoreService.queryCollectionByFilters(DbCollections.SALES_PERSON, filters)) || [];
      }),
    );
    return results.flat();
  }

  async getMappedSalesPersonFromClusterIds(clusterIds: string[]): Promise<MappedSalesPersonFromCluster[]> {
    const salesPersons = await this.getSalesPersonsByClusterIds(clusterIds);
    return salesPersons.map((sp: any) => ({
      salesPersonName: sp.businessName,
      salesPersonId: sp.id,
      clusterName: sp.cluster.name,
      clusterId: sp.cluster.id,
    }));
  }

  /** Writes the same payload to RTDB `Customer/{id}` (update) and Firestore `SalesPerson/{id}`. */
  async updateSalesPersonStatus(salesPersonId: string, data: any) {
    await this.fireBaseService.updateData(`${DbCollections.CUSTOMER}/${salesPersonId}`, data);
    return await this.firestoreService.updateDocument(DbCollections.SALES_PERSON, salesPersonId, data);
  }

  async updateSalesPersonCluster(salesPersonId: string, data: any) {
    return await this.firestoreService.updateDocument(DbCollections.SALES_PERSON, salesPersonId, data);
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Tasks / Interactions
  // ---------------------------------------------------------------------------------------------------------------

  async getTask(taskId: string) {
    return await this.firestoreService.fetchDocument(DbCollections.TASKS_REPORT, taskId);
  }

  /** TasksReport where taskDateTimestamp in [start 00:00:00, end 23:59:59] (+ salesPersonId in ids). */
  async getTasksReportByFilter(startDate: string, endDate: string, salesPersonIds: string[] = []) {
    try {
      const start = toTimestamp(`${startDate} 00:00:00`);
      const end = toTimestamp(`${endDate} 23:59:59`);
      const filters: FirestoreFilter[] = [
        { fieldName: 'taskDateTimestamp', operator: FirestoreOperator.GreaterThanOrEqualTo, fieldValue: start },
        { fieldName: 'taskDateTimestamp', operator: FirestoreOperator.LessThanOrEqualTo, fieldValue: end },
      ];
      if (salesPersonIds.length > 0) {
        filters.push({ fieldName: 'salesPersonId', operator: FirestoreOperator.In, fieldValue: salesPersonIds });
      }
      return await this.firestoreService.queryCollectionByFilters(DbCollections.TASKS_REPORT, filters);
    } catch (error) {
      console.log('getTasksReportByFilter', error);
      throw error;
    }
  }

  /** Same as getTasksReportByFilter but on the `Tasks` collection (log label copied as shipped). */
  async getTasksByFilter(startDate: string, endDate: string, salesPersonIds: string[] = []) {
    try {
      const start = toTimestamp(`${startDate} 00:00:00`);
      const end = toTimestamp(`${endDate} 23:59:59`);
      const filters: FirestoreFilter[] = [
        { fieldName: 'taskDateTimestamp', operator: FirestoreOperator.GreaterThanOrEqualTo, fieldValue: start },
        { fieldName: 'taskDateTimestamp', operator: FirestoreOperator.LessThanOrEqualTo, fieldValue: end },
      ];
      if (salesPersonIds.length > 0) {
        filters.push({ fieldName: 'salesPersonId', operator: FirestoreOperator.In, fieldValue: salesPersonIds });
      }
      return await this.firestoreService.queryCollectionByFilters(DbCollections.TASKS, filters);
    } catch (error) {
      console.log('getTasksReportByFilter', error);
      throw error;
    }
  }

  /**
   * Interactions page of 50 ordered by createdTimeStamp.
   *  - isNext:      range [start-of-startDate, lastTimestamp], desc
   *  - isPrevious:  range [firstTimestamp, end-of-endDate], asc
   *  - otherwise:   range [start-of-startDate, end-of-endDate], desc
   * mobileNumber (string, `.length` read) filters customerInfo.mobileNumber == mobileNumber.
   */
  async getInteractionsByFilters(
    startDate: string,
    endDate: string,
    salesPersonIds: string[] = [],
    mobileNumber: string,
    lastTimestamp?: number,
    isNext?: boolean,
    firstTimestamp?: number,
    isPrevious?: boolean,
  ): Promise<any[]> {
    const start = toTimestamp(`${startDate} 00:00:00`);
    const end = toTimestamp(`${endDate} 23:59:59`);
    let filters: FirestoreFilter[] = [];
    filters = isNext
      ? [
          { fieldName: 'createdTimeStamp', operator: FirestoreOperator.GreaterThanOrEqualTo, fieldValue: start },
          // exclusive bound: the last row of the current page must not be repeated on the next page
          { fieldName: 'createdTimeStamp', operator: FirestoreOperator.LessThan, fieldValue: lastTimestamp },
        ]
      : isPrevious
        ? [
            // exclusive bound: the first row of the current page must not be repeated on the previous page
            { fieldName: 'createdTimeStamp', operator: FirestoreOperator.GreaterThan, fieldValue: firstTimestamp },
            { fieldName: 'createdTimeStamp', operator: FirestoreOperator.LessThanOrEqualTo, fieldValue: end },
          ]
        : [
            { fieldName: 'createdTimeStamp', operator: FirestoreOperator.GreaterThanOrEqualTo, fieldValue: start },
            { fieldName: 'createdTimeStamp', operator: FirestoreOperator.LessThanOrEqualTo, fieldValue: end },
          ];
    if ((mobileNumber || '').length > 0) {
      filters.push({ fieldName: 'customerInfo.mobileNumber', operator: FirestoreOperator.EqualTo, fieldValue: mobileNumber });
    }
    if ((salesPersonIds || []).length > 0) {
      filters.push({ fieldName: 'salesPersonId', operator: FirestoreOperator.In, fieldValue: salesPersonIds });
    }
    return (
      (await this.firestoreService.queryNextPage(DbCollections.INTERACTIONS, filters, 'createdTimeStamp', 50, isPrevious)) ||
      []
    );
  }

  /** All interactions for the range (no paging) – used for Excel export. */
  async downloadInteractionsByFilters(
    startDate: string,
    endDate: string,
    salesPersonIds: string[] = [],
    mobileNumber: string,
  ): Promise<any[]> {
    const start = toTimestamp(`${startDate} 00:00:00`);
    const end = toTimestamp(`${endDate} 23:59:59`);
    const filters: FirestoreFilter[] = [
      { fieldName: 'createdTimeStamp', operator: FirestoreOperator.GreaterThanOrEqualTo, fieldValue: start },
      { fieldName: 'createdTimeStamp', operator: FirestoreOperator.LessThanOrEqualTo, fieldValue: end },
    ];
    if ((mobileNumber || '').length > 0) {
      filters.push({ fieldName: 'customerInfo.mobileNumber', operator: FirestoreOperator.EqualTo, fieldValue: mobileNumber });
    }
    if ((salesPersonIds || []).length > 0) {
      filters.push({ fieldName: 'salesPersonId', operator: FirestoreOperator.In, fieldValue: salesPersonIds });
    }
    return (await this.firestoreService.queryCollectionByFilters(DbCollections.INTERACTIONS, filters)) || [];
  }

  async getTasksByTaskDateAndSalesPerson(taskDate: string, salesPersonId: string) {
    const filters: FirestoreFilter[] = [
      { fieldName: 'taskDate', operator: FirestoreOperator.EqualTo, fieldValue: taskDate },
      { fieldName: 'salesPersonId', operator: FirestoreOperator.EqualTo, fieldValue: salesPersonId },
    ];
    return await this.firestoreService.queryCollectionByFilters(DbCollections.TASKS, filters);
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Dealers (RTDB AppSettings/common/dealerNames)
  // ---------------------------------------------------------------------------------------------------------------

  async getDealers(): Promise<any[]> {
    const dealers$ = this.fireBaseService
      .fetchDataFromNode(`${DbCollections.APP_SETTINGS}/common/dealerNames`)
      .pipe(map((data: any) => Object.keys(data).map((key) => ({ id: key, ...data[key] }))));
    // First value of the live node (the original used lastValueFrom() on a never-completing stream, so it never resolved).
    return firstValueFrom(dealers$);
  }

  getDealersObservable() {
    return this.fireBaseService
      .fetchDataFromNode(`${DbCollections.APP_SETTINGS}/common/dealerNames`)
      .pipe(map((data: any) => Object.keys(data).map((key) => ({ id: key, ...data[key] }))));
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Core REST API (coreUrl)
  // ---------------------------------------------------------------------------------------------------------------

  /** POST {coreUrl}/customer/count_by_salesperson  body = filters; returns response.data. Errors logged + swallowed. */
  async getCustomerCount(body: any = {}) {
    try {
      const url = `${this.configService.getConfig().coreUrl}/customer/count_by_salesperson`;
      const request$ = this.http.post<any>(url, body);
      return (await lastValueFrom(request$))?.data;
    } catch (error) {
      console.log('getCustomerCount error', error);
    }
  }

  /**
   * POST {coreUrl}/customer/company_share_by_salesperson body = { salespersonIds } -> data = CompanyShopShare[]
   * (Tasks tab "Company" filter). Not part of the original app: the core API needs this endpoint; the mock backend has it.
   */
  async getCompanyShopShare(salespersonIds: string[]) {
    const url = `${this.configService.getConfig().coreUrl}/customer/company_share_by_salesperson`;
    const request$ = this.http.post<any>(url, { salespersonIds });
    return (await lastValueFrom(request$))?.data;
  }

  /** PUT {coreUrl}/customer/{id} body = data. Errors are logged and rethrown (the original swallowed them). */
  async updateSalePersonDb(customerId: string, data: any) {
    try {
      const url = `${this.configService.getConfig().coreUrl}/customer/${customerId}`;
      const request$ = this.http.put(url, data);
      return await lastValueFrom(request$);
    } catch (error) {
      console.log('updateSalePersonDb error', error);
      throw error;
    }
  }

  /** POST {coreUrl}/customer/update_salesperson_ids {salesPersonIds:[id], salesPersonId:'', customerIds:[]} */
  async unMapSalesPerson(salesPersonId: string) {
    try {
      const body = { salesPersonIds: [salesPersonId], salesPersonId: '', customerIds: [] };
      const url = `${this.configService.getConfig().coreUrl}/customer/update_salesperson_ids`;
      const request$ = this.http.post<any>(url, body);
      return (await lastValueFrom(request$))?.data;
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
  }

  /** POST {coreUrl}/customer/update_salesperson_ids {salesPersonIds:[], salesPersonId:id, customerIds} */
  async mapSalesPerson(salesPersonId: string, customerIds: string[]) {
    try {
      const body = { salesPersonIds: [], salesPersonId, customerIds };
      const url = `${this.configService.getConfig().coreUrl}/customer/update_salesperson_ids`;
      const request$ = this.http.post<any>(url, body);
      return (await lastValueFrom(request$))?.data;
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Message queue status (Firestore `MessageQueueStatus`)
  // ---------------------------------------------------------------------------------------------------------------

  async getMessageQueueStatus() {
    const filters: FirestoreFilter[] = [
      { fieldName: 'status', operator: FirestoreOperator.EqualTo, fieldValue: MessageQueueStatus.Started },
    ];
    const result = await this.firestoreService.queryCollectionByFilters(DbCollections.MESSAGE_QUEUE_STATUS, filters);
    return result && result[0];
  }

  async updateStatusInMessageQueueFS(status: any) {
    return await this.firestoreService.insertDocWithId(
      DbCollections.MESSAGE_QUEUE_STATUS,
      status.messageQueueStatusId,
      status,
    );
  }

  async getInteraction(interactionId: string) {
    return await this.firestoreService.fetchDocument(DbCollections.INTERACTIONS, interactionId);
  }

  async updateSalesPerson(salesPersonId: string, data: any) {
    return await this.firestoreService.updateDocument(DbCollections.SALES_PERSON, salesPersonId, data);
  }

  async updateSalesPersonProfile(salesPersonId: string, data: any) {
    return await this.firestoreService.updateDocument(DbCollections.SALES_PERSON, salesPersonId, data);
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Attendance / leave (Firestore `AttendanceReport`, `LeaveReport`, `Calendar`)
  // ---------------------------------------------------------------------------------------------------------------

  /** createdTimeStamp in [start 00:00:00, end 23:59:59] (+ salesPersonId in ids, + salesLeadId in ids). */
  async getDetails(
    collectionName: string,
    startDate: string,
    endDate: string,
    salesPersonIds: string[] = [],
    salesLeadIds: string[] = [],
  ) {
    const start = toTimestamp(`${startDate} 00:00:00`);
    const end = toTimestamp(`${endDate} 23:59:59`);
    const filters: FirestoreFilter[] = [
      { fieldName: 'createdTimeStamp', operator: FirestoreOperator.GreaterThanOrEqualTo, fieldValue: start },
      { fieldName: 'createdTimeStamp', operator: FirestoreOperator.LessThanOrEqualTo, fieldValue: end },
    ];
    if (salesPersonIds.length > 0) {
      filters.push({ fieldName: 'salesPersonId', operator: FirestoreOperator.In, fieldValue: salesPersonIds });
    }
    if (salesLeadIds.length > 0) {
      filters.push({ fieldName: 'salesLeadId', operator: FirestoreOperator.In, fieldValue: salesLeadIds });
    }
    return await this.firestoreService.queryCollectionByFilters(collectionName, filters);
  }

  async getAttendanceDetails(startDate: string, endDate: string, salesPersonIds: string[] = [], salesLeadIds: string[] = []) {
    return await this.getDetails(DbCollections.ATTENDANCE_REPORT, startDate, endDate, salesPersonIds, salesLeadIds);
  }

  async getLeaveDetails(startDate: string, endDate: string, salesPersonIds: string[] = [], salesLeadIds: string[] = []) {
    return await this.getDetails(DbCollections.LEAVE_REPORT, startDate, endDate, salesPersonIds, salesLeadIds);
  }

  /** When accepting an early logout, stamps checkOutTime = Date.now() before updating. */
  async updateAttendanceStatus(attendanceId: string, data: any) {
    if (data.status === AttendanceStatus.REASON_FOR_EARLY_LOGOUT_ACCEPTED) {
      data.checkOutTime = Date.now();
      return await this.firestoreService.updateDocument(DbCollections.ATTENDANCE_REPORT, attendanceId, data);
    }
    return await this.firestoreService.updateDocument(DbCollections.ATTENDANCE_REPORT, attendanceId, data);
  }

  /** On LEAVE_ACCEPTED also inserts an AttendanceReport doc built from the leave. */
  async updateLeaveStatus(leaveId: string, data: any) {
    if (data.status === AttendanceStatus.LEAVE_ACCEPTED) {
      const attendance = await this.createLeaveReportFromId(leaveId);
      await this.firestoreService.insertDocWithId(DbCollections.ATTENDANCE_REPORT, attendance.id, attendance);
    }
    return await this.firestoreService.updateDocument(DbCollections.LEAVE_REPORT, leaveId, data);
  }

  async createLeaveReportFromId(leaveId: string) {
    const leave = await this.getLeaveReport(leaveId);
    return {
      id: generateAttendanceId(),
      leaveId,
      createdDate: leave.appliedOn,
      status: AttendanceStatus.LEAVE_ACCEPTED,
      salesPersonId: leave.salesPersonId,
      createdTimeStamp: leave.createdTimeStamp,
    };
  }

  async getLeaveReport(leaveId: string) {
    return await this.firestoreService.fetchDocument(DbCollections.LEAVE_REPORT, leaveId);
  }

  async getAttendanceReport(startDate: string, endDate: string, salesPersonIds: string[] = []) {
    return await this.getDetails(DbCollections.ATTENDANCE_REPORT, startDate, endDate, salesPersonIds, []);
  }

  /** salesPersonId == id AND createdTimeStamp in range; returns [] on error. */
  async getFilteredCollection(salesPersonId: string, startDate: string, endDate: string, collectionName: string) {
    try {
      const start = toTimestamp(`${startDate} 00:00:00`);
      const end = toTimestamp(`${endDate} 23:59:59`);
      const filters: FirestoreFilter[] = [
        { fieldName: 'salesPersonId', operator: FirestoreOperator.EqualTo, fieldValue: salesPersonId },
        { fieldName: 'createdTimeStamp', operator: FirestoreOperator.GreaterThanOrEqualTo, fieldValue: start },
        { fieldName: 'createdTimeStamp', operator: FirestoreOperator.LessThanOrEqualTo, fieldValue: end },
      ];
      return (await this.firestoreService.queryCollectionByFilters(collectionName, filters)) || [];
    } catch (error) {
      // Rethrown so callers can report the failure (returning [] made the Attendance Summary show people as absent).
      console.error(`Error in getFilteredCollection for ${collectionName}:`, error);
      throw error;
    }
  }

  async getAttendanceReportBySalesPersonId(salesPersonId: string, startDate: string, endDate: string) {
    return await this.getFilteredCollection(salesPersonId, startDate, endDate, DbCollections.ATTENDANCE_REPORT);
  }

  /** Firestore `Calendar/{id}` (id e.g. a year/month key) -> working-days object, or [] when missing. */
  async getCalendar(calendarId: string) {
    const calendar = await this.firestoreService.fetchDocument(DbCollections.CALENDAR, calendarId);
    return calendar ? this.mapToWorkingDays(calendar) : [];
  }

  mapToWorkingDays(data: any): WorkingDaysMonth | WorkingDaysMonth[] {
    return Array.isArray(data)
      ? data.map((item: any) => ({
          month: item.month,
          workingDays: item.workingDays,
          monthName: item.monthName,
          days: item.days,
          year: item.year,
        }))
      : { month: data.month, workingDays: data.workingDays, monthName: data.monthName, days: data.days, year: data.year };
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Performance report (Cloud Function getSalesPersonReport)
  // ---------------------------------------------------------------------------------------------------------------

  /**
   * POST {cloudFunctionsUrl}/getSalesPersonReport with header No-Auth:true (TokenInterceptor strips it and does NOT
   * add a Bearer token). Response `{ response: { daily: [...], monthly: [...] } }` is enriched with teamLeadName /
   * areaName from getSalesPersons() and mapped to 5 report tables.
   */
  async getSalesPersonsReport(body: any): Promise<SalesPersonReport | {}> {
    try {
      const url = `${this.configService.getConfig().cloudFunctionsUrl}/getSalesPersonReport`;
      const request$ = this.http.post<any>(url, body, { headers: new HttpHeaders().set('No-Auth', 'true') });
      const result = await lastValueFrom(request$);
      if (result && result.response) {
        const salesPersons = await this.getSalesPersons();
        const enriched = this.mapSalesLeadName(salesPersons, result.response);
        return this.mapData(enriched);
      }
      return {};
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
  }

  mapData(data: any): SalesPersonReport {
    return {
      mtdRevenueReport: this.mapMTDRevenueReport(data.monthly),
      dailyPerformanceIncentiveReport: this.mapDailyPerformanceIncentiveReport(data.daily),
      dailyCustomersReport: this.mapDailyCustomerReport(data.daily),
      monthlyCustomerReport: this.mapMonthlyCustomerReport(data.monthly),
      monthlyIncentiveReport: this.mapMonthlyIncentiveReport(data.monthly),
    };
  }

  mapMTDRevenueReport(rows: any[]) {
    return rows.map((row) => ({
      'SalesPerson Id': row.salesPersonId || '',
      'TL Name': row.teamLeadName || '',
      'BA Name': row.salesPersonName,
      Area: row.areaName,
      'Buying Target': row.monthProductivityTarget,
      'Buying Achieved': row.monthProductivityCount,
      'Buying Achieved %': row.productivityPercent,
      'Revenue Target': row.monthOverallRevenueTarget,
      'Revenue Achieved': row.monthOverallRevenue,
      'Revenue Achieved %': row.overallRevenuePercent,
      'FMCG Revenue Target': row.monthFMCGRevenueTarget,
      'FMCG Revenue Achieved': row.monthFMCGRevenue,
      'FMCG Revenue Achieved %': row.fmcgRevenuePercent,
      'Today Target': row.todayTarget,
    }));
  }

  mapMonthlyIncentiveReport(rows: any[]) {
    return rows.map((row) => ({
      'SalesPerson Id': row.salesPersonId || '',
      'TL Name': row.teamLeadName || '',
      'BA Name': row.salesPersonName,
      'Monthly Buying Customer Count Incentive': row.monthProductivityIncentive,
      'Monthly Revenue Incentive': row.monthOverallRevenueIncentive,
      'Monthly FMCG Revenue Incentive': row.monthFMCGRevenueIncentive,
      'Daily FMCG Line Items Incentive': row.monthDailyFMCGLineItemsIncentive,
      'Daily Productivity Incentive': row.monthDailyProductivityIncentive,
    }));
  }

  mapMonthlyCustomerReport(rows: any[]) {
    return rows.map((row) => ({
      'SalesPerson Id': row.salesPersonId || '',
      'TL Name': row.teamLeadName || '',
      'BA Name': row.salesPersonName,
      'Sales Person Assigned': row.monthSalesPersonAssigned,
      'Self Order Assigned': row.monthSelfOrderAssigned,
      'Sales Person UnAssigned': row.monthSalesPersonUnAssigned,
      'Self Order UnAssigned': row.monthSelfOrderUnAssigned,
      'Sales Person Assigned Revenue': row.monthSalesPersonAssignedRevenue,
      'Self Order Assigned Revenue': row.monthSelfOrderAssignedRevenue,
      'Sales Person UnAssigned Revenue': row.monthSalesPersonUnAssignedRevenue,
      'Self Order UnAssigned Revenue': row.monthSelfOrderUnAssignedRevenue,
    }));
  }

  mapDailyPerformanceIncentiveReport(rows: any[]) {
    return rows.map((row) => ({
      'SalesPerson Id': row.salesPersonId || '',
      'TL Name': row.teamLeadName || '',
      'BA Name': row.salesPersonName,
      Tasks: row.tasksCount,
      Achieved: row.achievedTasksCount,
      'Achieved %': row.tasksPercent,
      'Productivity Count': row.productivityCount,
      'Productivity Revenue': row.productivityRevenue,
      'AVG Bill Value': row.avgOrderValue,
      'FMCG Orders': row.fmcgOrders,
      'Productivity Incentive': row.productivityIncentive,
      'FMCG LineItems Incentive': row.fmcgLineItemsIncentive,
    }));
  }

  mapDailyCustomerReport(rows: any[]) {
    return rows.map((row) => ({
      'SalesPerson Id': row.salesPersonId || '',
      'TL Name': row.teamLeadName || '',
      'BA Name': row.salesPersonName,
      'Sales Person Assigned': row.salesPersonAssigned,
      'Self Order Assigned': row.selfOrderAssigned,
      'Sales Person UnAssigned': row.salesPersonUnAssigned,
      'Self Order UnAssigned': row.selfOrderUnAssigned,
      'Sales Person Assigned Revenue': row.salesPersonAssignedRevenue,
      'Self Order Assigned Revenue': row.selfOrderAssignedRevenue,
      'Sales Person UnAssigned Revenue': row.salesPersonUnAssignedRevenue,
      'Self Order UnAssigned Revenue': row.selfOrderUnAssignedRevenue,
    }));
  }

  /** Adds teamLeadName (salesLeadName) and areaName (area.name) to every daily/monthly row. Mutates `report`. */
  mapSalesLeadName(salesPersons: SalesPersonRow[], report: any) {
    const enrich = (rows: any[]) =>
      rows.map((row) => {
        const salesPerson = salesPersons.find((sp) => sp.id === row.salesPersonId);
        const teamLeadName = salesPerson?.salesLeadName ?? '';
        const areaName = salesPerson?.area?.name ?? '';
        return { ...row, teamLeadName, areaName };
      });
    report.daily = enrich(report.daily);
    report.monthly = enrich(report.monthly);
    return report;
  }
}
