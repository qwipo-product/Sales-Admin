// Source: main.0ad03de76494ddf1.js webpack module 7751 (export `p`) – selector app-admin-layout,
// ViewEncapsulation.None. Shell for every authenticated page (see app.routing.ts).
import { AfterViewInit, ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { NavigationEnd, ResolveEnd, ResolveStart, RouteConfigLoadEnd, RouteConfigLoadStart, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Subscription, filter } from 'rxjs';
import { ILayoutConf, LayoutService } from '../../../services/layout.service';
import { ThemeService } from '../../../services/theme.service';

@Component({
  selector: 'app-admin-layout',
  templateUrl: './admin-layout.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class AdminLayoutComponent implements OnInit, AfterViewInit, OnDestroy {
  public isModuleLoading: Boolean = false;
  private moduleLoaderSub!: Subscription;
  private layoutConfSub!: Subscription;
  private routerEventSub: Subscription;

  public scrollConfig = {};
  public layoutConf: ILayoutConf = {};
  public adminContainerClasses: any = {};

  constructor(
    private router: Router,
    public translate: TranslateService,
    public themeService: ThemeService,
    private layout: LayoutService,
    private cdr: ChangeDetectorRef,
  ) {
    // Check Route change and adjust layout (mobile => sidebar closed) + scroll content to top
    this.routerEventSub = router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((routeChange: any) => {
        this.layout.adjustLayout({ route: routeChange.url });
        this.scrollToTop();
      });
    // NB: unlike Egret, no translate.addLangs()/setDefaultLang()/use() here – no language is ever activated.
  }

  ngOnInit() {
    this.layoutConfSub = this.layout.layoutConf$.subscribe((layoutConf) => {
      this.layoutConf = layoutConf;
      this.adminContainerClasses = this.updateAdminContainerClasses(this.layoutConf);
      this.cdr.markForCheck();
    });

    // FOR MODULE LOADER FLAG (view-loader spinner while lazy modules / resolvers load)
    this.moduleLoaderSub = this.router.events.subscribe((event) => {
      if (event instanceof RouteConfigLoadStart || event instanceof ResolveStart) {
        this.isModuleLoading = true;
      }
      if (event instanceof RouteConfigLoadEnd || event instanceof ResolveEnd) {
        this.isModuleLoading = false;
      }
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.layout.adjustLayout(event);
  }

  ngAfterViewInit() {}

  scrollToTop() {
    if (document) {
      setTimeout(() => {
        let element;
        if (this.layoutConf.topbarFixed) {
          element = document.querySelector('#rightside-content-hold');
        } else {
          element = document.querySelector('#main-content-wrap');
        }
        element!.scrollTop = 0;
      });
    }
  }

  ngOnDestroy() {
    if (this.moduleLoaderSub) {
      this.moduleLoaderSub.unsubscribe();
    }
    if (this.layoutConfSub) {
      this.layoutConfSub.unsubscribe();
    }
    if (this.routerEventSub) {
      this.routerEventSub.unsubscribe();
    }
  }

  closeSidebar() {
    this.layout.publishLayoutChange({
      sidebarStyle: 'closed',
    });
  }

  sidebarMouseenter(e: any) {
    if (this.layoutConf.sidebarStyle === 'compact') {
      this.layout.publishLayoutChange({ sidebarStyle: 'full' }, { transitionClass: true });
    }
  }

  sidebarMouseleave(e: any) {
    if (this.layoutConf.sidebarStyle === 'full' && this.layoutConf.sidebarCompactToggle) {
      this.layout.publishLayoutChange({ sidebarStyle: 'compact' }, { transitionClass: true });
    }
  }

  updateAdminContainerClasses(layoutConf: ILayoutConf) {
    return {
      'navigation-top': layoutConf.navigationPos === 'top',
      'sidebar-full': layoutConf.sidebarStyle === 'full',
      'sidebar-compact': layoutConf.sidebarStyle === 'compact' && layoutConf.navigationPos === 'side',
      'compact-toggle-active': layoutConf.sidebarCompactToggle,
      'sidebar-compact-big': layoutConf.sidebarStyle === 'compact-big' && layoutConf.navigationPos === 'side',
      'sidebar-opened': layoutConf.sidebarStyle !== 'closed' && layoutConf.navigationPos === 'side',
      'sidebar-closed': layoutConf.sidebarStyle === 'closed',
      'fixed-topbar': layoutConf.topbarFixed && layoutConf.navigationPos === 'side',
    };
  }
}
