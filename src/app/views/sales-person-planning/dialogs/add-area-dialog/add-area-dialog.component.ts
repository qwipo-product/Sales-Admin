import { Component, EventEmitter, Inject, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';

import { ClusterType } from '../../../../shared/models/enums';
import {
  capitalizeFirstLetter,
  convertToLatLng,
  generateSearchKey,
  isValidAreaName,
  isValidGeoJsonFile,
} from '../../../../shared/helpers/utils';

/**
 * "Add Area" dialog (selector `add-area-dialog`, minified `Pt`).
 * Opened by SalesPersonAreasComponent.addCluster() with data { title: 'Add Area', cluster: null, currentClusterSearchKeys }.
 * Closes with { cluster: formValue (id, name, searchKey, customerCount, coordinates: LatLng[] | null, type), isUpdate }.
 * The optional .geojson must be a FeatureCollection with exactly one Polygon feature.
 */
@Component({
  selector: 'add-area-dialog',
  templateUrl: './add-area-dialog.component.html',
  styleUrls: ['./add-area-dialog.component.scss'],
})
export class AddAreaDialogComponent {
  @Output() dialogClosed = new EventEmitter<any>();

  currentClusterSearchKeys: string[] = [];
  txtJson = '';
  errorMessage: any = null;
  isNameExists = false;
  isGeoJsonNotSingle = false;
  isMandatoryProperties = false;
  isNameValid = false;
  dataSource: FormGroup;
  isUpdate: any;
  jsonGeoData: any;
  selectedFiles: FileList | null;

  constructor(
    public dialogRef: MatDialogRef<AddAreaDialogComponent>,
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.dataSource = this.fb.group({
      id: [''],
      name: ['', Validators.required],
      searchKey: ['', Validators.required],
      customerCount: ['', Validators.required],
      coordinates: [null],
      type: [ClusterType.General, Validators.required],
    });
    this.isUpdate = this.dataSource.value.isUpdate; // always undefined (no such control)
    if (data.cluster) {
      this.dataSource.patchValue(data.cluster);
    }
    this.currentClusterSearchKeys = data.currentClusterSearchKeys;
  }

  /** "Save" button. Note: mutates `dataSource.value` directly (as in prod) instead of setValue/patchValue. */
  addNewArea() {
    this.isNameValid = false;
    this.isNameExists = false;
    this.isMandatoryProperties = false;
    this.isGeoJsonNotSingle = false;
    if (!this.dataSource.value.name) {
      Swal.fire('Warning!', 'Please add the Area Name!', 'warning');
      return;
    }
    this.dataSource.value.name = this.dataSource.value.name.trim();
    if (!isValidAreaName(this.dataSource.value.name)) {
      this.isNameValid = true;
      return;
    }
    this.dataSource.value.name = capitalizeFirstLetter(this.dataSource.value.name);
    this.dataSource.value.searchKey = generateSearchKey(this.dataSource.value.name);
    if (this.currentClusterSearchKeys.includes(this.dataSource.value.searchKey)) {
      this.isNameExists = true;
    } else if (this.jsonGeoData !== undefined && (!this.jsonGeoData?.features || this.jsonGeoData.features.length != 1)) {
      this.isGeoJsonNotSingle = true;
    } else {
      if (this.jsonGeoData !== undefined) {
        const ring = this.jsonGeoData.features[0]?.geometry?.coordinates?.[0];
        if (!(Array.isArray(ring) && Array.isArray(ring[0]) && typeof ring[0][0] === 'number')) {
          // A file was chosen but its feature has no Polygon ring of [longitude, latitude] positions.
          Swal.fire('', 'Invalid File', 'error');
          return;
        }
        // GeoJSON [longitude, latitude] -> { latitude, longitude }
        this.dataSource.value.coordinates = convertToLatLng(ring);
      }
      this.dialogRef.close({ cluster: this.dataSource.value, isUpdate: this.isUpdate });
    }
  }

  onSelectFile(event: any) {
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
        this.jsonGeoData = geoJson;
        this.selectedFiles = event.target.files;
        console.log('this.selectedFiles ::::', this.jsonGeoData);
      } catch {
        this.resetFileInput();
        Swal.fire('', 'Invalid File', 'error');
      }
    };
  }

  /** Clears the chosen file AND its parsed content (a previously chosen valid file must not be used afterwards). */
  resetFileInput() {
    this.selectedFiles = null;
    this.jsonGeoData = undefined;
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }
}
