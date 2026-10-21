// Answers the app's REST calls (core API, cloud functions, auth service, message queue) from MockDatabase when
// config.json has `"env": "mock"`. In any other environment every request passes straight through.
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { ConfigService } from 'app/shared/services/config.service';
import { MockDatabase } from './mock-database';
import { MOCK_COMPANIES, MockCustomer, keyedRandom, ymd } from './mock-seed';

type Ring = number[][];

function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function orderStatusMatches(days: number, buckets: string[]): boolean {
  return buckets.some((bucket) => {
    if (bucket === '365+') return days > 365;
    const [min, max] = bucket.split('-').map(Number);
    return days >= min && days <= max;
  });
}

@Injectable()
export class MockBackendInterceptor implements HttpInterceptor {
  private db = MockDatabase.instance;

  constructor(private configService: ConfigService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const config = this.configService.getConfig();
    if (!config || config.env !== 'mock') {
      return next.handle(request);
    }
    const url = request.url;
    const body = request.body || {};
    const base = (value?: string) => (value ? value.replace(/\/$/, '') : '__none__');
    const core = base(config.coreUrl);
    const coreApi = base(config.coreApiUrl);
    const functions = base(config.cloudFunctionsUrl);
    const auth = base(config.authServiceApiUrl);
    const messaging = base(config.messagingServiceUrl);

    try {
      if (url.startsWith(auth)) {
        return this.ok({ success: true, data: { token: `mock-api-token-${Date.now()}` } });
      }
      if (url === `${functions}/revoke_user_token_uid`) {
        return this.ok({ success: true });
      }
      if (url === `${functions}/getSalesPersonReport`) {
        return this.ok({ response: this.salesPersonReport(body.taskDate, body.salesPersonIds || []) }, 700);
      }
      if (url === `${core}/customer/customers_by_geojson`) {
        return this.ok({ success: true, data: this.customersByGeoJson(body) }, 500);
      }
      if (url === `${core}/customer/update_salesperson_ids`) {
        return this.ok({ success: true, data: this.updateSalesPersonIds(body) });
      }
      if (url === `${core}/customer/count_by_salesperson`) {
        return this.ok({ success: true, data: this.countBySalesPerson(body) }, 500);
      }
      if (url === `${core}/customer/company_share_by_salesperson`) {
        return this.ok({ success: true, data: this.companyShareBySalesPerson(body) }, 300);
      }
      if (url === `${core}/customer` && request.method === 'POST') {
        return this.ok({ success: true, data: [this.createCoreCustomer(body)] });
      }
      const customerMatch = url.match(/\/(?:api\/)?customer\/([^/]+)$/i);
      if (url.startsWith(core) && customerMatch) {
        const id = decodeURIComponent(customerMatch[1]);
        if (request.method === 'GET') {
          return this.ok({ success: true, data: this.db.getCustomer(id) });
        }
        if (request.method === 'PUT') {
          this.db.saveCustomer(id, this.fromCoreBody(body));
          return this.ok({ success: true, data: this.db.getCustomer(id) });
        }
      }
      if (url === `${coreApi}/Customer/get_customers_by_sales_person`) {
        return this.ok({ success: true, data: this.customersBySalesPerson(body) });
      }
      if (url === `${coreApi}/Customer/export_customers_by_filters`) {
        const rows = this.customersBySalesPerson({ ...body, pageNumber: 1, pageSize: 100000 }).customers;
        const csv = ['Id,Business Name,Mobile Number,Area'].concat(rows.map((c: MockCustomer) => `${c.id},${c.businessName},${c.mobileNumber},${c.areaName}`));
        return this.ok(new Blob([csv.join('\n')], { type: 'text/csv' }));
      }
      if (url.startsWith(messaging)) {
        this.handleMessage(body);
        return this.ok({ success: true });
      }
    } catch (error) {
      console.error('Mock backend error', error);
      return throwError(() => error);
    }
    return next.handle(request);
  }

