// Source: main.0ad03de76494ddf1.js webpack module 5201 (export `K`) – selector app-header-top,
// ViewEncapsulation.None. Only rendered for navigationPos 'top' (not the shipped layout; kept from Egret).
import { Component, Input, OnDestroy, OnInit, Renderer2, ViewEncapsulation } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { RoutePaths } from '../../constants/route-paths';
import { AuthService } from '../../services';
import { ILayoutConf, LayoutService } from '../../services/layout.service';
import { IMenuItem, NavigationService } from '../../services/navigation.service';
import { ITheme, ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-header-top',
  templateUrl: './header-top.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class HeaderTopComponent implements OnInit, OnDestroy {
  @Input() notificPanel!: MatSidenav;

  layoutConf!: ILayoutConf;
  menuItems!: IMenuItem[];
  menuItemSub!: Subscription;
  egretThemes: ITheme[] = [];

  /**
   * NB (as shipped): Router is NOT injected in this component, so `this.router` is undefined and signout() throws
   * inside its try/catch (logged as "Signout ::: ") after AuthService.signOut() has been started.
   */
  private router!: Router;

  constructor(
    private layout: LayoutService,
    private navService: NavigationService,
    public themeService: ThemeService,
    public translate: TranslateService,
    private authService: AuthService,
    private renderer: Renderer2,
  ) {}

  ngOnInit() {
    this.layoutConf = this.layout.layoutConf;
    this.egretThemes = this.themeService.egretThemes;
    this.menuItemSub = this.navService.menuItems$.subscribe((res) => {
      res = res.filter((item) => item.type !== 'icon' && item.type !== 'separator');
      const limit = 4;
      const mainItems: IMenuItem[] = res.slice(0, limit);
      if (res.length <= limit) {
        return (this.menuItems = mainItems);
      }
      const subItems: IMenuItem[] = res.slice(limit, res.length - 1);
      mainItems.push({
        name: 'More',
        type: 'dropDown',
        tooltip: 'More',
        icon: 'more_horiz',
        sub: subItems as any,
      });
      this.menuItems = mainItems;
    });
  }

  ngOnDestroy() {
    this.menuItemSub.unsubscribe();
  }

  changeTheme(theme: ITheme) {
    this.layout.publishLayoutChange({ matTheme: theme.name });
  }

  toggleNotific() {
    this.notificPanel.toggle();
  }

  toggleSidenav() {
    if (this.layoutConf.sidebarStyle === 'closed') {
      return this.layout.publishLayoutChange({
        sidebarStyle: 'full',
      });
    }
    this.layout.publishLayoutChange({
      sidebarStyle: 'closed',
    });
  }

  async signout() {
    try {
      this.authService.signOut();
      this.router.navigate([RoutePaths.SIGNIN]);
    } catch (error) {
      console.log('Signout ::: ', error);
    }
  }
}
