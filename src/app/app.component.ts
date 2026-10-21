// Source: class inlined into main.0ad03de76494ddf1.js webpack module 6250 (entry) – selector app-root,
// template <router-outlet></router-outlet>, default encapsulation, no styles.
import { AfterViewInit, Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { IconService } from './shared/services/icon.service';
import { LayoutService } from './shared/services/layout.service';
import { RoutePartsService } from './shared/services/route-parts.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit, AfterViewInit {
  appTitle = 'SALES-ADMIN';
  pageTitle = '';

  constructor(
    public title: Title,
    private router: Router,
    private activeRoute: ActivatedRoute,
    private routePartsService: RoutePartsService,
    private iconService: IconService,
    // LayoutService is injected only so that it is instantiated at startup (applies the body theme class).
    private layoutService: LayoutService,
  ) {
    iconService.init();
  }

  ngOnInit() {
    this.changePageTitle();
  }

  ngAfterViewInit() {}

  /** document.title = "<deepest title> > ... > <top title> | SALES-ADMIN" (titles = route data.title). */
  changePageTitle() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((routeChange) => {
      const routeParts = this.routePartsService.generateRouteParts(this.activeRoute.snapshot);
      if (!routeParts.length) {
        return this.title.setTitle(this.appTitle);
      }
      // Extract title from parts;
      this.pageTitle = routeParts
        .reverse()
        .map((part) => part.title)
        .reduce((partA, partI) => {
          return `${partA} > ${partI}`;
        });
      this.pageTitle += ` | ${this.appTitle}`;
      this.title.setTitle(this.pageTitle);
    });
  }
}
