// Reconstructed from chunk 374.ebdfb6cdb5b2c104.js (component "U", selector app-interaction-list).
// Route: /interaction-list. Screen title: "Interactions".
// Server-side cursor pagination (50 per page) over Firestore "Interactions" ordered by createdTimeStamp.
import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { formatDate } from '@angular/common';
import { animate, style, transition, trigger } from '@angular/animations';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { AppLoaderService } from 'app/shared/services/app-loader/app-loader.service';
import { ExcelService } from 'app/shared/services/excel.service';
import { AuthService } from 'app/shared/services/auth/auth.service';
import { SalesPersonService } from 'app/shared/services/sales-person.service';
import { PageIds } from 'app/shared/constants/page-ids';
import { arrayToObject, formatDateTime, groupBy, millisecondsToMinutes } from 'app/shared/helpers/common.helper';
import { SearchInteractionDialogComponent } from '../search-interaction-dialog/search-interaction-dialog.component';
import { InteractionSummaryDialogComponent } from '../interaction-summary-dialog/interaction-summary-dialog.component';
import {
  InteractionRow,
  InteractionSearchInput,
  InteractionSummaryRow,
  SearchItem,
} from '../models/interaction.model';
import { PagePermission } from '../../tasks/models/task.model';

@Component({
  selector: 'app-interaction-list',
  templateUrl: './interaction-list.component.html',
  styleUrls: ['./interaction-list.component.scss'],
  animations: [
    trigger('animate', [transition('* => *', [style({ opacity: 0 }), animate('300ms', style({ opacity: 1 }))])]),
  ],
})
export class InteractionListComponent implements OnInit, OnDestroy {
  @ViewChild('modalTemplate') modalTemplate: TemplateRef<any>;
  @ViewChild(MatPaginator) paginator: MatPaginator; // no <mat-paginator> in the template
  @ViewChild(MatSort) sort: MatSort; // matSort present but no mat-sort-header -> no sorting

  pageId = PageIds.crm_interactions; // "crm_interactions"
  pageNumber = 1;
  orderByField = '';
  dataSource: InteractionRow[] = [];
  searchItems: SearchItem[] = [];
  DEFAULT_PAGE_SIZE = 50;
  pageSize = this.DEFAULT_PAGE_SIZE;
  keyLabelMap: { [key: string]: string } = {
    mobileNumber: 'Mobile Number',
    salesPersonIds: 'Sales Person',
    startDate: 'Start Date',
    endDate: 'End Date',
    dateRange: 'Date Range',
  };
  paginationLastItem = 0;
  searchFields = this.mapToSearchFields({
    mobileNumber: '',
    salesPersonIds: [],
    startDate: formatDate(new Date(), 'yyyy-MM-dd', 'en-US'),
    endDate: formatDate(new Date(), 'yyyy-MM-dd', 'en-US'),
  });
  searchInteractionInput: InteractionSearchInput = {
    mobileNumber: '',
    salesPersonIds: [],
    startDate: formatDate(new Date(), 'yyyy-MM-dd', 'en-US'),
    endDate: formatDate(new Date(), 'yyyy-MM-dd', 'en-US'),
  };
  displayedColumns: string[] = [
    'date',
    'customerId',
    'businessName',
    'mobileNumber',
    'salesPersonName',
    'salesPersonBusinessName',
    'salesPersonMobileNumber',
    'interactionCategory',
    'comments',
    'imageUrl',
    'customerVisitDuration',
    'checkInTime',
    'checkOutTime',
    'checkInLocation',
    'checkOutLocation',
    'checkInDistance',
    'checkOutDistance',
  ];
  navigateNextPage = false;
  navigatePrevPage = false;
  paginationFirstItem = 0;
  prevPageAvailable = false;
  nextPageAvailable = true;
  setPage = 1; // current page number shown as "{{setPage}} of {{totalPages}}"

  permissionSubscription: Subscription;
  permissionObj: PagePermission;
  salesPersonList: any[];
  selectedSalesPersonNames: string[];
  totalInteractionsLength: number;
  totalPages: number;
  showPagination: boolean;
  interactionReport: InteractionSummaryRow[];
  private destroy$ = new Subject<void>();

