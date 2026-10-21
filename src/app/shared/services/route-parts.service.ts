// Source: main.0ad03de76494ddf1.js webpack module 3176 (export `j`) – Egret RoutePartsService.
// Not providedIn root: provided by SharedModule.providers.
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Params, Router, UrlSegment } from '@angular/router';

export interface IRoutePart {
  title: string;
  breadcrumb: string;
  params?: Params;
  url: string;
  urlSegments: UrlSegment[];
}

@Injectable()
export class RoutePartsService {
  public routeParts!: IRoutePart[];

  constructor(private router: Router) {}

  ngOnInit() {}

  /** Walks the snapshot tree (deepest first) collecting routes whose data has a `title` and a non-empty url. */
  generateRouteParts(snapshot: ActivatedRouteSnapshot): IRoutePart[] {
    let routeParts = <IRoutePart[]>[];
    if (snapshot) {
      if (snapshot.firstChild) {
        routeParts = routeParts.concat(this.generateRouteParts(snapshot.firstChild));
      }
      if (snapshot.data['title'] && snapshot.url.length) {
        routeParts.push({
          title: snapshot.data['title'],
          breadcrumb: snapshot.data['breadcrumb'],
          url: snapshot.url[0].path,
          urlSegments: snapshot.url,
          params: snapshot.params,
        });
      }
    }
    return routeParts;
  }
}