  private ok(body: any, ms = 250): Observable<HttpEvent<any>> {
    return of(new HttpResponse({ status: 200, body })).pipe(delay(ms));
  }

  // ------------------------------------------------------------------------------------------- core customers
  private fromCoreBody(body: any): Partial<MockCustomer> {
    const data: Partial<MockCustomer> = {};
    if (body.name !== undefined) data.customerName = body.name;
    if (body.business_name !== undefined) data.businessName = body.business_name;
    if (body.businessName !== undefined) data.businessName = body.businessName;
    if (body.mobile_number !== undefined) data.mobileNumber = String(body.mobile_number);
    return data;
  }

  /** POST {coreUrl}/customer – used by "Create Salesperson" (user_type_id 7). */
  private createCoreCustomer(body: any) {
    const id = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const address = body.address || {};
    this.db.setNode(`Customer/${id}`, {
      id,
      name: body.name || '',
      businessName: body.business_name || '',
      mobileNumber: String(body.mobile_number || ''),
      userTypeId: body.user_type_id || 7,
      isActive: body.status == 1,
      email: body.email || '',
      address,
    });
    return { id };
  }

  private ringFromGeoJson(body: any): Ring {
    const coordinates = body?.geoJson?.coordinates || [];
    const ring: Ring = Array.isArray(coordinates[0]?.[0]) ? coordinates[0] : coordinates;
    return ring.map((p: any) => (Array.isArray(p) ? [Number(p[0]), Number(p[1])] : [Number(p.longitude), Number(p.latitude)]));
  }

  private customersByGeoJson(body: any) {
    const ring = this.ringFromGeoJson(body);
    const categories: number[] = body.businessCategoryIds || [];
    if (ring.length < 3) return [];
    return this.db
      .customers()
      .filter((c) => pointInRing(c.longitude, c.latitude, ring))
      .filter((c) => categories.length === 0 || categories.includes(c.businessType))
      .map((c) => ({
        id: c.id,
        businessName: c.businessName,
        name: c.customerName,
        mobileNumber: c.mobileNumber,
        latitude: c.latitude,
        longitude: c.longitude,
        businessTypeId: c.businessType,
      }));
  }

  private updateSalesPersonIds(body: any) {
    const unmapIds: string[] = body.salesPersonIds || [];
    const salesPersonId: string = body.salesPersonId || '';
    const customerIds: string[] = body.customerIds || [];
    const updates: { id: string; data: Partial<MockCustomer> }[] = [];
    if (unmapIds.length) {
      this.db
        .customers()
        .filter((c) => unmapIds.includes(c.salesPersonId))
        .forEach((c) => updates.push({ id: c.id, data: { salesPersonId: '' } }));
    }
    if (salesPersonId) {
      customerIds.forEach((id) => updates.push({ id, data: { salesPersonId } }));
    }
    this.db.saveCustomers(updates);
    return true;
  }

  private filterCustomers(body: any, customers: MockCustomer[]) {
    const isActive: number[] = body.isActive || [];
    const businessStatus: number[] = body.businessStatus || [];
    const businessType: number[] = body.businessType || [];
    const orderStatus: string[] = body.customerOrderStatus || [];
    const companyIds: string[] = body.companyIds || [];
    return customers.filter(
      (c) =>
        (isActive.length === 0 || isActive.includes(c.isActive)) &&
        (businessStatus.length === 0 || businessStatus.includes(c.businessStatus)) &&
        (businessType.length === 0 || businessType.includes(c.businessType)) &&
        (orderStatus.length === 0 || orderStatusMatches(c.lastOrderDays, orderStatus)) &&
        (companyIds.length === 0 || (c.companies || []).some((id) => companyIds.includes(id))),
    );
  }

  private countBySalesPerson(body: any) {
    const ids: string[] = body.salespersonIds || body.salesPersonIds || [];
    const customers = this.filterCustomers(body, this.db.customers());
    return ids.map((id) => ({ salesperson_id: id, customer_count: customers.filter((c) => c.salesPersonId === id).length }));
  }

