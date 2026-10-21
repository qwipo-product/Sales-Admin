// Source: main.0ad03de76494ddf1.js webpack module 7009 (export `P`) – Egret AppLoaderService.
// Injected by feature pages as `egretLoader`. Not providedIn root: provided by SharedModule.providers.
import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef, MatDialogState } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { AppLoaderComponent } from './app-loader.component';

interface IAppLoaderConfig {
  width?: string;
}

@Injectable()
export class AppLoaderService {
  dialogRef!: MatDialogRef<AppLoaderComponent>;

  constructor(private dialog: MatDialog) {}

  /**
   * Opens the blocking loader dialog (disableClose, backdropClass 'light-backdrop'). Default width 200px.
   * If the loader is already open it is reused: the original opened a second dialog and lost the reference to the
   * first, which then stayed on screen forever ("Please wait" stuck over the page).
   */
  public open(title: string = 'Please wait', config: IAppLoaderConfig = { width: '200px' }): Observable<boolean> {
    if (this.dialogRef && this.dialogRef.getState() === MatDialogState.OPEN) {
      this.dialogRef.componentInstance.title = title;
      return this.dialogRef.afterClosed();
    }
    this.dialogRef = this.dialog.open(AppLoaderComponent, { disableClose: true, backdropClass: 'light-backdrop' });
    this.dialogRef.updateSize(config.width);
    this.dialogRef.componentInstance.title = title;
    return this.dialogRef.afterClosed();
  }

  public close(): void {
    if (this.dialogRef) this.dialogRef.close();
  }
}
