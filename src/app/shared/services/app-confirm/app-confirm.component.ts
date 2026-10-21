// Source: main.0ad03de76494ddf1.js webpack module 2994 (class `G`, concatenated into the SharedModule module)
// – selector app-confirm, ViewEncapsulation.None. Egret's class name (with its typo) is kept.
import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ConfirmData {
  title?: string;
  message?: string;
}

@Component({
  selector: 'app-confirm',
  templateUrl: './app-confirm.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class AppComfirmComponent {
  constructor(
    public dialogRef: MatDialogRef<AppComfirmComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmData,
  ) {}
}
