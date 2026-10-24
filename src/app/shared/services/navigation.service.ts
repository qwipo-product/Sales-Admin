// Source: main.0ad03de76494ddf1.js webpack module 1218 (export `f`) – Egret NavigationService with the app menu.
// Not providedIn root: provided by SharedModule.providers.
//
// Menu gating (SidenavComponent.canAccess): an item is shown when permission$[item.pageId].view === true;
// a dropDown is shown when ANY sub item's pageId has view === true. `code` is NOT used for gating.
// "Home" has pageId 'sales_admin_welcome' which is not in PageIds -> Home is only visible when a `pages` doc with
// page_id 'sales_admin_welcome' exists and the user's roles grant view on it.
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { PageCode, PageIds } from '../constants/page-ids';
import { RoutePaths } from '../constants/route-paths';

export interface IMenuItem {
  type: 'link' | 'dropDown' | 'icon' | 'separator' | 'extLink';
  name?: string; // Used as display text for item and title for separator type
  state?: string; // Router state
  icon?: string; // Material icon name
  svgIcon?: string; // UI Lib icon name
  tooltip?: string; // Tooltip text
  disabled?: boolean; // If true, item will not be appeared in sidenav.
  sub?: IChildItem[]; // Dropdown items
  badges?: IBadge[];
  /** App addition: PageCode (unused for gating) */
  code?: PageCode | string;
  /** App addition: page_id used for permission gating */
  pageId?: string;
}

export interface IChildItem {
  type?: string;
  name: string; // Display text
  state?: string; // Router state
  icon?: string; // Material icon name
  svgIcon?: string; // UI Lib icon name
  sub?: IChildItem[];
  /** App addition (string codes such as 'sales_person_planning'; unused for gating) */
  code?: string;
  /** App addition: page_id used for permission gating */
  pageId?: string;
}

export interface IBadge {
  color: string; // primary/accent/warn/hex color codes(#fff000)
  value: string; // Display text
}

@Injectable()
export class NavigationService {
  plainMenu: IMenuItem[] = [
    {
      name: 'Home',
      type: 'link',
      icon: 'house',
      state: RoutePaths.WELCOME,
      pageId: 'sales_admin_welcome',
      code: PageCode.Welcome,
    },
    {
      name: 'Sales Person',
      type: 'dropDown',
      icon: 'person',
      code: PageCode.Profile,
      sub: [
        {
          name: 'Sales Person List',
          state: RoutePaths.SALESPERSON_LIST,
          code: 'sales_person_planning',
          pageId: PageIds.crm_sales_person_list,
        },
        {
          name: 'Attendance',
          state: RoutePaths.ATTENDANCE,
          code: 'sales_person_planning',
          pageId: PageIds.crm_attendance,
        },
        {
          name: 'Planning',
          state: RoutePaths.SALESPERSON_PLANNING,
          code: 'sales_person_planning',
          pageId: PageIds.crm_salesperson_planning,
        },
        {
          // Not in the original app. Shown to users who can see Planning (same permission).
          name: 'Reschedule Tasks',
          state: RoutePaths.RESCHEDULE_TASKS,
          code: 'sales_person_planning',
          pageId: PageIds.crm_salesperson_planning,
        },
        {
          name: 'Tasks',
          state: RoutePaths.TASKS,
          code: 'crm_task_report',
          pageId: PageIds.crm_task_report,
        },
        {
          name: 'Interactions',
          state: RoutePaths.INTERACTION_LIST,
          code: 'sales_interactions',
          pageId: PageIds.crm_interactions,
        },
        {
          name: 'Performance Report',
          state: RoutePaths.PERFORMANCE_REPORT,
          code: 'sales_performance_report',
          pageId: PageIds.crm_performance_report,
        },
      ],
    },
  ];

  // Icon menu TITLE at the very top of navigation.
  // This title will appear if any icon type item is present in menu.
  iconTypeMenuTitle = 'Frequently Accessed';
  // sets iconMenu as default;
  menuItems = new BehaviorSubject<IMenuItem[]>(this.plainMenu);
  // navigation component has subscribed to this Observable
  menuItems$ = this.menuItems.asObservable();

  constructor() {}

  // Customizer component uses this method to change menu.
  // You can remove this method and customizer component.
  // Or you can customize this method to supply different menu for
  // different user type.
  publishNavigationChange(menuType: string): void {
    this.menuItems.next(this.plainMenu);
  }
}
