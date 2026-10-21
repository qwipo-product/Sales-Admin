import { Component, EventEmitter, Inject, Output } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';

import { isValidGeoJsonFile } from '../../../../shared/helpers/utils';

/**
 * "Upload JSON" dialog for the bulk polygon update (selector `add-json-dialog`, minified `Z`).
 * Opened by SalesPersonAreasComponent.addPolygonToClustersPopUp() with data { title: 'Add Geo-Json' }.
 * Validation: .geojson/.json extension; every feature.properties must own `id`, `type` and `AreaCode`
 * (case-sensitive). Closes with { polygons: featureCollection.features || [] }.
 */
@Component({
  selector: 'add-json-dialog',
  templateUrl: './add-json-dialog.component.html',
  styleUrls: ['./add-json-dialog.component.scss'],
})
export class AddJsonDialogComponent {
  @Output() dialogClosed = new EventEmitter<any>();

  txtJson = '';
  polygonRawData: any = {};
  isMandatoryProperties = false;
  isFileSelected = false;
  selectedFiles: FileList | null;

  constructor(
    public dialogRef: MatDialogRef<AddJsonDialogComponent>,
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onSelectFile(event: any) {
    this.isMandatoryProperties = false;
    this.isFileSelected = false;
    const file = event.target.files[0];
    if (!file) {
      Swal.fire('Warning!', 'Please upload the file!', 'warning');
      this.resetFileInput();
      return;
    }
    if (file && !isValidGeoJsonFile(file.name)) {
      Swal.fire('Warning!', 'Invalid File Format!!', 'warning');
      this.resetFileInput();
      return;
    }
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = (e: any) => {
      try {
        this.txtJson = e.target.result?.toString() || '{}';
        const geoJson = JSON.parse(this.txtJson);
        const featuresMissingProperties = geoJson.features.filter((feature: any) => {
          const properties = feature.properties;
          return !properties.hasOwnProperty('id') || !properties.hasOwnProperty('type') || !properties.hasOwnProperty('AreaCode');
        });
        if (featuresMissingProperties.length > 0) {
          // Drop any previously chosen file so it is not uploaded instead.
          this.resetFileInput();
          this.isMandatoryProperties = true;
          return;
        }
        this.polygonRawData = geoJson;
        this.selectedFiles = event.target.files;
      } catch {
        this.resetFileInput();
        Swal.fire('', 'Invalid File', 'error');
      }
    };
  }

  /** Clears the chosen file, its parsed content and the file input (prod looked the input up but never cleared it). */
  resetFileInput() {
    this.selectedFiles = null;
    this.polygonRawData = {};
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  /** "Upload Coordinates" button. */
  submit() {
    this.isFileSelected = false;
    if (this.selectedFiles == null) {
      this.isFileSelected = true;
      this.resetFileInput();
      return;
    }
    const polygons = this.polygonRawData.features || [];
    this.resetFileInput();
    this.dialogRef.close({ polygons });
  }
}
