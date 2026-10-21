// Source: class inlined into main.0ad03de76494ddf1.js webpack module 6250 (entry); registered in AppModule as
// { provide: ErrorHandler, useClass: ErrorHandlerService } – Egret template error handler.
// Logs only the 1st error and every 5th one; after 50 errors forces an ApplicationRef.tick().
import { ApplicationRef, ChangeDetectorRef, ErrorHandler, Injectable, Injector } from '@angular/core';

@Injectable()
export class ErrorHandlerService extends ErrorHandler {
  errorCount = 0;

  constructor(protected injector: Injector) {
    super();
  }

  // https://github.com/angular/angular/issues/17010
  override handleError(error: any) {
    const increment = 5;
    const max = 50;

    // Prevents change detection
    const debugCtx = error['ngDebugContext'];
    const changeDetectorRef = debugCtx && debugCtx.injector.get(ChangeDetectorRef);
    if (changeDetectorRef) changeDetectorRef.detach();

    this.errorCount = this.errorCount + 1;
    if (this.errorCount % increment === 0) {
      console.log(' ');
      console.log(`errorHandler() was called ${this.errorCount} times.`);
      console.log(' ');
      super.handleError(error);

      if (this.errorCount === max) {
        console.log(' ');
        console.log(`Preventing recursive error after ${this.errorCount} recursive errors.`);
        console.log(' ');

        const appRef = this.injector.get(ApplicationRef);
        appRef.tick();
      }
    } else if (this.errorCount === 1) {
      super.handleError(error);
    }
  }
}
