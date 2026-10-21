// Reconstructed from chunk 195.b9a9d9fa81c4f371.js (module 7195, inlined standalone component in the routes array).
// Route: /salesperson-list/edit-salesperson-profile/:id  ("Edit Profile" button on the list).
// Only Name and Business Name are editable. Many fields below (uploadedFiles, image urls, businessTypeNames, ...)
// are leftovers copied from a customer-profile page and are unused.
//
// Update flow (updateCustomerById):
//   1. Firestore updateDoc(`SalesPerson/{id}`, { name, businessName })
//   2. PUT `${coreUrl}/customer/{id}` with { name, business_name }
//   3. alert "Customer updated successfully" and navigate to /salesperson-list - only when both writes succeeded
//      (updateSalePersonDb swallows HTTP errors and resolves undefined, so its result is checked here).
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTableModule } from '@angular/material/table';
import Swal from 'sweetalert2';

import { AuthService } from 'app/shared/services/auth.service';                        // main 8175 (e)
import { SalesPersonService } from 'app/shared/services/sales-person.service';        // main 2937 (Y)
import { AppLoaderService } from 'app/shared/services/app-loader/app-loader.service';  // main 7009
import { CustomersService } from 'app/shared/services/customers.service';             // common 2541
import { AlertType, BusinessType, SalesPersonStatus, STATES } from 'app/shared/models/enums'; // main 8352 (RN, _$, d3, $q)