  /** Share of the given sales persons' shops that stock each company (all of their shops when no ids are given). */
  private companyShareBySalesPerson(body: any) {
    const ids: string[] = body.salespersonIds || [];
    const shops = this.db.customers().filter((c) => (ids.length ? ids.includes(c.salesPersonId) : !!c.salesPersonId));
    return MOCK_COMPANIES.map((company) => {
      const shopCount = shops.filter((c) => (c.companies || []).includes(company.id)).length;
      return {
        company_id: company.id,
        company_name: company.name,
        shop_count: shopCount,
        total_shops: shops.length,
        shop_percentage: shops.length ? Math.round((shopCount * 100) / shops.length) : 0,
      };
    });
  }

  private customersBySalesPerson(body: any) {
    const pageNumber = body.pageNumber || 1;
    const pageSize = body.pageSize || 50;
    let customers = this.filterCustomers(body, this.db.customers());
    if (body.salesPersonId) customers = customers.filter((c) => c.salesPersonId === body.salesPersonId);
    return {
      totalCount: customers.length,
      customers: customers.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
    };
  }

  // ------------------------------------------------------------------------------------------- performance report
  private salesPersonReport(taskDate: string, salesPersonIds: string[]) {
    const salesPersons = this.db
      .listDocs('SalesPerson')
      .map((d) => d.data)
      .filter((sp) => sp.isActive && sp.cluster?.id)
      .filter((sp) => salesPersonIds.length === 0 || salesPersonIds.includes(sp.id));
    const reports = this.db.query('TasksReport', [{ fieldName: 'taskDate', operator: '==', fieldValue: taskDate }]);
    const monthPrefix = (taskDate || '').slice(0, 7);
    const daily: any[] = [];
    const monthly: any[] = [];
    salesPersons.forEach((sp) => {
      const report = reports.find((r) => r.data.salesPersonId === sp.id);
      if (!report) return;
      const tasks = this.db.query('Tasks', [
        { fieldName: 'taskDate', operator: '==', fieldValue: taskDate },
        { fieldName: 'salesPersonId', operator: '==', fieldValue: sp.id },
      ]);
      const r = keyedRandom(`perf|${sp.id}|${taskDate}`);
      const tasksCount = report.data.customerCount;
      const achieved = tasks.filter((t) => t.data.status === 2).length;
      const productivityCount = Math.round(achieved * (0.25 + r.next() * 0.2));
      const avgOrderValue = r.int(1800, 5200);
      const productivityRevenue = productivityCount * avgOrderValue;
      const fmcgOrders = Math.round(productivityCount * 0.6);
      const assigned = productivityCount;
      const selfOrders = r.int(0, 6);
      daily.push({
        salesPersonId: sp.id,
        salesPersonName: sp.name,
        tasksCount,
        achievedTasksCount: achieved,
        tasksPercent: tasksCount ? +((achieved / tasksCount) * 100).toFixed(2) : 0,
        productivityCount,
        productivityRevenue,
        avgOrderValue,
        fmcgOrders,
        productivityIncentive: productivityCount >= 8 ? 200 : productivityCount >= 5 ? 100 : 0,
        fmcgLineItemsIncentive: fmcgOrders * 10,
        salesPersonAssigned: assigned,
        selfOrderAssigned: selfOrders,
        salesPersonUnAssigned: r.int(0, 3),
        selfOrderUnAssigned: r.int(0, 4),
        salesPersonAssignedRevenue: productivityRevenue,
        selfOrderAssignedRevenue: selfOrders * r.int(1500, 4000),
        salesPersonUnAssignedRevenue: r.int(0, 3) * r.int(1500, 4000),
        selfOrderUnAssignedRevenue: r.int(0, 4) * r.int(1500, 4000),
      });
      const monthReports = this.db
        .query('TasksReport', [{ fieldName: 'salesPersonId', operator: '==', fieldValue: sp.id }])
        .filter((x) => String(x.data.taskDate).startsWith(monthPrefix) && x.data.taskDate <= taskDate);
      const workedDays = Math.max(1, monthReports.length);
      const m = keyedRandom(`perf-month|${sp.id}|${monthPrefix}`);
      const productivityTarget = 220;
      const productivityAchieved = Math.round(workedDays * m.int(4, 9));
      const revenueTarget = 900000;
      const revenueAchieved = productivityAchieved * m.int(2200, 4800);
      const fmcgTarget = 300000;
      const fmcgAchieved = Math.round(revenueAchieved * (0.25 + m.next() * 0.15));
      monthly.push({
        salesPersonId: sp.id,
        salesPersonName: sp.name,
        monthProductivityTarget: productivityTarget,
        monthProductivityCount: productivityAchieved,
        productivityPercent: +((productivityAchieved / productivityTarget) * 100).toFixed(2),
        monthOverallRevenueTarget: revenueTarget,
        monthOverallRevenue: revenueAchieved,
        overallRevenuePercent: +((revenueAchieved / revenueTarget) * 100).toFixed(2),
        monthFMCGRevenueTarget: fmcgTarget,
        monthFMCGRevenue: fmcgAchieved,
        fmcgRevenuePercent: +((fmcgAchieved / fmcgTarget) * 100).toFixed(2),
        todayTarget: Math.max(0, Math.round((revenueTarget - revenueAchieved) / 10)),
        monthProductivityIncentive: productivityAchieved >= productivityTarget ? 3000 : 0,
        monthOverallRevenueIncentive: revenueAchieved >= revenueTarget ? 5000 : 0,
        monthFMCGRevenueIncentive: fmcgAchieved >= fmcgTarget ? 2000 : 0,
        monthDailyFMCGLineItemsIncentive: workedDays * m.int(20, 80),
        monthDailyProductivityIncentive: workedDays * m.pick([0, 100, 200]),
        monthSalesPersonAssigned: productivityAchieved,
        monthSelfOrderAssigned: workedDays * m.int(1, 4),
        monthSalesPersonUnAssigned: workedDays * m.int(0, 2),
        monthSelfOrderUnAssigned: workedDays * m.int(0, 3),
        monthSalesPersonAssignedRevenue: revenueAchieved,
        monthSelfOrderAssignedRevenue: workedDays * m.int(4000, 12000),
        monthSalesPersonUnAssignedRevenue: workedDays * m.int(0, 6000),
        monthSelfOrderUnAssignedRevenue: workedDays * m.int(0, 9000),
      });
    });
    return { daily, monthly };
  }

