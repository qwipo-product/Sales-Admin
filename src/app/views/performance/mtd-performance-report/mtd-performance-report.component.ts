import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { formatDate } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatOption } from '@angular/material/core';
import { MatSelect } from '@angular/material/select';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { animate, style, transition, trigger } from '@angular/animations';
import { Subject, Subscription, takeUntil } from 'rxjs';
import * as XLSX from 'xlsx'; // chunk 574 = SheetJS 0.18.5 (exports: utils -> P6, writeFile -> NC, read -> ij)

import { AuthService, SalesPersonService } from 'app/shared/services'; // main 9143 barrel (e8, Yf)
import { AppLoaderService } from 'app/shared/services/app-loader/app-loader.service'; // main 7009
import { showWarning } from 'app/shared/helpers/utils'; // main 1972 (N9)
import { PageIds } from 'app/shared/constants/page-ids'; // main 5774 (u)

import {
  SalesPersonReportData,
  SalesPersonReportKey,
  SalesPersonReportRequest,
} from '../models/sales-person-report.model';

interface PagePermission {
  view: boolean;
  create: boolean;
  delete: boolean;
  edit: boolean;
  import: boolean;
  export: boolean;
}

/**
 * "Sales Person Report" (route `performance`): MTD revenue / customer / incentive tables for one date,
 * fetched from the `getSalesPersonReport` Cloud Function, shown in 5 expansion panels and exportable
 * to a 5-sheet Excel workbook.
 */
@Component({
  selector: 'app-mtd-performance-report',
  templateUrl: './mtd-performance-report.component.html',
  styleUrls: ['./mtd-performance-report.component.scss'],
  // Declared but not bound anywhere in this template.
  animations: [
    trigger('animate', [
      transition('* => *', [style({ opacity: 0 }), animate('300ms', style({ opacity: 1 }))]),
    ]),
  ],
})
export class MtdPerformanceReportComponent implements OnInit, OnDestroy {
  @ViewChild('salesPersonSelectRef') salesPersonSelectRef: MatSelect;

  /** One MatSort per table (the tables live inside `*ngIf="isDataSearched"`, so these are re-set on every render). */
  @ViewChild('mtdRevenueSort') set mtdRevenueSort(sort: MatSort) {
    this.dataSources.mtdRevenueReport.sort = sort ?? null;
  }
  @ViewChild('monthlyCustomerSort') set monthlyCustomerSort(sort: MatSort) {
    this.dataSources.monthlyCustomerReport.sort = sort ?? null;
  }
  @ViewChild('dailyPerformanceIncentiveSort') set dailyPerformanceIncentiveSort(sort: MatSort) {
    this.dataSources.dailyPerformanceIncentiveReport.sort = sort ?? null;
  }
  @ViewChild('dailyCustomersSort') set dailyCustomersSort(sort: MatSort) {
    this.dataSources.dailyCustomersReport.sort = sort ?? null;
  }
  @ViewChild('monthlyIncentiveSort') set monthlyIncentiveSort(sort: MatSort) {
    this.dataSources.monthlyIncentiveReport.sort = sort ?? null;
  }

  /** Same page id as the side-menu entry ("Performance Report"), so users who see the menu item can open the page. */
  pageId = PageIds.crm_performance_report; // 'crm_performance_report'
  permissionObj: PagePermission;
  permissionSubscription: Subscription;
  private destroy$ = new Subject<void>();

  salesPersonList: any[];
  selectedSalesPersonIds: string[];
  salesPersonReportData: SalesPersonReportData;
  isDataSearched = false;

  /** Table data sources (sortable via the MatSort of each table). */
  dataSources: Record<SalesPersonReportKey, MatTableDataSource<Record<string, any>>> = {
    mtdRevenueReport: new MatTableDataSource<Record<string, any>>([]),
    monthlyCustomerReport: new MatTableDataSource<Record<string, any>>([]),
    dailyPerformanceIncentiveReport: new MatTableDataSource<Record<string, any>>([]),
    dailyCustomersReport: new MatTableDataSource<Record<string, any>>([]),
    monthlyIncentiveReport: new MatTableDataSource<Record<string, any>>([]),
  };

