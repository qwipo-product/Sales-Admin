// Source: main.0ad03de76494ddf1.js webpack module 6001 (export `_`) – selector app-sidenav,
// ViewEncapsulation.None, no styles (styled globally by egret-and-app.css `.sidenav-hold ...`).
// App changes vs Egret: injects AuthService and filters items with canAccess()/showDropDown() using permission$.
import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { Permissions } from '../../constants/permissions';
import { PermissionMap } from '../../models/permission.model';
import { AuthService } from '../../services';
import { IChildItem, IMenuItem } from '../../services/navigation.service';

@Component({
  selector: 'app-sidenav',
  templateUrl: './sidenav.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class SidenavComponent implements OnInit, AfterViewInit {
  @Input('items') public menuItems: IMenuItem[] = [];
  @Input('hasIconMenu') public hasIconTypeMenuItem!: boolean;
  @Input('iconMenuTitle') public iconTypeMenuTitle!: string;
  @ViewChild('sidenav') sidenav!: ElementRef<HTMLElement>;

  permissionObj: PermissionMap = {};
  permissions = Permissions;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.authService.permission$.subscribe((permissions) => {
      this.permissionObj = permissions;
    });
  }

  /** Marks <li appDropdownLink> as open when it contains an a.open (routerLinkActive) after first render. */
  ngAfterViewInit() {
    setTimeout(() => {
      const dropdownLinks = [...(this.sidenav.nativeElement.querySelectorAll('li[appdropdownlink]') as any)];
      dropdownLinks.forEach((li: HTMLElement) => {
        if (li.querySelector('a.open')) li.classList.add('open');
      });
    });
  }

  /** Egret leftover – always true. */
  hasPermission(permission: string): boolean {
    const permissions: string[] = [];
    permissions && permissions.find((p) => p === permission);
    return true;
  }

  /** dropDown: any sub item with view === true; otherwise permissionObj[item.pageId].view (default false). */
  canAccess(item: IMenuItem): boolean {
    if (!this.permissionObj) return false;
    if (item?.type === 'dropDown') {
      return !!item?.sub && item.sub.some((sub) => this.permissionObj[sub.pageId!]?.view === true);
    }
    return this.permissionObj[item?.pageId!]?.view || false;
  }

  /** The dropDown anchor is rendered only when at least one sub item is viewable. */
  showDropDown(sub: IChildItem[] | any): boolean {
    return sub.filter((item: IChildItem) => this.permissionObj[item.pageId!]?.view == true).length > 0;
  }
}
