// Source: main.0ad03de76494ddf1.js webpack module 5092 (export `I`) – selector app-sidebar-side,
// ViewEncapsulation.None (styled globally: .sidebar-panel/.branding/.app-user/...).
import { AfterViewInit, Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Subscription } from 'rxjs';
import { ILayoutConf, LayoutService } from '../../services/layout.service';
import { IMenuItem, NavigationService } from '../../services/navigation.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-sidebar-side',
  templateUrl: './sidebar-side.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class SidebarSideComponent implements OnInit, OnDestroy, AfterViewInit {
  public menuItems!: IMenuItem[];
  public hasIconTypeMenuItem!: boolean;
  public iconTypeMenuTitle!: string;
  private menuItemsSub!: Subscription;
  public layoutConf!: ILayoutConf;

  constructor(
    private navService: NavigationService,
    public themeService: ThemeService,
    private layout: LayoutService,
  ) {}

  ngOnInit() {
    this.iconTypeMenuTitle = this.navService.iconTypeMenuTitle;
    this.menuItemsSub = this.navService.menuItems$.subscribe((menuItem) => {
      this.menuItems = menuItem;
      // Checks item list has any icon type.
      this.hasIconTypeMenuItem = !!this.menuItems.filter((item) => item.type === 'icon').length;
    });
    this.layoutConf = this.layout.layoutConf;
  }

  ngAfterViewInit() {}

  ngOnDestroy() {
    if (this.menuItemsSub) {
      this.menuItemsSub.unsubscribe();
    }
  }

  toggleCollapse() {
    if (this.layoutConf.sidebarCompactToggle) {
      this.layout.publishLayoutChange({
        sidebarCompactToggle: false,
      });
    } else {
      this.layout.publishLayoutChange({
        sidebarCompactToggle: true,
      });
    }
  }
}
