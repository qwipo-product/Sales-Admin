import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, Subscription, takeUntil } from 'rxjs';

import { AuthService } from '../../../shared/services/auth/auth.service';
import { PageIds } from '../../../shared/constants/page-ids';
import { PagePermission } from '../models/sales-person-planning.models';

/**
 * Route component of "salesperson-planning" (selector `app-settings`, class name inferred).
 * Hosts a mat-tab-group with three lazily-rendered tabs (each tab body is *ngIf'd on selectedTabIndex,
 * so switching tabs destroys/re-creates the tab component and re-fetches its data).
 */
@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent implements OnInit, OnDestroy {
  selectedTabIndex = 0;
  pageId = PageIds.crm_salesperson_planning; // "crm_salesperson_planning"
  permissionObj: PagePermission;
  permissionSubscription: Subscription;
  private destroy$ = new Subject<void>();

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.permissionSubscription = this.authService.permission$.pipe(takeUntil(this.destroy$)).subscribe(async (permissions: any) => {
      console.log('this.permissionObj res:- ', permissions);
      if (permissions && Object.keys(permissions).length > 0) {
        this.permissionObj = permissions[this.pageId];
        console.log('this.permissionObj:- ', this.permissionObj);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
