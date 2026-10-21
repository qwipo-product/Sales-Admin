// Source: main.0ad03de76494ddf1.js webpack module 8971 (export `Z`) – Egret [appDropdown].
// Accordion behaviour for the sidenav: opening one link closes the others; on NavigationEnd re-opens the link whose
// `group` appears in the URL.
import { Directive, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { DropdownLinkDirective } from './dropdown-link.directive';

@Directive({
  selector: '[appDropdown]',
})
export class AppDropdownDirective implements OnInit {
  protected navlinks: Array<DropdownLinkDirective> = [];
  private _router!: Subscription;

  public closeOtherLinks(openLink: DropdownLinkDirective): void {
    this.navlinks.forEach((link: DropdownLinkDirective) => {
      if (link !== openLink) {
        link.open = false;
      }
    });
  }

  public addLink(link: DropdownLinkDirective): void {
    this.navlinks.push(link);
  }

  public removeGroup(link: DropdownLinkDirective): void {
    const index = this.navlinks.indexOf(link);
    if (index !== -1) {
      this.navlinks.splice(index, 1);
    }
  }

  public getUrl() {
    return this.router.url;
  }

  public ngOnInit(): any {
    this._router = this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event) => {
      this.navlinks.forEach((link: DropdownLinkDirective) => {
        if (link.group) {
          const routeUrl = this.getUrl();
          const currentUrl = routeUrl.split('/');
          if (currentUrl.indexOf(link.group) > 0) {
            link.open = true;
            this.closeOtherLinks(link);
          }
        }
      });
    });
  }

  // NB: no ngOnDestroy in the shipped class – the router subscription is never released.

  constructor(private router: Router) {}
}
