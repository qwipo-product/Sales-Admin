import { Component, Inject } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';

import { convertToLatLng, isValidGeoJsonFile } from '../../../../shared/helpers/utils';

/**
 * "Upload JSON" dialog used by the cloud_upload ("Update Polygon") button
 * (selector `app-update-coordinates-dialog`, minified `It`).
 * Opened with data { title: 'Update Coordinates Name', cluster: deepCopy(area), updatedCoordinates: null }.
 * Accepts a .geojson/.json FeatureCollection with exactly one feature; closes with
 * { cluster: data.cluster, updatedCoordinates: LatLng[] | null } (features[0].geometry.coordinates[0] converted).
 */
@Component({
  selector: 'app-update-coordinates-dialog',
  templateUrl: './update-coordinates-dialog.component.html',
  styleUrls: ['./update-coordinates-dialog.component.scss'],
})
export class UpdateCoordinatesDialogComponent {
  isNameExists = false;
  txtJson = '';
  polygonRawData: any = {};
  isGeoJsonNotSingle = false;
  isFileSelected = false;
  jsonGeoData: any;
  selectedFiles: FileList | null;

  constructor(
    public dialogRef: MatDialogRef<UpdateCoordinatesDialogComponent>,
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  /** "Upload Coordinates" button. */
  updateCoordinates() {
    let updatedCoordinates = null;
    if (this.jsonGeoData !== undefined && this.jsonGeoData.features && this.jsonGeoData.features.length != 1) {
      this.isGeoJsonNotSingle = true;
      return;
    }
    if (this.selectedFiles == null) {
      this.isFileSelected = true;
      this.resetFileInput();
      return;
    }
    const ring = this.jsonGeoData?.features?.[0]?.geometry?.coordinates?.[0];
    if (Array.isArray(ring) && Array.isArray(ring[0]) && typeof ring[0][0] === 'number') {
      // GeoJSON [longitude, latitude] -> { latitude, longitude }
      updatedCoordinates = convertToLatLng(ring);
    }
    this.dialogRef.close({ cluster: this.data.cluster, updatedCoordinates });
  }

  onSelectFile(event: any) {
    this.isGeoJsonNotSingle = false;
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
        if (geoJson.features.length !== 1) {
          // Drop any previously chosen file so it is not uploaded instead.
          this.resetFileInput();
          this.isGeoJsonNotSingle = true;
          return;
        }
        this.jsonGeoData = geoJson;
        this.selectedFiles = event.target.files;
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
