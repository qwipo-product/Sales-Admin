// Ivy-compatible drop-in for `ngx-perfect-scrollbar` (v10.1.1 ships View Engine metadata only, which Angular 16
// can no longer compile). tsconfig maps the `ngx-perfect-scrollbar` import path to this file, so templates and
// imports stay identical to the original app. Wraps the same `perfect-scrollbar` 1.5.x library and mirrors the
// directive API used by the Egret layout: `[perfectScrollbar]="config"` and `[disabled]`.
import {
  AfterViewInit,
  Directive,
  DoCheck,
  ElementRef,
  Inject,
  InjectionToken,
  Input,
  NgModule,
  NgZone,
  OnChanges,
  OnDestroy,
  Optional,
  SimpleChanges,
} from '@angular/core';
import PerfectScrollbar from 'perfect-scrollbar';

export interface PerfectScrollbarConfigInterface {
  handlers?: string[];
  maxScrollbarLength?: number;
  minScrollbarLength?: number;
  scrollingThreshold?: number;
  scrollXMarginOffset?: number;
  scrollYMarginOffset?: number;
  suppressScrollX?: boolean;
  suppressScrollY?: boolean;
  swipeEasing?: boolean;
  useBothWheelAxes?: boolean;
  wheelPropagation?: boolean;
  wheelSpeed?: number;
}

export const PERFECT_SCROLLBAR_CONFIG = new InjectionToken<PerfectScrollbarConfigInterface>('PERFECT_SCROLLBAR_CONFIG');

@Directive({
  selector: '[perfectScrollbar]',
  exportAs: 'ngxPerfectScrollbar',
})
export class PerfectScrollbarDirective implements AfterViewInit, OnChanges, DoCheck, OnDestroy {
  @Input() disabled = false;
  @Input('perfectScrollbar') config?: PerfectScrollbarConfigInterface | '';

  private instance: PerfectScrollbar | null = null;
  private lastSize = '';

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private zone: NgZone,
    @Optional() @Inject(PERFECT_SCROLLBAR_CONFIG) private defaults: PerfectScrollbarConfigInterface | null,
  ) {}

  ngAfterViewInit(): void {
    if (!this.disabled) {
      this.create();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['disabled'] && !changes['disabled'].isFirstChange()) {
      this.disabled ? this.destroy() : this.create();
    } else if (changes['config'] && !changes['config'].isFirstChange() && this.instance) {
      this.destroy();
      this.create();
    }
  }

  ngDoCheck(): void {
    if (!this.instance) {
      return;
    }
    const el = this.elementRef.nativeElement;
    const size = `${el.scrollWidth}x${el.scrollHeight}x${el.clientWidth}x${el.clientHeight}`;
    if (size !== this.lastSize) {
      this.lastSize = size;
      this.update();
    }
  }

  ngOnDestroy(): void {
    this.destroy();
  }

  update(): void {
    this.zone.runOutsideAngular(() => this.instance?.update());
  }

  scrollToTop(offset = 0): void {
    this.elementRef.nativeElement.scrollTop = offset;
    this.update();
  }

  private create(): void {
    if (this.instance) {
      return;
    }
    const options = { ...(this.defaults || {}), ...(this.config || {}) };
    this.zone.runOutsideAngular(() => {
      this.instance = new PerfectScrollbar(this.elementRef.nativeElement, options as any);
    });
  }

  private destroy(): void {
    if (this.instance) {
      this.zone.runOutsideAngular(() => this.instance?.destroy());
      this.instance = null;
    }
  }
}

@NgModule({
  declarations: [PerfectScrollbarDirective],
  exports: [PerfectScrollbarDirective],
})
export class PerfectScrollbarModule {}
