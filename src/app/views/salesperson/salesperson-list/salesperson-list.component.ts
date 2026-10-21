// Reconstructed from chunk 195.b9a9d9fa81c4f371.js (module 7195, class `q`).
import { Component, OnDestroy, OnInit } from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Subject, Subscription, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { AuthService, SalesPersonService } from 'app/shared/services';                 // main 9143 (e8, Yf -> 2937)
import { AppLoaderService } from 'app/shared/services/app-loader/app-loader.service';  // main 7009
import { PageIds } from 'app/shared/constants/page-ids';                               // main 5774 (u)
import { warningError } from 'app/shared/helpers/utils';                               // main 1972 (N9)

import { EditSalespersonDialogComponent } from '../edit-salesperson-dialog/edit-salesperson-dialog.component';

/**
 * Row shape produced by SalesPersonService.mapToSalesPerson() (main 2937) from Firestore `SalesPerson` docs.
 * Rows are sorted by customerCount desc.
 */
export interface SalesPersonRow {
  name: string;
  mobileNumber: string;
  id: string;
  businessName: string;
  isActive: boolean;
  areaName: string; // cluster.name
  areaId: string; // cluster.id
  area: any; // cluster
  customerCount: number;
  salesLeadId: string;
  salesLeadName: string; // salesLead.name
  salesLeadMobileNumber: string;
  salesManagerId: string;
  salesManagerName: string; // salesManager.name
  salesManagerMobileNumber: string;
  enableLogOut: boolean;
}

@Component({
  selector: 'app-salesperson-list',
  templateUrl: './salesperson-list.component.html',
  styleUrls: ['./salesperson-list.component.scss'],
  animations: [
    trigger('animate', [transition('* => *', [style({ opacity: 0 }), animate('300ms', style({ opacity: 1 }))])]),
  ],
})
export class SalespersonListComponent implements OnInit, OnDestroy {
  pageId = PageIds.crm_sales_person_list; // "crm_sales_person_list"
  dataSource: SalesPersonRow[] = [];
  displayedColumns: string[] = ['salesPersonName', 'mobileNumber', 'leadName', 'salesManager', 'action', 'enableLogOut'];
  permissionObj: any;
  permissionSubscription: Subscription;
  private destroy$ = new Subject<void>();

  constructor(
    private dialog: MatDialog,
    private authService: AuthService,
    private salesPersonService: SalesPersonService,
    private egretLoader: AppLoaderService,
    private router: Router
  ) {}

  ngOnInit() {
    this.permissionSubscription = this.authService.permission$
      .pipe(takeUntil(this.destroy$))
      .subscribe(async (permissions) => {
        if (permissions && Object.keys(permissions).length > 0) {
          this.permissionObj = permissions[this.pageId];
        }
      });
    this.getSalesPersonList();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Firestore: getDocs(collection('SalesPerson')) -> mapToSalesPerson(). */
  async getSalesPersonList() {
    try {
      const salesPersons = await this.salesPersonService.getSalesPersons();
      this.dataSource = salesPersons;
    } catch (error) {
      console.log(error);
    }
  }

  /** "Edit Lead" / "Add Lead": opens the lead/manager assignment dialog; reloads the list if it closed with a payload. */
  editSalespersonPopUp(salespersonId: string) {
    this.dialog
      .open(EditSalespersonDialogComponent, {
        width: '40%',
        disableClose: true,
        data: { salespersonId },
      })
      .afterClosed()
      .subscribe(async (result) => {
        if (result) {
          await this.getSalesPersonList();
        }
      });
  }

  createSalesperson() {
    this.router.navigate(['/salesperson-list/create-salesperson']);
  }

  /**
   * "Enable logout": sets `enableLogOut: true` on Firestore `SalesPerson/{id}` after a confirm prompt.
   * An already-enabled row only gets the warning (warningError() shows it and returns an Error; it is not thrown).
   * The loader is always closed, and a failed update shows an error instead of the success alert.
   */
  async salespersonForceLogout(salesPerson: SalesPersonRow) {
    const result = await Swal.fire({
      title: 'Do you want force logout this sales person',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes',
      cancelButtonText: 'No',
    });
    if (!result.isConfirmed) {
      return;
    }
    if (salesPerson && salesPerson.enableLogOut) {
      warningError('Already this salesperson is logged out');
      return;
    }
    let updated = false;
    this.egretLoader.open();
    try {
      await this.salesPersonService.updateSalesPerson(salesPerson.id, { enableLogOut: true });
      updated = true;
    } catch (error) {
      console.error('Error occurred while enabling force logout:', error);
    } finally {
      this.egretLoader.close();
    }
    if (updated) {
      salesPerson.enableLogOut = true;
      Swal.fire('success', 'Force Logout enabled successfully', 'success');
    } else {
      Swal.fire('error', 'Failed to enable force logout. Please try again later.', 'error');
    }
  }

  editSalespersonProfile(salespersonId: string) {
    this.router.navigate(['salesperson-list/edit-salesperson-profile', salespersonId]);
  }
}