  // ------------------------------------------------------------------------------------------- message queue
  private handleMessage(body: any) {
    let input: any = {};
    try {
      input = typeof body.input === 'string' ? JSON.parse(body.input) : body.input || {};
    } catch (e) {
      input = {};
    }
    switch (body.messageType) {
      case 'MapSalesPersonToCluster':
        this.db.updateDoc('SalesPerson', input.salesPersonId, { clusterId: input.newAreaId });
        if (input.newAreaTaggedSalesPersonId) {
          this.db.updateDoc('SalesPerson', input.newAreaTaggedSalesPersonId, {
            clusterId: '',
            customerCount: 0,
            cluster: { id: '', name: '' },
          });
        }
        this.remapAreaCustomers(input.salesPersonId, input.newAreaId);
        break;
      case 'DeActivateSalesPerson':
        if (input.salesPersonId && this.db.getDoc('SalesPerson', input.salesPersonId)) {
          this.db.updateDoc('SalesPerson', input.salesPersonId, { clusterId: '' });
          this.updateSalesPersonIds({ salesPersonIds: [input.salesPersonId], salesPersonId: '', customerIds: [] });
        }
        break;
      case 'UpdateClusterPolygon':
        this.remapAreaCustomers(input.salesPersonId, input.currentAreaId);
        break;
      case 'CreateTasks':
        this.createTasks(input);
        break;
      default:
        break;
    }
  }

