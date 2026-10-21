// Source: main.0ad03de76494ddf1.js webpack module 2885 (export `m`) – Egret [appDropdownLink].
// Toggles the `open` host class; registers itself with the parent [appDropdown].
import { Directive, ElementRef, HostBinding, Inject, Input, OnDestroy, OnInit } from '@angular/core';
import { AppDropdownDirective } from './dropdown.directive';

@Directive({
  selector: '[appDropdownLink]',
})
export class DropdownLinkDirective implements OnInit, OnDestroy {
  @Input() public group: any;

  @HostBinding('class.open')
  @Input()
  get open(): boolean {
    return this._open;
  }

  set open(value: boolean) {
    this._open = value;
  }

  protected _open!: boolean;
  protected nav: AppDropdownDirective;

  public constructor(
    @Inject(AppDropdownDirective) nav: AppDropdownDirective,
    private _elemRef: ElementRef,
  ) {
    this.nav = nav;
  }

  public ngOnInit(): any {
    this.nav.addLink(this);
    // routerLinkActive="open" sets the class asynchronously -> read it back after 100ms
    setTimeout(() => {
      this.open = this._elemRef.nativeElement.classList.contains('open');
    }, 100);
  }

  public ngOnDestroy(): any {
    this.nav.removeGroup(this);
  }

  public toggle(): any {
    this.open = !this.open;
  }
}
