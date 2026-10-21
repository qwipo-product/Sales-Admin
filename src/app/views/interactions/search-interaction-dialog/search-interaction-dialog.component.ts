// Reconstructed from chunk 374.ebdfb6cdb5b2c104.js (component "$", selector app-search-interaction-dialog).
// Opened by InteractionListComponent.openPopUp() with
// { width: '72%', disableClose: true, panelClass: 'custom-dialog-class',
//   data: { title: 'Interaction Search', searchFields: <current searchInteractionInput> } }.
// Closes with the form value: { mobileNumber, startDate: 'yyyy-MM-dd', endDate: 'yyyy-MM-dd', salesPersonIds: {id,name}[] }
// or with undefined when the close icon is clicked.
import { MatOption } from '@angular/material/core';
import { Component, EventEmitter, Inject, OnInit, Output, ViewChild } from '@angular/core';
import { formatDate } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSelect } from '@angular/material/select';
import Swal from 'sweetalert2';

import { SalesPersonService } from 'app/shared/services/sales-person.service';
import { isValidMobileNumber } from 'app/shared/helpers/common.helper'; // main.js 1972 (export "OQ")

@Component({
  selector: 'app-search-interaction-dialog',
  templateUrl: './search-interaction-dialog.component.html',
  styleUrls: ['./search-interaction-dialog.component.scss'], // empty in the bundle
})
export class SearchInteractionDialogComponent implements OnInit {
  @ViewChild('salesPersonSelectRef') salesPersonSelectRef: MatSelect;
  @Output() dialogClosed = new EventEmitter<any>(); // never emitted

  selectedSalesPersonIds: { id: string; name: string }[] = [];
  dataSource: FormGroup; // (sic) the search FormGroup is named "dataSource"
  salesPersonList: any[];

  constructor(
    public dialogRef: MatDialogRef<SearchInteractionDialogComponent>,
    private fb: FormBuilder,
    private salesPersonService: SalesPersonService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.dataSource = this.interactionSearchForm(data.searchFields);
  }

  async ngOnInit() {
    // Firestore collection "SalesPerson"
    this.salesPersonList = await this.salesPersonService.getSalesPersons();
  }

  showWarningMessage(message: string) {
    Swal.fire('warning', message, 'warning');
    return new Error(message);
  }

  search() {
    if (!this.dataSource.value.startDate || !this.dataSource.value.endDate) {
      this.showWarningMessage('Please enter Start & End dates.');
      return;
    }
    const endDate = new Date(this.dataSource.value.endDate);
    const startDate = new Date(this.dataSource.value.startDate);
    startDate.setHours(0, 1, 0, 0);
    endDate.setHours(23, 59, 59, 0);
    if (endDate < startDate) {
      Swal.fire('Warning', 'End Date should not be less than Start Date', 'warning');
      return;
    }
    if (this.dataSource.value.mobileNumber && isValidMobileNumber(this.dataSource.value.mobileNumber) == false) {
      Swal.fire('warning', 'Please give the Customer Mobile Number 10 Digits', 'warning');
      return;
    }
    const formattedStartDate = formatDate(this.dataSource.value.startDate, 'yyyy-MM-dd', 'en-US');
    const formattedEndDate = formatDate(this.dataSource.value.endDate, 'yyyy-MM-dd', 'en-US');
    this.dataSource.patchValue({ startDate: formattedStartDate, endDate: formattedEndDate });
    // mutates the (cached) value object directly rather than the form control
    this.dataSource.value.salesPersonIds = this.selectedSalesPersonIds || [];
    this.dialogRef.close(this.dataSource.value);
  }

  getSelectedSalesPerson() {
    const selectedIds = (this.salesPersonSelectRef.selected as MatOption[]).map((option: any) => option.value.id);
    this.selectedSalesPersonIds = this.salesPersonList
      .filter((salesPerson) => selectedIds.includes(salesPerson.id))
      .map((salesPerson) => ({ id: salesPerson.id, name: salesPerson.name }));
  }

  interactionSearchForm(searchFields: any): FormGroup {
    return this.fb.group({
      mobileNumber: searchFields.mobileNumber || '',
      startDate: searchFields.startDate || [null, Validators.required],
      endDate: searchFields.endDate || [null, Validators.required],
      salesPersonIds: this.selectedSalesPersonIds || [],
    });
  }
}