  constructor(
    private dialog: MatDialog,
    private salesPersonService: SalesPersonService,
    private egretLoader: AppLoaderService,
    private excelService: ExcelService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    this.permissionSubscription = this.authService.permission$.pipe(takeUntil(this.destroy$)).subscribe(async (permissions) => {
      if (permissions && Object.keys(permissions).length > 0) {
        this.permissionObj = permissions[this.pageId];
      }
    });
    this.dataSource = [];
    await this.getInteractions();
    this.salesPersonList = await this.salesPersonService.getSalesPersons();
    this.updateSearchItemsData(this.searchFields);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Full (unpaginated) result set for the current filters. */
  async downloadInteractions() {
    return await this.salesPersonService.downloadInteractionsByFilters(
      this.searchInteractionInput.startDate,
      this.searchInteractionInput.endDate,
      this.searchInteractionInput.salesPersonIds,
      this.searchInteractionInput.mobileNumber
    );
  }

  /**
   * Loads the page addressed by the cursor flags (navigateNextPage / navigatePrevPage) plus the total count.
   * `navigating` is true for Prev/Next (the caller restores the page number when nothing was loaded).
   * Returns true when a page of rows was loaded.
   */
  async getInteractions(navigating = false): Promise<boolean> {
    this.egretLoader.open();
    try {
      // Page query: Interactions orderBy(createdTimeStamp, desc|asc) limit(50) + filters (see SalesPersonService).
      // The service's cursor bounds are exclusive (< last / > first timestamp): no compensation needed here.
      const interactions = await this.salesPersonService.getInteractionsByFilters(
        this.searchInteractionInput.startDate,
        this.searchInteractionInput.endDate,
        this.searchInteractionInput.salesPersonIds,
        this.searchInteractionInput.mobileNumber,
        this.paginationLastItem,
        this.navigateNextPage,
        this.paginationFirstItem,
        this.navigatePrevPage
      );
      // Same filters without limit, only used to compute the page count
      const allInteractions = await this.salesPersonService.downloadInteractionsByFilters(
        this.searchInteractionInput.startDate,
        this.searchInteractionInput.endDate,
        this.searchInteractionInput.salesPersonIds,
        this.searchInteractionInput.mobileNumber
      );
      this.totalInteractionsLength = allInteractions.length;
      this.totalPages = Math.ceil(this.totalInteractionsLength / this.pageSize);
      const rows = interactions
        .map((interaction) => this.mapToInteraction(interaction))
        .sort((a, b) => b.createdTimeStamp - a.createdTimeStamp);
      if (rows.length == 0) {
        Swal.fire('', 'No records found', 'warning');
        if (!navigating) {
          // FIX: a new search without results no longer leaves the previous search's rows on screen
          this.dataSource = [];
          this.showPagination = false;
        }
        return false;
      }
      this.showPagination = true;
      this.dataSource = rows;
      this.paginationFirstItem = rows[0].createdTimeStamp;
      this.paginationLastItem = rows[rows.length - 1].createdTimeStamp;
      this.prevPageAvailable = this.setPage > 1;
      // FIX: derived from the total count, so Next is also disabled when the last page has exactly 50 rows
      this.nextPageAvailable = this.setPage < this.totalPages;
      return true;
    } catch (error) {
      console.log(error);
      Swal.fire('error', 'An error occurred while fetching interactions.', 'error');
      if (!navigating) {
        this.dataSource = [];
        this.showPagination = false;
      }
      return false;
    } finally {
      this.egretLoader.close();
    }
  }

  getSelectedSalesPersonNames(salesPersonIds: any[]): string[] {
    return (this.salesPersonList || [])
      .filter((salesPerson) => salesPersonIds.includes(salesPerson.id))
      .map((sp) => sp.name);
  }

  mapToInteraction(interaction: any): InteractionRow {
    return {
      interactionId: interaction.interactionId,
      customerId: interaction.customerId,
      salesPersonId: interaction.salesPersonId,
      customerInfo: {
        id: interaction.customerInfo.customerId,
        name: interaction.customerInfo.name,
        mobileNumber: interaction.customerInfo.mobileNumber,
      },
      salesPersonInfo: {
        id: interaction.salesPersonInfo.salesPersonId,
        name: interaction.salesPersonInfo.name,
        mobileNumber: interaction.salesPersonInfo.mobileNumber,
        businessName: interaction.salesPersonInfo.businessName,
      },
      interactionInfo: {
        interactionId: interaction.interactionInfo.interactionId,
        comments: interaction.interactionInfo.comments,
        commentCategory: interaction.interactionInfo.commentCategory,
        imageUrl: interaction.interactionInfo.imageUrl,
      },
      checkInfo: {
        checkInDistance: interaction.checkInfo.checkInDistance,
        checkOutDistance: interaction.checkInfo.checkOutDistance || '',
        checkInLatitude: interaction.checkInfo.checkInLatitude,
        checkInLongitude: interaction.checkInfo.checkInLongitude,
        checkOutLatitude: interaction.checkInfo.checkOutLatitude || '',
        checkOutLongitude: interaction.checkInfo.checkOutLongitude || '',
        checkInTime: interaction.checkInfo.checkInTime != 0 ? formatDateTime(interaction.checkInfo.checkInTime) : 0,
        checkOutTime: interaction.checkInfo.checkOutTime != 0 ? formatDateTime(interaction.checkInfo.checkOutTime) : 0,
        customerDuration: interaction.checkInfo.checkOutTime
          ? millisecondsToMinutes(interaction.checkInfo.checkOutTime - interaction.checkInfo.checkInTime)
          : 0,
      },
      createdDate: interaction.createdDate,
      createdTimeStamp: interaction.createdTimeStamp,
      taskId: interaction.taskId,
    };
  }

  /** Search icon button -> SearchInteractionDialogComponent. */
  openPopUp() {
    const dialogRef = this.dialog.open(SearchInteractionDialogComponent, {
      width: '72%',
      disableClose: true,
      data: { title: 'Interaction Search', searchFields: this.searchInteractionInput },
      panelClass: 'custom-dialog-class',
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const searchFields = this.mapToSearchFields(result);
        if (searchFields.salesPersonIds && searchFields.salesPersonIds.length > 0) {
          // salesPersonIds here are {id,name} objects (the bundle passed the objects, so no name ever matched)
          this.selectedSalesPersonNames = this.getSelectedSalesPersonNames(
            searchFields.salesPersonIds.map((sp: any) => sp.id)
          );
        } else {
          searchFields.salesPersonIds = '';
        }
        this.updateSearchItemsData(searchFields);
        const salesPersonIds = result && result.salesPersonIds && result.salesPersonIds.map((sp: any) => sp.id);
        result.salesPersonIds = salesPersonIds;
        this.searchInteractionInput = result;
        this.resetPageAndFetchData();
      }
    });
  }