  /** On-screen column order per table (keys of the mapped row objects; "SalesPerson Id" is intentionally omitted). */
  columns = {
    mtdRevenueReport: [
      'BA Name',
      'TL Name',
      'Area',
      'Buying Target',
      'Buying Achieved',
      'Buying Achieved %',
      'Revenue Target',
      'Revenue Achieved',
      'Revenue Achieved %',
      'FMCG Revenue Target',
      'FMCG Revenue Achieved',
      'FMCG Revenue Achieved %',
      'Today Target',
    ],
    monthlyCustomerReport: [
      'BA Name',
      'TL Name',
      'Sales Person Assigned',
      'Self Order Assigned',
      'Sales Person UnAssigned',
      'Self Order UnAssigned',
      'Sales Person Assigned Revenue',
      'Self Order Assigned Revenue',
      'Sales Person UnAssigned Revenue',
      'Self Order UnAssigned Revenue',
    ],
    dailyPerformanceIncentiveReport: [
      'BA Name',
      'TL Name',
      'Tasks',
      'Achieved',
      'Achieved %',
      'Productivity Count',
      'Productivity Revenue',
      'AVG Bill Value',
      'FMCG Orders',
      'Productivity Incentive',
      'FMCG LineItems Incentive',
    ],
    dailyCustomersReport: [
      'BA Name',
      'TL Name',
      'Sales Person Assigned',
      'Self Order Assigned',
      'Sales Person UnAssigned',
      'Self Order UnAssigned',
      'Sales Person Assigned Revenue',
      'Self Order Assigned Revenue',
      'Sales Person UnAssigned Revenue',
      'Self Order UnAssigned Revenue',
    ],
    monthlyIncentiveReport: [
      'BA Name',
      'TL Name',
      'Monthly Buying Customer Count Incentive',
      'Monthly Revenue Incentive',
      'Monthly FMCG Revenue Incentive',
      'Daily FMCG Line Items Incentive',
      'Daily Productivity Incentive',
    ],
  };

  form: FormGroup;

  constructor(
    private authService: AuthService,
    private fb: FormBuilder,
    private salesPersonService: SalesPersonService,
    private egretLoader: AppLoaderService
  ) {
    this.form = this.fb.group({
      selectedDate: [null, Validators.required],
    });
  }

  async ngOnInit() {
    this.isDataSearched = false;
    this.permissionSubscription = this.authService.permission$.pipe(takeUntil(this.destroy$)).subscribe((permissions) => {
      if (permissions && Object.keys(permissions).length > 0) {
        this.permissionObj = permissions[this.pageId];
      }
    });
    this.salesPersonList = await this.salesPersonService.getSalesPersons();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getSelectedSalesPerson() {
    this.selectedSalesPersonIds = (this.salesPersonSelectRef.selected as MatOption[]).map((option) => option.value.id);
  }

  async search() {
    if (!this.form.valid) {
      showWarning('Please select Date');
      return;
    }
    if (!this.form.get('selectedDate').value) {
      showWarning('Please select Date');
      return;
    }

    const payload: SalesPersonReportRequest = {
      taskDate: formatDate(this.form.get('selectedDate').value, 'yyyy-MM-dd', 'en-US'),
      salesPersonIds: this.selectedSalesPersonIds || [],
    };

    try {
      this.egretLoader.open();
      // POST `${cloudFunctionsUrl}/getSalesPersonReport` (header No-Auth: true) -> mapped 5-table object
      this.salesPersonReportData = (await this.salesPersonService.getSalesPersonsReport(payload)) as SalesPersonReportData;
      console.log('salesPersonReportData2 :', this.salesPersonReportData);
      this.updateDataSources();
      if (this.isSalesPersonResponseEmpty(this.salesPersonReportData)) {
        this.isDataSearched = false;
        return;
      }
      this.isDataSearched = true;
    } catch {
      console.log('Error at search Function');
    } finally {
      this.egretLoader.close();
    }
  }

  /** Feeds the (sortable) table data sources from the last search response. */
  updateDataSources() {
    const data: any = this.salesPersonReportData || {};
    (Object.keys(this.dataSources) as SalesPersonReportKey[]).forEach((key) => {
      this.dataSources[key].data = data[key] || [];
    });
  }

  /** true when every table is empty (also true for `{}` and before the first search). */
  isSalesPersonResponseEmpty(data: any): boolean {
    if (!data) {
      return true;
    }
    return Object.keys(data).every((key) => !data[key] || data[key].length === 0);
  }

  /**
   * One sheet per table, sheet name = table key (e.g. "mtdRevenueReport"), columns = all keys of the
   * mapped rows (incl. "SalesPerson Id"). File: "Sales Person Performance Report.xlsx".
   */
  generateExcel() {
    if (!this.permissionObj?.export) {
      return;
    }
    if (this.isSalesPersonResponseEmpty(this.salesPersonReportData)) {
      this.isDataSearched = false;
      showWarning('There Is No data to download');
      return;
    }
    const workbook = XLSX.utils.book_new();
    Object.keys(this.salesPersonReportData).forEach((key) => {
      const worksheet = XLSX.utils.json_to_sheet((this.salesPersonReportData as any)[key]);
      XLSX.utils.book_append_sheet(workbook, worksheet, key);
    });
    XLSX.writeFile(workbook, 'Sales Person Performance Report.xlsx');
  }
}