@Component({
  selector: 'app-profile-information',
  standalone: true,
  templateUrl: './profile-information.component.html',
  styleUrls: ['./profile-information.component.scss'],
  imports: [
    MatCardModule,
    MatButtonModule,
    MatTableModule,
    RouterLink,
    MatInputModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatIconModule,
    CommonModule,
    FormsModule,
    MatDatepickerModule,
    MatRadioModule,
    MatNativeDateModule,
    MatPaginatorModule,
    MatSidenavModule,
    MatCheckboxModule,
  ],
})
export class ProfileInformationComponent implements OnInit {
  supplierStatus = Object.values(SalesPersonStatus).filter((value) => typeof value === 'number');
  id = '';
  states = STATES;
  uploadedFiles: { [key: string]: any } = {};
  selectedImages: any[] = [];
  imageBusinessType = '';
  modalTitle = '';
  viewImgUrl = '';
  shopUrl = '';
  gstCertificateUrl = '';
  registrationDocumentUrl = '';
  photoIdUrl = '';
  businessTypeNames: { [key: number]: string } = {
    [BusinessType.Restaurant]: 'Restaurant',
    [BusinessType.Kirana]: 'Kirana',
    [BusinessType.Caterers]: 'Caterers',
    [BusinessType.TiffinCenters]: 'Tiffin Centers',
    [BusinessType.PgHostel]: 'PG/Hostel',
    [BusinessType.Institutional]: 'Institutional',
    [BusinessType.Bakery]: 'Bakery',
    [BusinessType.SweetHouse]: 'Sweet House',
    [BusinessType.VegetableShops]: 'Vegetable shops',
    [BusinessType.Tier2Customer]: 'Tier 2 Customer',
    [BusinessType.Medicals]: 'Medicals Shops',
    [BusinessType.Chemist]: 'Chemist',
    [BusinessType.Cosmetic]: 'Cosmetic',
    [BusinessType.Supermarket]: 'Supermarket',
    [BusinessType.Wholesale]: 'Wholesale',
    [BusinessType.RiceTraders]: 'Rice Traders',
    [BusinessType.OilTraders]: 'Oil Traders',
    [BusinessType.Others]: 'Others',
  };
  dataSource: FormGroup;

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private customersService: CustomersService,
    private loader: AppLoaderService,
    private salesPersonService: SalesPersonService
  ) {}

  async ngOnInit() {
    this.editForms();
    this.route.params.subscribe(async (params) => {
      this.id = params['id'];
      await this.getCustomerById();
    });
  }

  businessTypeKeys(): number[] {
    return Object.keys(this.businessTypeNames).map(Number);
  }

  /** Initial (validated) form; replaced by mapToEditInput() once the Firestore doc loads (same validators). */
  editForms() {
    this.dataSource = this.fb.group({
      name: [null, [Validators.required]],
      businessName: [null, [Validators.required]],
    });
  }

  /** Firestore getDoc(`SalesPerson/{id}`). */
  async getCustomerById() {
    try {
      this.loader.open();
      const salesPerson = await this.salesPersonService.getSalesPersonById(this.id);
      if (!salesPerson) {
        // Missing doc: keep the empty (validated) form and show the load error.
        this.showMessage('Failed to Get customer. Please try again later.', AlertType.Error);
        return;
      }
      this.dataSource = this.mapToEditInput(salesPerson);
      if (salesPerson.status !== undefined && salesPerson.status !== null) {
        // SalesPerson docs written by the create flow have no `status` field.
        this.dataSource.patchValue({ status: salesPerson.status });
      }
    } catch {
      this.showMessage('Failed to Get customer. Please try again later.', AlertType.Error);
    } finally {
      this.loader.close();
    }
  }

  toUppercase(event: any) {
    event.target.value = event.target.value.toUpperCase();
  }

  hasSpecialCharactersOrNumbers(value: string): boolean {
    return /[^a-zA-Z\s]/.test(value);
  }

  async updateCustomer() {
    this.loader.open();
    try {
      if (this.dataSource.invalid) {
        this.showMessage('Please fill all required fields.', AlertType.Warning);
        return;
      }
      const { name, businessName } = this.dataSource.value;
      if (name && this.hasSpecialCharactersOrNumbers(name)) {
        this.showMessage('please enter valid name', AlertType.Warning);
        return false;
      }
      if (businessName && this.hasSpecialCharactersOrNumbers(businessName)) {
        this.showMessage('please enter valid business name', AlertType.Warning);
        return false;
      }
      await this.updateCustomerById();
    } catch (error) {
      console.error('Error occurred during customer update:', error);
      this.showMessage('Failed to update customer. Please try again later.', AlertType.Error);
    } finally {
      this.loader.close();
    }
  }

  showMessage(message: string, type: AlertType) {
    Swal.fire('', message, type as any);
  }

  getFileExtension(fileName: string) {
    return fileName.split('.').pop();
  }

  mapCustomer(formValue: any) {
    return {
      name: formValue.name || '',
      businessName: formValue.businessName || '',
    };
  }

  async updateCustomerById() {
    const payload = {
      name: this.dataSource.value.name,
      businessName: this.dataSource.value.businessName,
    };
    console.log('payload :', payload);
    const customerEntity = this.mapCustomer(this.dataSource.value);
    console.log('customerEntity :', customerEntity);
    try {
      await this.salesPersonService.updateSalesPersonProfile(this.id, customerEntity);
      const coreEntity = {
        name: this.dataSource.value.name,
        business_name: this.dataSource.value.businessName,
      };
      const coreResponse: any = await this.salesPersonService.updateSalePersonDb(this.id, coreEntity);
      // updateSalePersonDb() resolves undefined when the PUT failed (the error is logged and swallowed).
      if (coreResponse === undefined || coreResponse?.success === false) {
        throw new Error('Core API customer update failed');
      }
      this.showMessage('Customer updated successfully', AlertType.Success);
      this.router.navigateByUrl('/salesperson-list');
    } catch (error) {
      console.error('Error occurred while updating customer:', error);
      this.showMessage('Failed to update customer. Please try again later.', AlertType.Error);
    }
  }

  /**
   * Builds the edit form from a Firestore `SalesPerson` document. Name and Business Name keep the required validator
   * of the initial form (the original dropped every validator here); letters/spaces are checked in updateCustomer().
   */
  mapToEditInput(salesPerson: any): FormGroup {
    const data = salesPerson;
    return this.fb.group({
      customerId: new FormControl(data.id || ''),
      name: new FormControl(data.name || '', [Validators.required]),
      email: new FormControl(data.email || ''),
      createdDate: new FormControl(data.createdDate || ''),
      mobileNumber: new FormControl(data.mobileNumber || ''),
      businessName: new FormControl(data.businessName || '', [Validators.required]),
      businessTypeId: new FormControl(data.businessTypeId || ''),
      businessTagStatus: new FormControl(data.businessTagStatus || ''),
      shopUrl: new FormControl(data.shopUrl || ''),
      gstNumber: new FormControl(data && data.gstNumber ? data.gstNumber : 'Un-Registered'),
      gstCertificateUrl: new FormControl(data.gstCertificateUrl || ''),
      registrationDocumentUrl: new FormControl(data.registrationDocumentUrl || ''),
      photoIdUrl: new FormControl(data.photoIdUrl || ''),
      status: new FormControl(data.status || ''),
    });
  }
}
