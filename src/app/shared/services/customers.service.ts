// Reconstructed from common.89677fd41d0b0854.js (webpack chunk 592, module 2541, export `v`, providedIn: 'root').
// Used by: CreateSalespersonComponent + ProfileInformationComponent (chunk 195, field `customersService`)
//          and SalesPersonPlanning (chunk 35, field `customerService` -> fetchCustomersNearGeoJson).
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { lastValueFrom, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { DbCollections } from 'app/shared/constants/db-collections';         // main 6081
import { FirebaseDbService } from 'app/shared/services/firebase-db.service';  // main 1057
import { ConfigService } from 'app/shared/services/config.service';           // main 946

export interface SalesPersonOption {
  id: string;
  name: string;
}

/** Response envelope of the core customer API ({ success, data: [...] }). */
export interface CoreApiResponse<T = any> {
  success?: boolean;
  data?: T;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root',
})
export class CustomersService {
  coreUrl: string;

  constructor(
    private firebaseDbService: FirebaseDbService,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private configService: ConfigService
  ) {
    this.coreUrl = `${this.configService.getConfig().coreUrl}`;
  }

  /** RTDB: live object at `Customer/{customerId}`. */
  fetchCustomerById(customerId: string): Observable<any> {
    return this.firebaseDbService.fetchDataFromNode(`${DbCollections.CUSTOMER}/${customerId}`);
  }

  /** RTDB: `Customer` orderByChild('userTypeId').equalTo(7) (UserType.SalesPerson) -> [{ id, name }]. */
  fetchSalesPersons(): Observable<SalesPersonOption[]> {
    return this.firebaseDbService
      .queryDataByValue(`${DbCollections.CUSTOMER}`, 'userTypeId', 7)
      .pipe(
        map((customers: any) =>
          customers ? Object.values(customers).map((customer: any) => ({ id: customer.id, name: customer.name })) : []
        )
      );
  }

  /**
   * POST `${coreApiUrl}/Customer/get_customers_by_sales_person`  body: { pageNumber, pageSize, ...filters }
   * NOTE: ConfigService.loadConfig() does not copy `coreApiUrl` from config.json, so this resolves to
   * "undefined/Customer/..." unless ConfigService is extended.
   */
  async fetchCustomerList(pageNumber: number, pageSize: number, filters: any) {
    const body = { pageNumber, pageSize, ...filters };
    const request$ = this.http.post(
      `${(this.configService.getConfig() as any).coreApiUrl}/Customer/get_customers_by_sales_person`,
      body
    );
    try {
      return await lastValueFrom(request$);
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
  }

  /** POST `${coreUrl}/customer/customers_by_geojson`  body: { geoJson, businessCategoryIds } -> response.data */
  async fetchCustomersNearGeoJson(geoJson: any, businessCategoryIds: any) {
    const body = { geoJson, businessCategoryIds };
    const request$ = this.http.post<CoreApiResponse>(
      `${this.configService.getConfig().coreUrl}/customer/customers_by_geojson`,
      body
    );
    try {
      return (await lastValueFrom(request$))?.data;
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
  }

  /** POST `${coreApiUrl}/Customer/export_customers_by_filters` (responseType: 'blob'). Same coreApiUrl caveat. */
  async exportCustomersByFilters(filters: any) {
    const url = `${(this.configService.getConfig() as any).coreApiUrl}/Customer/export_customers_by_filters`;
    const request$ = this.http.post(url, filters, { responseType: 'blob' });
    try {
      return await lastValueFrom(request$);
    } catch (error) {
      console.error('Error exporting customers:', error);
      throw error;
    }
  }

  /**
   * POST `${coreUrl}/customer` with the core (snake_case) customer entity.
   * Returns the id of the created record (`response.data[0].id`) or null on failure / unexpected response.
   */
  async createSalesPerson(payload: any): Promise<string | null> {
    try {
      const response: any = await this.http.post(`${this.coreUrl}/customer`, payload).toPromise();
      return response && response.success && response.data && response.data.length > 0 ? response.data[0].id : null;
    } catch {
      return null;
    }
    // Unreachable in the original source as well (kept for fidelity).
    return await lastValueFrom(this.http.post<any>(`${this.coreUrl}/customer`, payload));
  }

  /** GET `${coreUrl}/api/customer/{id}` -> response.data */
  async getCustomerById(customerId: string) {
    const response: any = await lastValueFrom(this.http.get(`${this.coreUrl}/api/customer/${customerId}`));
    return response && response.data;
  }

  /** PUT `${coreUrl}/api/customer/{customerId}` with the customer object minus its `id` field. */
  async updateCustomer(customer: any, customerId: string) {
    const { id, ...rest } = customer;
    return await lastValueFrom(this.http.put(`${this.coreUrl}/api/customer/${customerId}`, rest));
  }
}
