// Source: main.0ad03de76494ddf1.js webpack module 2994 (class `Se`) – Egret AppConfirmService.
// Not providedIn root: provided by SharedModule.providers.
import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { AppComfirmComponent, ConfirmData } from './app-confirm.component';

@Injectable()
export class AppConfirmService {
  constructor(private dialog: MatDialog) {}

  /** width 380px, disableClose. Emits true (OK) / false (Cancel). Defaults: 'Confirm' / 'Are you sure?'. */
  public confirm(data: ConfirmData = {}): Observable<boolean> {
    data.title = data.title || 'Confirm';
    data.message = data.message || 'Are you sure?';
    let dialogRef: MatDialogRef<AppComfirmComponent>;
    dialogRef = this.dialog.open(AppComfirmComponent, {
      width: '380px',
      disableClose: true,
      data: { title: data.title, message: data.message },
    });
    return dialogRef.afterClosed();
  }
}