  private remapAreaCustomers(salesPersonId: string, areaId: string) {
    const area = areaId && this.db.getDoc('SalesPersonClusters', areaId);
    if (!salesPersonId || !area) return;
    const customerIds = Object.keys(area.customers || {});
    this.updateSalesPersonIds({ salesPersonIds: [salesPersonId], salesPersonId: '', customerIds: [] });
    this.updateSalesPersonIds({ salesPersonIds: [], salesPersonId, customerIds });
  }

  /** Mirrors the backend job: one TasksReport per sales person per date and `taskCountPerDay` Tasks each. */
  private createTasks(input: any) {
    const statusId = input.messageQueueStatusId;
    if (statusId) {
      this.db.setDoc('MessageQueueStatus', statusId, { messageQueueStatusId: statusId, status: 2, createdTimeStamp: Date.now() });
    }
    const filters = input.filters || {};
    const dealerId = 'DLRHYD0001';
    (input.salesPersons || []).forEach((sp: any) => {
      const salesPerson = this.db.getDoc('SalesPerson', sp.id);
      const customers = this.filterCustomers(
        {
          isActive: filters.customerStatus || [],
          businessStatus: filters.businessStatus || [],
          businessType: filters.businessTypes || [],
          customerOrderStatus: filters.customerOrderStatus || [],
          companyIds: filters.companyIds || [],
        },
        this.db.customers().filter((c) => c.salesPersonId === sp.id),
      );
      const perDay = Number(sp.taskCountPerDay || sp.tasksCount || 0);
      let cursor = 0;
      (input.taskDates || []).forEach((taskDate: string) => {
        const existing = this.db.query('TasksReport', [
          { fieldName: 'taskDate', operator: '==', fieldValue: taskDate },
          { fieldName: 'salesPersonId', operator: '==', fieldValue: sp.id },
        ]);
        existing.forEach((r) => this.db.deleteDoc('TasksReport', r.id));
        this.db
          .query('Tasks', [
            { fieldName: 'taskDate', operator: '==', fieldValue: taskDate },
            { fieldName: 'salesPersonId', operator: '==', fieldValue: sp.id },
          ])
          .forEach((t) => this.db.deleteDoc('Tasks', t.id));
        const dayCustomers = customers.slice(cursor, cursor + perDay);
        cursor += perDay;
        const dayStart = new Date(`${taskDate} 00:00:00`).getTime();
        const reportId = `Report_${Date.now()}${Math.floor(Math.random() * 1e4)}`;
        this.db.setDoc('TasksReport', reportId, {
          salesPersonId: sp.id,
          salesPersonName: sp.name || salesPerson?.name || '',
          clusterId: sp.areaId || salesPerson?.cluster?.id || '',
          clusterName: sp.areaName || salesPerson?.cluster?.name || '',
          customerCount: dayCustomers.length,
          taskDate,
          taskDateTimestamp: dayStart,
          isActive: true,
          createdDate: ymd(new Date()),
        });
        dayCustomers.forEach((customer, index) => {
          const taskId = `TASK${Date.now()}${Math.floor(Math.random() * 1e6)}`;
          this.db.setDoc('Tasks', taskId, {
            taskDate,
            taskDateTimestamp: dayStart,
            createdDate: ymd(new Date()),
            customerId: customer.id,
            dealerId,
            stopNumber: index + 1,
            status: 99,
            interactionId: '',
            salesPersonId: sp.id,
            setInfo: { setName: sp.areaName || '' },
            customerInfo: {
              customerId: customer.id,
              businessName: customer.businessName,
              customerName: customer.customerName,
              mobileNumber: customer.mobileNumber,
              businessType: customer.businessType,
              address: customer.address,
              areaName: customer.areaName,
              latitude: customer.latitude,
              longitude: customer.longitude,
            },
            salesPersonInfo: { id: sp.id, name: sp.name || salesPerson?.name || '', subAreaName: sp.areaName || '' },
          });
        });
      });
    });
    if (statusId) {
      this.db.updateDoc('MessageQueueStatus', statusId, { status: 4, completedTimeStamp: Date.now() });
    }
  }
}
