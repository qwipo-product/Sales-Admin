// Source: main.0ad03de76494ddf1.js webpack module 1299 (export `L`) – selector app-breadcrumb.
// Default (emulated) encapsulation with no component styles (styled globally: .breadcrumb-bar / .breadcrumb-title).
// Shipped layout uses breadcrumb 'simple'. Only routes whose `data` has a `title` AND a non-empty url segment
// produce parts (in app.routing.ts only `home`, `salesperson-planning`, `task-report` set data.title; feature
// routing modules may add more).
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { LayoutService } from '../../services/layout.service';
import { IRoutePart, RoutePartsService } from '../../services/route-parts.service';

@Component({
  selector: 'app-breadcrumb',
  templateUrl: './breadcrumb.component.html',
})
export class BreadcrumbComponent implements OnInit, OnDestroy {
  routeParts: IRoutePart[];
  routerEventSub: Subscription;

  constructor(
    private router: Router,
    private routePartsService: RoutePartsService,
    private activeRoute: ActivatedRoute,
    public layout: LayoutService,
  ) {
    this.routeParts = this.routePartsService.generateRouteParts(this.activeRoute.snapshot);
    this.routerEventSub = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((routeChange) => {
        this.routeParts = this.routePartsService.generateRouteParts(this.activeRoute.snapshot);
        // generate url from parts
        this.routeParts.reverse().map((item, i) => {
          item.breadcrumb = this.parseText(item);
          item.urlSegments.forEach((urlSegment, j) => {
            if (j === 0) return (item.url = `${urlSegment.path}`);
            item.url += `/${urlSegment.path}`;
          });
          if (i === 0) {
            return item;
          }
          // prepend previous part to current part
          item.url = `${this.routeParts[i - 1].url}/${item.url}`;
          return item;
        });
      });
  }

  ngOnInit() {}

  ngOnDestroy() {
    if (this.routerEventSub) {
      this.routerEventSub.unsubscribe();
    }
  }

  /** Replaces {{param}} placeholders in data.breadcrumb with route params. */
  parseText(part: IRoutePart): string {
    if (!part.breadcrumb) {
      return '';
    }
    part.breadcrumb = part.breadcrumb.replace(/{{([^{}]*)}}/g, function (a, b) {
      const r = part.params![b];
      return typeof r === 'string' ? r : a;
    });
    return part.breadcrumb;
  }
}
