import { MatDialogRef } from '@angular/material/dialog';

import { AppLoaderService } from '../../../shared/services/app-loader/app-loader.service';

/**
 * Per-component handle on the module's AppLoaderService ("Please wait" dialog).
 *
 * AppLoaderService keeps a single `dialogRef`: when open() is called while another loader is still open
 * (a tab component destroyed/re-created while loading, a dialog opening its own loader, ...) the first
 * dialogRef is overwritten and that loader can never be closed, which blocks the page. A ScopedLoader
 * remembers the exact dialog it opened and closes only that one; close() is idempotent, so it is safe to
 * call from `finally` blocks and from ngOnDestroy.
 */
export class ScopedLoader {
  private dialogRef: MatDialogRef<unknown> | null = null;

  constructor(private appLoader: AppLoaderService) {}

  open(): void {
    this.close();
    this.appLoader.open();
    this.dialogRef = this.appLoader.dialogRef;
  }

  close(): void {
    const dialogRef = this.dialogRef;
    this.dialogRef = null;
    if (dialogRef) {
      dialogRef.close();
    }
  }
}
