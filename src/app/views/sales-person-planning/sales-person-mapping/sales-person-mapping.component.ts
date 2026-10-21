import { Component, OnDestroy, OnInit } from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { MatDialog } from '@angular/material/dialog';
import { Subject, Subscription, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { SalesPersonService } from '../../../shared/services/sales-person.service';
import { AuthService } from '../../../shared/services/auth/auth.service';
import { AppLoaderService } from '../../../shared/services/app-loader/app-loader.service';
import { PageIds } from '../../../shared/constants/page-ids';
import { MessageQueueService } from '../services/message-queue.service';
import { ScopedLoader } from '../services/scoped-loader';
import { SelectAreaDialogComponent } from '../dialogs/select-area-dialog/select-area-dialog.component';
import { PagePermission, SalesPerson } from '../models/sales-person-planning.models';

/**
 * "Sales Person" tab (selector `sales-person-mapping`, minified `jm`).
 * Lists Firestore `SalesPerson` docs filtered by Active / In-Active, lets the user activate/deactivate a
 * sales person and assign (ADD/EDIT) an area via the Select Area dialog.
 */
@Component({
  selector: 'sales-person-mapping',
  templateUrl: './sales-person-mapping.component.html',
  styleUrls: ['./sales-person-mapping.component.scss'],
  animations: [trigger('animate', [transition('* => *', [style({ opacity: 0 }), animate('300ms', style({ opacity: 1 }))])])],
})
export class SalesPersonMappingComponent implements OnInit, OnDestroy {
  pageId = PageIds.crm_salesperson_planning;
  dataSource: SalesPerson[] = [];
  salesPersons: SalesPerson[] = [];
  salesPersonColumns: string[] = ['Name', 'Mobile Number', 'Area Name', 'Customer Count', 'Is Active', 'Action'];
  /** mat-select value: 'true' = Active, 'false' = In-Active (strings). */
  selectedOption = 'true';
  permissionObj: PagePermission;
  permissionSubscription: Subscription;
  private destroy$ = new Subject<void>();
  private loader: ScopedLoader;

  constructor(
    private salesPersonService: SalesPersonService,
    private dialog: MatDialog,
    private egretLoader: AppLoaderService,
    private backendService: MessageQueueService,
    private authService: AuthService
  ) {
    this.loader = new ScopedLoader(this.egretLoader);
  }

  async ngOnInit() {
    this.permissionSubscription = this.authService.permission$.pipe(takeUntil(this.destroy$)).subscribe(async (permissions: any) => {
      console.log('this.permissionObj res:- ', permissions);
      if (permissions && Object.keys(permissions).length > 0) {
        this.permissionObj = permissions[this.pageId];
        console.log('this.permissionObj:- ', this.permissionObj);
      }
    });
    this.loader.open();
    try {
      await this.getSalesPerson();
    } catch (error) {
      console.log('getSalesPerson Error ::: ', error);
    } finally {
      this.loader.close();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // The tab is destroyed on every tab switch: never leave its "Please wait" dialog behind.
    this.loader.close();
  }

  async getSalesPerson() {
    this.salesPersons = (await this.salesPersonService.getSalesPersons()) || [];
    this.getFilteredSalesPersons(this.selectedOption);
  }

  getFilteredSalesPersons(option: string) {
    this.dataSource = this.salesPersons.filter(option === 'true' ? (sp) => sp.isActive : (sp) => sp.isActive === false);
  }

  onSelectionChange(option: string) {
    this.selectedOption = option;
    this.getFilteredSalesPersons(this.selectedOption);
  }

  /** ADD / EDIT button in the "Action" column. */
  selectAreaPopUp(salesPerson: SalesPerson) {
    this.dialog
      .open(SelectAreaDialogComponent, {
        width: '50%',
        disableClose: true,
        data: {
          title: 'Assign Area',
          salesPerson,
          existingSalesPersons: this.dataSource
            .filter((sp) => sp.id != salesPerson.id)
            .map((sp) => ({ id: sp.id, name: sp.name, areaId: sp.areaId, areaName: sp.areaName })),
        },
      })
      .afterClosed()
      .subscribe(async () => {
        try {
          await this.getSalesPerson();
        } catch (error) {
          console.log('getSalesPerson Error ::: ', error);
        }
      });
  }

  async deleteFutureTasksOnSalesPersonDeactivation(salesPersonId: string, currentAreaId: string) {
    const message = {
      messageType: 'DeActivateSalesPerson',
      input: JSON.stringify({ salesPersonId, currentAreaId }),
    };
    await this.backendService.postMessageToQueue(message);
  }

  /** Activate / Deactivate buttons in the "Status" column. */
  async changeSalesPersonStatus(salesPersonId: string, isActive: boolean) {
    try {
      const salesPerson = this.dataSource.find((sp) => sp.id === salesPersonId);
      // The SweetAlert1-only options of the bundle (type: 'warning', closeOnConfirm: true) are dropped: sweetalert2
      // ignored them (no icon was shown) and logged "Unknown parameter" warnings.
      const swalOptions: any = {
        title: isActive ? 'Activate Sales Person' : 'Deactivate Sales Person',
        text: isActive
          ? 'Do you want to activate this Sales Person?'
          : salesPerson.areaId.length === 0
          ? 'Do you want to deactivate this Sales Person?'
          : `Deactivating the Sales Person will also unmap the current area ${salesPerson.areaName}. Are you sure?`,
        showCancelButton: true,
        confirmButtonColor: '#13BB6F',
        confirmButtonText: isActive ? 'Yes, Activate!' : 'Yes, Deactivate!',
      };
      const result = await Swal.fire(swalOptions);
      if (result.value) {
        this.loader.open();
        const statusUpdate = isActive ? { isActive } : { isActive, customerCount: 0, cluster: { id: '', name: '' } };
        // Writes RTDB Customer/{id} + Firestore SalesPerson/{id} (the bundle called it twice).
        await this.salesPersonService.updateSalesPersonStatus(salesPersonId, statusUpdate);
        if (isActive == false && salesPerson.areaId.length != 0) {
          await this.deleteFutureTasksOnSalesPersonDeactivation(salesPersonId, salesPerson.areaId);
        }
        const index = this.dataSource.findIndex((sp) => sp.id === salesPersonId);
        if (index !== -1) {
          this.dataSource[index].isActive = isActive;
        }
        await this.getSalesPerson();
        Swal.fire({
          title: '',
          text: isActive ? 'Sales Person Activated successfully.' : 'Sales Person Deactivated successfully.',
          icon: 'success',
        });
      }
    } catch (error) {
      this.handleError(error);
    } finally {
      this.loader.close();
    }
  }

  handleError(error: any) {
    console.log('changeSalesPersonStatus Error ::: ', error);
    Swal.fire({ title: '', text: 'Something went wrong!', icon: 'error' });
  }
}
