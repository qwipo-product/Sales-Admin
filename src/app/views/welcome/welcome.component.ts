// Reconstructed from chunk 464.653de154a2bb2d2e.js (module 8464, class `p`).
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, Subscription, takeUntil } from 'rxjs';

import { AuthService } from 'app/shared/services'; // main 9143 (e8) -> 8175

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss'],
})
export class WelcomeComponent implements OnInit, OnDestroy {
  pageId = 'sales_admin_welcome';
  permissionObj: any;
  permissionSubscription: Subscription;
  private destroy$ = new Subject<void>();

  constructor(private authService: AuthService) {
    console.log('Welcome Component');
  }

  async ngOnInit() {
    // permissionObj is computed but not used by the template.
    this.permissionSubscription = this.authService.permission$
      .pipe(takeUntil(this.destroy$))
      .subscribe(async (permissions) => {
        console.log('this.permissionObj res:- ', permissions);
        if (permissions && Object.keys(permissions).length > 0) {
          this.permissionObj = permissions[this.pageId];
          console.log('this.permissionObj:- ', this.permissionObj);
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
