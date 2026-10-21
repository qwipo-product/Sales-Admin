// Source: main.0ad03de76494ddf1.js webpack module 2552 (export `f`) – Egret ThemeService (trimmed to 2 themes).
// Not providedIn root: provided by SharedModule.providers.
import { DOCUMENT } from '@angular/common';
import { EventEmitter, Inject, Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { getQueryParam } from '../helpers/url.helper';

export interface ITheme {
  name: string;
  baseColor?: string;
  isActive?: boolean;
}

@Injectable()
export class ThemeService {
  public onThemeChange: EventEmitter<ITheme> = new EventEmitter();
  public egretThemes: ITheme[] = [
    {
      name: 'egret-navy',
      baseColor: '#10174c',
      isActive: false,
    },
    {
      name: 'egret-navy-dark',
      baseColor: '#0081ff',
      isActive: false,
    },
  ];
  public activatedTheme!: ITheme;
  private renderer: Renderer2;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    rendererFactory: RendererFactory2,
  ) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  /** Invoked from LayoutService on init: adds the theme class (e.g. "egret-navy") to <body>. */
  applyMatTheme(themeName: string): void {
    this.activatedTheme = this.egretThemes.find((t) => t.name === themeName)!;
    this.flipActiveFlag(themeName);
    this.setThemeFromQuery();
    this.renderer.addClass(this.document.body, themeName);
  }

  changeTheme(prevTheme: string, themeName: string): void {
    this.renderer.removeClass(this.document.body, prevTheme);
    this.renderer.addClass(this.document.body, themeName);
    this.flipActiveFlag(themeName);
    this.onThemeChange.emit(this.activatedTheme);
  }

  flipActiveFlag(themeName: string): void {
    this.egretThemes.forEach((t) => {
      t.isActive = false;
      if (t.name === themeName) {
        t.isActive = true;
        this.activatedTheme = t;
      }
    });
  }

  /** ?theme={"name":"egret-navy-dark"} (JSON) overrides the active flag (does not change the body class). */
  setThemeFromQuery(): void {
    const themeStr = getQueryParam('theme');
    try {
      this.activatedTheme = JSON.parse(themeStr);
      console.log(this.activatedTheme);
      this.flipActiveFlag(this.activatedTheme.name);
    } catch (e) {}
  }
}
