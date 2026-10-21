// Source: main.0ad03de76494ddf1.js webpack module 6191 (export `y`) – selector app-sidebar-top,
// ViewEncapsulation.None. Only rendered for navigationPos 'top' on mobile (never with the shipped layout config).
import { AfterViewInit, Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Subscription } from 'rxjs';
import { IMenuItem, NavigationService } from '../../services/navigation.service';

@Component({
  selector: 'app-sidebar-top',
  templateUrl: './sidebar-top.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class SidebarTopComponent implements OnInit, OnDestroy, AfterViewInit {
  public menuItems!: IMenuItem[];
  private menuItemsSub!: Subscription;

  constructor(private navService: NavigationService) {}

  ngOnInit() {
    this.menuItemsSub = this.navService.menuItems$.subscribe((menuItem) => {
      this.menuItems = menuItem.filter((item) => item.type !== 'icon' && item.type !== 'separator');
    });
  }

  ngAfterViewInit() {}

  ngOnDestroy() {
    if (this.menuItemsSub) {
      this.menuItemsSub.unsubscribe();
    }
  }
}