  mapToSearchFields(fields: any): InteractionSearchInput {
    return {
      mobileNumber: fields.mobileNumber,
      salesPersonIds: fields.salesPersonIds || [],
      startDate: fields.startDate,
      endDate: fields.endDate,
    };
  }

  /**
   * Badge close icon: clears that filter and reloads page 1.
   * FIX: the bundle read `searchInteractionInput.dateRange.length` here, which threw a TypeError for every badge
   * except "Date Range", and it started up to three overlapping reloads (stacked loader dialogs).
   */
  removeSearchItem(id: number, text: string) {
    this.removeBadge(text);
    if (text === 'dateRange') {
      // Start/End dates are mandatory for the Interactions queries (the bundle deleted them and queried with NaN
      // bounds), so clearing the "Date Range" filter restores the default range (today to today).
      this.searchItems = this.searchItems.map((item) =>
        item.id === id
          ? { ...item, searchText: `${this.searchInteractionInput.startDate} to ${this.searchInteractionInput.endDate}` }
          : item
      );
    } else {
      this.searchItems = this.searchItems.filter((item) => item.id !== id);
    }
    this.resetPageAndFetchData();
  }

  removeBadge(key: string) {
    if (key === 'dateRange') {
      const today = formatDate(new Date(), 'yyyy-MM-dd', 'en-US');
      this.searchInteractionInput.startDate = today;
      this.searchInteractionInput.endDate = today;
    } else if (key === 'salesPersonIds') {
      this.searchInteractionInput.salesPersonIds = [];
    } else {
      (this.searchInteractionInput as any)[key] = '';
    }
  }

  updateSearchItemsData(fields: any) {
    this.searchItems = Object.entries(fields)
      .filter(([key, value]) => (!Array.isArray(value) || value.length !== 0) && value !== '')
      .map(([key, value]: [string, any], index) => {
        if (key !== 'salesPersonIds') {
          return { id: index + 1, text: key, searchText: value };
        }
        return Array.isArray(value)
          ? { id: index + 1, text: key, searchText: value.map((sp: any) => sp.name).join(', ') }
          : undefined;
      });
    if (fields.startDate && fields.endDate) {
      this.searchItems.push({
        id: this.searchItems.length + 1,
        text: 'dateRange',
        searchText: `${fields.startDate} to ${fields.endDate}`,
      });
      this.searchItems = this.searchItems.filter((item) => item.text !== 'startDate' && item.text !== 'endDate');
    }
  }

