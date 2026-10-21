// Source: main.0ad03de76494ddf1.js webpack module 994 (export `A`) – selector app-header-side,
// ViewEncapsulation.None. The topbar used with navigationPos 'side' (the shipped layout).
// Right side has a single power button (power_settings_new) opening a menu with one item: SIGNOUT.
import { Component, Input, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { Router } from '@angular/router';
import { RoutePaths } from '../../constants/route-paths';
import { AuthService } from '../../services/auth/auth.service';
import { ILayoutConf, LayoutService } from '../../services/layout.service';
import { ITheme, ThemeService } from '../../services/theme.service';
import { EgretNotifications2Component } from '../egret-notifications2/egret-notifications2.component';

@Component({
  selector: 'app-header-side',
  templateUrl: './header-side.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class HeaderSideComponent implements OnInit {
  @Input() notificPanel!: MatSidenav;
  @ViewChild(EgretNotifications2Component) noti!: EgretNotifications2Component;

  public egretThemes!: ITheme[];
  public layoutConf!: ILayoutConf;

  constructor(
    private themeService: ThemeService,
    private layout: LayoutService,
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    this.egretThemes = this.themeService.egretThemes;
    this.layoutConf = this.layout.layoutConf;
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

  toggleCollapse() {
    // compact --> full
    if (this.layoutConf.sidebarStyle === 'compact') {
      return this.layout.publishLayoutChange(
        {
          sidebarStyle: 'full',
          sidebarCompactToggle: false,
        },
        { transitionClass: true },
      );
    }

    // * --> compact
    this.layout.publishLayoutChange(
      {
        sidebarStyle: 'compact',
        sidebarCompactToggle: true,
      },
      { transitionClass: true },
    );
  }

  onSearch(e: any) {}

  /**
   * Revokes the session, signs out of Firebase and clears local storage; AuthService then sends the browser back to
   * the SSO login. (The original only revoked the tokens and reloaded, which left the user signed in.)
   */
  async signout() {
    try {
      await this.authService.signOut();
      this.router.navigate(['/sessions/' + RoutePaths.SIGNIN]);
    } catch (error) {
      console.log('Signout ::: ', error);
    }
  }
}
