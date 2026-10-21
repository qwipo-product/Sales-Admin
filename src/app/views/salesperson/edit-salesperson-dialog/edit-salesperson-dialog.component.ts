// Reconstructed from chunk 195.b9a9d9fa81c4f371.js (module 7195, class `G`).
// Opened by SalespersonListComponent.editSalespersonPopUp(id) with
//   { width: '40%', disableClose: true, data: { salespersonId } }.
// Closes with the Firestore update payload on success (list reloads), or with undefined (no reload).
// If the Firestore update fails, an error alert is shown and the dialog stays open (the original had no handling).
import { ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject, Subscription, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { AuthService, SalesPersonService, UserService } from 'app/shared/services'; // main 9143 (e8, Yf, KD)

export interface EditSalespersonDialogData {
  salespersonId: string;
}

/** Option shape built from Firestore `Users` docs (fields: name, id, user_type, mobile_number). */
export interface LeadOption {
  name: string;
  userId: string;
  user_type: number;
  mobileNumber: string;
}

export interface SalesPersonLeadUpdate {
  salesLeadId?: string;
  salesManagerId?: string;
  salesLead?: { id: string; name: string; mobileNumber: string };
  salesManager?: { id: string; name: string; mobileNumber: string };
}

@Component({
  selector: 'app-edit-salesperson-dialog',
  templateUrl: './edit-salesperson-dialog.component.html',
  styleUrls: ['./edit-salesperson-dialog.component.scss'],
})
export class EditSalespersonDialogComponent implements OnInit, OnDestroy {
  pageId = 'crm_sales_person_list';
  permissionObj: any;
  permissionSubscription: Subscription;

  leadList: LeadOption[] = [];
  managerList: LeadOption[] = [];
  selectedSalesLead: LeadOption;
  selectedSalesManager: LeadOption;

  form: FormGroup;
  private destroy$ = new Subject<void>();

  constructor(
    public dialogRef: MatDialogRef<EditSalespersonDialogComponent>,
    private fb: FormBuilder,
    private authService: AuthService,
    private cdRef: ChangeDetectorRef,
    private userService: UserService,
    private salesPersonService: SalesPersonService,
    @Inject(MAT_DIALOG_DATA) public data: EditSalespersonDialogData
  ) {
    this.form = this.fb.group({
      leads: new FormControl(''),
      manager: new FormControl([]),
      lead: [''], // unused
    });
  }

  async ngOnInit() {
    this.permissionSubscription = this.authService.permission$
      .pipe(takeUntil(this.destroy$))
      .subscribe(async (permissions) => {
        if (permissions && Object.keys(permissions).length > 0) {
          this.permissionObj = permissions[this.pageId];
        }
      });
    this.cdRef.detectChanges();
    try {
      await this.getLeadList();
      await this.getManagerList();
    } catch (error) {
      console.error('Error occurred while loading leads / managers:', error);
      Swal.fire('error', 'Failed to load leads. Please try again later.', 'error');
    }
  }

  /** Firestore `Users` where user_type == 2. */
  async getLeadList() {
    const users = await this.userService.fetchSalesPersons(2);
    this.leadList = this.mapToLeads(users);
  }

  mapToLeads(users: any[]): LeadOption[] {
    return users.map((user) => ({
      name: user.name,
      userId: user.id,
      user_type: user.user_type,
      mobileNumber: user.mobile_number,
    }));
  }

  /** NOTE: same query as getLeadList() (user_type == 2) - lead and manager dropdowns list the same users. */
  async getManagerList() {
    const users = await this.userService.fetchSalesPersons(2);
    this.managerList = this.mapToManager(users);
  }

  mapToManager(users: any[]): LeadOption[] {
    return users.map((user) => ({
      name: user.name,
      userId: user.id,
      user_type: user.user_type,
      mobileNumber: user.mobile_number,
    }));
  }

  getSelectedLead() {
    this.selectedSalesLead = this.form.get('leads').value;
  }

  getSelectedSalesManager() {
    this.selectedSalesManager = this.form.get('manager').value;
  }

  /** Firestore updateDoc(`SalesPerson/{data.salespersonId}`, payload). */
  async update() {
    try {
      await this.saveChanges();
    } catch (error) {
      // Keep the dialog open (no payload -> no list reload) so the user can retry or close it.
      console.error('Error occurred while updating sales lead / manager:', error);
      Swal.fire('error', 'Failed to update changes. Please try again later.', 'error');
    }
  }

  private async saveChanges() {
    if (this.selectedSalesLead && this.selectedSalesManager) {
      const payload: SalesPersonLeadUpdate = {
        salesLeadId: this.selectedSalesLead.userId,
        salesManagerId: this.selectedSalesManager.userId,
        salesLead: {
          id: this.selectedSalesLead.userId,
          name: this.selectedSalesLead.name,
          mobileNumber: this.selectedSalesLead.mobileNumber,
        },
        salesManager: {
          id: this.selectedSalesManager.userId,
          name: this.selectedSalesManager.name,
          mobileNumber: this.selectedSalesManager.mobileNumber,
        },
      };
      await this.salesPersonService.updateSalesPerson(this.data.salespersonId, payload);
      Swal.fire('success', 'changes updated successfully', 'success');
      this.dialogRef.close(payload);
    } else if (this.selectedSalesLead) {
      const payload: SalesPersonLeadUpdate = {
        salesLeadId: this.selectedSalesLead.userId,
        salesLead: {
          id: this.selectedSalesLead.userId,
          name: this.selectedSalesLead.name,
          mobileNumber: this.selectedSalesLead.mobileNumber,
        },
      };
      await this.salesPersonService.updateSalesPerson(this.data.salespersonId, payload);
      Swal.fire('success', 'Sales Lead updated Successfully', 'success');
      this.dialogRef.close(payload);
    } else if (this.selectedSalesManager) {
      const payload: SalesPersonLeadUpdate = {
        salesManagerId: this.selectedSalesManager.userId,
        salesManager: {
          id: this.selectedSalesManager.userId,
          name: this.selectedSalesManager.name,
          mobileNumber: this.selectedSalesManager.mobileNumber,
        },
      };
      await this.salesPersonService.updateSalesPerson(this.data.salespersonId, payload);
      Swal.fire('success', 'Sales manager Updated successfully', 'success');
      this.dialogRef.close(payload);
    } else {
      Swal.fire('warning', 'No changes updated', 'warning');
      this.dialogRef.close();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