  async resetPageAndFetchData() {
    // FIX: a new search always starts from page 1 (the bundle kept the Next/Prev cursor of the previous search)
    this.setPage = 1;
    this.paginationFirstItem = 0;
    this.paginationLastItem = 0;
    this.navigateNextPage = false;
    this.navigatePrevPage = false;
    this.prevPageAvailable = false;
    await this.getInteractions();
  }

  async downloadToExcel() {
    try {
      const result = await Swal.fire({
        title: 'Do you want to proceed?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes',
        cancelButtonText: 'No',
      });
      if (!result.isConfirmed) {
        return;
      }
      this.egretLoader.open();
      const interactions = (await this.downloadInteractions())
        .map((interaction) => this.mapToInteraction(interaction))
        .sort((a, b) => b.createdTimeStamp - a.createdTimeStamp);
      // (the bundle also fired a 'No records found' alert here that was instantly replaced by the error below)
      const excelData = this.mapInteractionToExcelData(interactions);
      if (excelData && excelData.length > 0) {
        // -> DownloadedInteractions.xlsx, sheet "Interactions"
        this.excelService.exportToExcel(excelData, 'Interactions', 'DownloadedInteractions');
        Swal.fire('success', 'Excel Downloaded Successfully', 'success');
      } else {
        Swal.fire('error', 'No Interactions Found.', 'error');
      }
    } catch (error) {
      console.error('Error downloading interactions:', error);
      Swal.fire('error', 'An error occurred while downloading interactions.', 'error');
    } finally {
      this.egretLoader.close();
    }
  }

  mapInteractionToExcelData(interactions: InteractionRow[]) {
    return interactions.map((interaction) => ({
      'Customer Name': interaction.customerInfo.name,
      'Customer Id': interaction.customerId,
      'Customer Mobile Number': interaction.customerInfo.mobileNumber,
      'Sales Person Id': interaction.salesPersonId,
      'Sales Person Name': interaction.salesPersonInfo.name,
      'Sales Person MobileNumber': interaction.salesPersonInfo.mobileNumber,
      'Interaction Id': interaction.interactionId,
      Comments: interaction.interactionInfo.comments,
      'Comment Category': interaction.interactionInfo.commentCategory,
      ImageUrl: interaction.interactionInfo.imageUrl,
      'Customer Visit Duration': interaction.checkInfo.customerDuration,
      'Check In Distance': interaction.checkInfo.checkInDistance,
      'Check Out Distance': interaction.checkInfo.checkOutDistance,
      'Check In Latitude': interaction.checkInfo.checkInLatitude,
      'Check In Longitude': interaction.checkInfo.checkInLongitude,
      'Check Out Latitude': interaction.checkInfo.checkOutLatitude,
      'Check Out Longitude': interaction.checkInfo.checkOutLongitude,
      // already formatted by mapToInteraction; formatted again (idempotent for 'yyyy-MM-dd HH:mm')
      'Check In Time': interaction.checkInfo.checkInTime != 0 ? formatDateTime(interaction.checkInfo.checkInTime) : 0,
      'Check Out Time': interaction.checkInfo.checkOutTime != 0 ? formatDateTime(interaction.checkInfo.checkOutTime) : 0,
      'Created Date': interaction.createdDate,
      'Task Id': interaction.taskId,
    }));
  }

  /** Thumbnail click -> full-size image in a MatDialog built from the #modalTemplate ng-template. */
  openModal(imageUrl: string) {
    this.dialog.open(this.modalTemplate, { data: imageUrl });
  }

  formatTimestamp(timestamp: number) {
    return new Date(timestamp);
  }

