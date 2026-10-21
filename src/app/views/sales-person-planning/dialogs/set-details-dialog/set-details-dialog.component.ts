import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface SetDetailsItem {
  label: string;
  /** Second, smaller line under the label. */
  detail?: string;
  /** Right-aligned number or text. */
  value?: string | number;
  /** Colour dot before the label. */
  color?: string;
}

export interface SetDetailsDialogData {
  title: string;
  subtitle?: string;
  items: SetDetailsItem[];
}

/** Small list pop-up of the Generate Tasks dialog: every brand of a set/day cell ("+3 more") or the shops of a set. */
@Component({
  selector: 'set-details-dialog',
  templateUrl: './set-details-dialog.component.html',
  styleUrls: ['./set-details-dialog.component.scss'],
})
export class SetDetailsDialogComponent {
  constructor(public dialogRef: MatDialogRef<SetDetailsDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: SetDetailsDialogData) {}
}
