// Source: main.0ad03de76494ddf1.js webpack module 8163 (export `W`) – Egret [appDropdownToggle].
import { Directive, HostListener, Inject } from '@angular/core';
import { DropdownLinkDirective } from './dropdown-link.directive';

@Directive({
  selector: '[appDropdownToggle]',
})
export class DropdownAnchorDirective {
  protected navlink: DropdownLinkDirective;

  constructor(@Inject(DropdownLinkDirective) navlink: DropdownLinkDirective) {
    this.navlink = navlink;
  }

  @HostListener('click', ['$event'])
  onClick(e: any) {
    this.navlink.toggle();
  }
}