  /** Returns null when there is nothing to summarise (the warning has already been shown). */
  async showInteractionReport(): Promise<InteractionSummaryRow[] | null> {
    if (this.dataSource.length == 0) {
      Swal.fire('', 'No records found', 'warning');
      return null; // (the bundle returned undefined here and the caller then threw on .length)
    }
    this.egretLoader.open();
    try {
      const startDate = formatDate(this.searchInteractionInput.startDate, 'yyyy-MM-dd', 'en-US');
      const endDate = formatDate(this.searchInteractionInput.endDate, 'yyyy-MM-dd', 'en-US');
      // Firestore "TasksReport" for the same date range / sales persons
      const tasksReport = await this.salesPersonService.getTasksReportByFilter(
        startDate,
        endDate,
        this.searchInteractionInput.salesPersonIds
      );
      const taskSummary = this.mapTasksReportToSummary(tasksReport);
      // FIX: count every interaction matching the current filters (the bundle only counted the <= 50 rows of the
      // page on screen)
      const allInteractions = (await this.downloadInteractions()).map((interaction) => this.mapToInteraction(interaction));
      const interactionSummary = this.mapInteractionToSummary(allInteractions);
      const summaryReport = this.mapToSummaryReport(taskSummary, interactionSummary);
      if (summaryReport.length > 0) {
        const total: InteractionSummaryRow = {
          salesPersonName: 'Summary Of All Sales Person',
          salesPersonMobileNumber: 'N/A',
          salesPersonId: '',
          interactionCount: summaryReport.reduce((sum, row) => sum + row.interactionCount, 0),
          taskCount: summaryReport.reduce((sum, row) => sum + row.taskCount, 0),
        };
        summaryReport.unshift(total);
      }
      return summaryReport;
    } finally {
      this.egretLoader.close();
    }
  }

  mapToSummaryReport(taskSummary: any[], interactionSummary: any[]): InteractionSummaryRow[] {
    const result: InteractionSummaryRow[] = [];
    const interactionsBySalesPerson = arrayToObject(interactionSummary, 'salesPersonId');
    for (const task of taskSummary) {
      const interaction = interactionsBySalesPerson[task.salesPersonId] || {};
      const row = Object.assign({}, task, {
        interactionCount: interaction.interactionCount || 0,
        salesPersonMobileNumber: interaction.salesPersonMobileNumber || 'N/A',
      });
      result.push(row);
    }
    return result;
  }

  mapTasksReportToSummary(tasksReport: any[]) {
    const grouped = groupBy(tasksReport, 'salesPersonId');
    const result = [];
    for (const group of grouped) {
      result.push({
        salesPersonId: group[0].salesPersonId,
        salesPersonName: group[0].salesPersonName,
        taskCount: group.reduce((sum: number, task: any) => sum + task.customerCount, 0),
      });
    }
    return result;
  }

  mapInteractionToSummary(interactions: InteractionRow[]) {
    const grouped = groupBy(interactions, 'salesPersonId');
    const result = [];
    for (const group of grouped) {
      result.push({
        salesPersonName: group[0].salesPersonInfo.name,
        salesPersonMobileNumber: group[0].salesPersonInfo.mobileNumber,
        salesPersonId: group[0].salesPersonId,
        interactionCount: group.length,
      });
    }
    return result;
  }

  /** "Summary" button -> InteractionSummaryDialogComponent. */
  async interactionSummaryPopUp() {
    let report: InteractionSummaryRow[] | null;
    try {
      report = await this.showInteractionReport();
    } catch (error) {
      console.error('Error loading interaction summary:', error);
      Swal.fire('error', 'An error occurred while loading the interaction summary.', 'error');
      return;
    }
    if (!report) {
      return;
    }
    this.interactionReport = report;
    if (this.interactionReport.length == 0) {
      Swal.fire('', 'No records found', 'warning');
      return;
    }
    const dialogRef = this.dialog.open(InteractionSummaryDialogComponent, {
      width: '50%',
      height: '90%',
      disableClose: true,
      data: { title: 'Interaction Summary', interactionReport: this.interactionReport },
    });
    dialogRef.afterClosed().subscribe((res) => {});
  }

  async prevPage() {
    const currentPage = this.setPage;
    this.setPage = Math.max(currentPage - 1, 1);
    if (this.setPage == 1) {
      // Page 1 is loaded with the plain first-page query, so Prev from page 2 returns exactly page 1.
      this.navigatePrevPage = false;
      this.navigateNextPage = false;
    } else {
      this.navigatePrevPage = true;
      this.navigateNextPage = false;
    }
    if (!(await this.getInteractions(true))) {
      this.restorePage(currentPage);
    }
  }

  async nextPage() {
    const currentPage = this.setPage;
    this.navigateNextPage = true;
    this.navigatePrevPage = false;
    this.setPage = currentPage + 1;
    if (!(await this.getInteractions(true))) {
      this.restorePage(currentPage);
    }
  }

  /** Nothing was loaded for the requested page: keep showing (and numbering) the current one. */
  private restorePage(page: number) {
    this.setPage = page;
    this.prevPageAvailable = page > 1;
    this.nextPageAvailable = page < this.totalPages;
  }
}
