import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { capitalizeFirstLetter, generateSearchKey, isValidAreaName } from '../../../../shared/helpers/utils';

/**
 * "Update Area Name" dialog (selector `app-add-area-name-dialog`, minified `F`).
 * Opened by the edit pencil in the Areas table with data { title: 'Update Area Name', cluster, currentClusterSearchKeys }.
 * Closes with { cluster: { id, name, searchKey }, previousSearchKey }.
 * A new name whose searchKey belongs to another area shows "The name already exists..." (isNameExists).
 */
@Component({
  selector: 'app-add-area-name-dialog',
  templateUrl: './add-area-name-dialog.component.html',
  styleUrls: ['./add-area-name-dialog.component.scss'],
})
export class AddAreaNameDialogComponent {
  currentClusterSearchKeys: string[] = [];
  previousSearchKey = '';
  isNameExists = false;
  isNameValid = false;
  dataSource: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<AddAreaNameDialogComponent>,
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.dataSource = this.fb.group({
      id: [data.cluster.id, Validators.required],
      name: [data.cluster.name, Validators.required],
      searchKey: [data.cluster.searchKey, Validators.required],
    });
    this.previousSearchKey = this.data.cluster.searchKey;
    this.currentClusterSearchKeys = data.currentClusterSearchKeys;
  }

  /** "Update" button. */
  updateAreaName() {
    this.isNameValid = false;
    this.isNameExists = false;
    this.dataSource.value.name = (this.dataSource.value.name || '').trim();
    if (isValidAreaName(this.dataSource.value.name)) {
      this.dataSource.value.name = capitalizeFirstLetter(this.dataSource.value.name);
      this.dataSource.value.searchKey = generateSearchKey(this.dataSource.value.name);
      if (
        this.dataSource.value.searchKey !== this.previousSearchKey &&
        (this.currentClusterSearchKeys || []).includes(this.dataSource.value.searchKey)
      ) {
        this.isNameExists = true;
        return;
      }
      this.dialogRef.close({ cluster: this.dataSource.value, previousSearchKey: this.previousSearchKey });
    } else {
      this.isNameValid = true;
    }
  }
}
