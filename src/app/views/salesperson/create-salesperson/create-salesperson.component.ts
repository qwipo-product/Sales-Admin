// Reconstructed from chunk 195.b9a9d9fa81c4f371.js (module 7195, class `xe`) - standalone component.
// Route: /salesperson-list/create-salesperson  (RoutePaths.SALESPERSON_CREATE)
//
// Create flow:
//   1. POST `${coreUrl}/customer` with the snake_case core entity (mapSalesPersonCd) -> new id (response.data[0].id)
//   2. if an id came back: Firestore setDoc(`SalesPerson/{id}`, camelCase doc from mapSalesPersonFb), verified by
//      reading the doc back (FirestoreService.insertDocWithId swallows write errors)
//   3. success alert + navigate back to /salesperson-list only when both steps succeeded; otherwise an error alert is
//      shown and the user stays on the form (the original navigated away silently when step 1 returned null).
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTableModule } from '@angular/material/table';
import { Subject, Subscription, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { AuthService, SalesPersonService } from 'app/shared/services';                 // main 9143 (e8, Yf)
import { AppLoaderService } from 'app/shared/services/app-loader/app-loader.service';  // main 7009
import { CustomersService } from 'app/shared/services/customers.service';             // common 2541
import { AlertType, SalesPersonStatus, STATES } from 'app/shared/models/enums';       // main 8352 (RN, d3, $q)
import { generateUUID, isValidPinCode, restrictMaxLength } from 'app/shared/helpers/utils'; // main 1972 (M8, bW, H6)

export interface CreateSalespersonFormValue {
  name: string;
  businessName: string;
  mobileNumber: number;
  salespersonEmail: string;
  pinCode: number;
  street: string;
  landmark: string;
  area: string;
  city: string;
  state: string; // state *name* from STATES
  latitude: number;
  longitude: number;
  status: SalesPersonStatus; // 0 | 1
}

@Component({
  selector: 'app-create-salesperson',
  standalone: true,
  templateUrl: './create-salesperson.component.html',
  styleUrls: ['./create-salesperson.component.scss'],
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
export class CreateSalespersonComponent implements OnInit, OnDestroy {
  /** [0, 1] -> rendered as "InActive" / "Active". */
  salesPersonStatus = Object.values(SalesPersonStatus).filter((value) => typeof value === 'number');
  pageId = 'crm_sales_person_list';
  states = STATES;
  permissionObj: any;
  permissionSubscription: Subscription;
  dataSource: FormGroup;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private customersService: CustomersService,
    private loader: AppLoaderService,
    private auth: AuthService,
    private salesPersonService: SalesPersonService
  ) {
    this.permissionSubscription = this.auth.permission$
      .pipe(takeUntil(this.destroy$))
      .subscribe(async (permissions) => {
        if (permissions && Object.keys(permissions).length > 0) {
          this.permissionObj = permissions[this.pageId];
        }
      });
    this.dataSource = this.fb.group({
      name: [null, [Validators.required]],
      businessName: [null, [Validators.required]],
      mobileNumber: [null, [Validators.required]],
      salespersonEmail: [null, [Validators.required, Validators.email]],
      pinCode: [null, [Validators.required]],
      street: [null, [Validators.required]],
      landmark: [null, [Validators.required]],
      area: [null, [Validators.required]],
      city: [null, [Validators.required]],
      state: [null, [Validators.required]],
      latitude: [null, [Validators.required]],
      longitude: [null, [Validators.required]],
      status: [null, [Validators.required]],
    });
    this.fixMaxLength();
  }

  ngOnInit() {}

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  hasSpecialCharactersOrNumbers(value: string): boolean {
    return /[^a-zA-Z\s]/.test(value);
  }

  validation(): boolean {
    const { pinCode, name, businessName, mobileNumber } = this.dataSource.value;
    // pinCode is required (non-empty) here; the original `pinCode && ...` guard let a pin code of 0 through.
    if (!isValidPinCode(pinCode)) {
      this.showMessage('PinCode is not correct. Please provide a proper PinCode  number.', AlertType.Warning);
      return false;
    }
    if (name && this.hasSpecialCharactersOrNumbers(name)) {
      this.showMessage('please enter valid name', AlertType.Warning);
      return false;
    }
    if (businessName && this.hasSpecialCharactersOrNumbers(businessName)) {
      this.showMessage('please enter valid business name', AlertType.Warning);
      return false;
    }
    const negativeFields = this.validateNegativeValues(this.dataSource.value);
    if (negativeFields.length) {
      this.showMessage(`${negativeFields} ,have negative values Please Check`, AlertType.Warning);
      return false;
    }
    if (this.dataSource.value.latitude == 0) {
      this.showMessage('give proper latitude.', AlertType.Warning);
      return false;
    }
    if (this.dataSource.value.longitude == 0) {
      this.showMessage('give proper longitude.', AlertType.Warning);
      return false;
    }
    // Exactly 10 digits (the original only checked the length, so e.g. "9876543.21" passed).
    if (!/^\d{10}$/.test(mobileNumber.toString())) {
      this.showMessage('give full mobile number', AlertType.Warning);
      return false;
    }
    return true;
  }

  /** Returns the labels of fields holding negative numbers (the original labelled longitude as "latitude"). */
  validateNegativeValues(formValue: CreateSalespersonFormValue): string[] {
    const fields = [
      { name: 'mobile number', value: formValue.mobileNumber },
      { name: 'pin code', value: formValue.pinCode },
      { name: 'latitude', value: formValue.latitude },
      { name: 'longitude', value: formValue.longitude },
    ];
    return fields.filter((field) => field.value < 0).map((field) => field.name);
  }

  async saveCustomer() {
    this.loader.open();
    try {
      if (this.dataSource.invalid) {
        const message = this.isOnlyEmailFormatInvalid()
          ? 'please enter valid email'
          : 'Please fill all required fields.';
        this.showMessage(message, AlertType.Warning);
        return;
      }
      if (!this.validation()) {
        return;
      }
      await this.createCustomer();
    } catch (error) {
      console.error('Error occurred during customer creation:', error);
      this.showMessage('Failed to create customer. Please try again later.', AlertType.Error);
    } finally {
      this.loader.close();
    }
  }

  /** True when every field is filled and the only problem is a malformed email address. */
  isOnlyEmailFormatInvalid(): boolean {
    const controls = this.dataSource.controls;
    return (
      controls['salespersonEmail'].hasError('email') &&
      Object.keys(controls).every((key) => key === 'salespersonEmail' || controls[key].valid)
    );
  }

  /** Truncates mobileNumber to 10 and pinCode to 6 characters as the user types. */
  fixMaxLength() {
    restrictMaxLength(this.dataSource, [
      { property: 'mobileNumber', maxLength: 10 },
      { property: 'pinCode', maxLength: 6 },
    ]);
  }

  showMessage(message: string, type: AlertType) {
    Swal.fire('', message, type as any);
  }

  /** Firestore `SalesPerson/{id}` document (camelCase). */
  mapSalesPersonFb(formValue: CreateSalespersonFormValue, id: string) {
    const salesPerson = formValue;
    return {
      id: id,
      name: salesPerson.name,
      businessName: salesPerson.businessName,
      mobileNumber: salesPerson.mobileNumber,
      email: salesPerson.salespersonEmail,
      enableLogOut: false,
      isActive: salesPerson.status == 1,
      userTypeId: 7,
      latitude: salesPerson.latitude,
      longitude: salesPerson?.longitude,
      address: {
        street: salesPerson?.street,
        landmark: salesPerson?.landmark,
        area_code: salesPerson?.area,
        city: salesPerson?.city,
        state: salesPerson?.state,
        country: 'INDIA',
        latitude: salesPerson?.latitude,
        longitude: salesPerson?.longitude,
        pincode: salesPerson?.pinCode,
      },
    };
  }

  /** Core API (`POST ${coreUrl}/customer`) entity (snake_case). */
  mapSalesPersonCd(formValue: CreateSalespersonFormValue) {
    const salesPerson = formValue;
    return {
      id: generateUUID(),
      name: salesPerson?.name,
      business_name: salesPerson.businessName,
      business_tag_status: 1,
      business_type_id: 7,
      mobile_number: salesPerson?.mobileNumber.toString(),
      email: salesPerson?.salespersonEmail,
      gst_number: '',
      photo_id_url: '',
      shop_url: '',
      gst_certificate_url: '',
      registration_document_url: '',
      user_type_id: 7,
      status: salesPerson?.status,
      push_notification_token: '',
      registered_date: new Date(),
      address: {
        street: salesPerson?.street,
        landmark: salesPerson?.landmark,
        area_code: salesPerson?.area,
        city: salesPerson?.city,
        state: salesPerson?.state,
        country: 'INDIA',
        latitude: salesPerson?.latitude,
        longitude: salesPerson?.longitude,
        pincode: salesPerson?.pinCode,
      },
    };
  }

  async createCustomer() {
    const corePayload = this.mapSalesPersonCd(this.dataSource.value);
    try {
      const salesPersonId = await this.customersService.createSalesPerson(corePayload);
      if (salesPersonId == null) {
        // The core API failed or returned no id: stay on the form instead of navigating away silently.
        throw new Error('Core API returned no sales person id');
      }
      const firestoreDoc = this.mapSalesPersonFb(this.dataSource.value, salesPersonId);
      await this.salesPersonService.createSalesPersons(salesPersonId, firestoreDoc);
      // createSalesPersons() never rejects (insertDocWithId logs and swallows errors): confirm the doc was written.
      const savedDoc = await this.salesPersonService.getSalesPersonById(salesPersonId);
      if (!savedDoc) {
        throw new Error(`Firestore SalesPerson/${salesPersonId} was not written`);
      }
      this.showMessage('SalesPerson created successfully', AlertType.Success);
      this.router.navigateByUrl('/salesperson-list');
    } catch (error) {
      console.error('Error occurred while creating customer:', error);
      this.showMessage('Failed to create customer. Please try again later.', AlertType.Error);
    }
  }
}
