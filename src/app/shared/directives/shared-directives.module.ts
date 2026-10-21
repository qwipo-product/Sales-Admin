// Source: main.0ad03de76494ddf1.js webpack module 2994 (NgModule `ut`): ɵinj imports [CommonModule, LayoutModule].
// Prod Ivy output keeps no declarations. The bundle has side-effect imports of modules 8971/8163/2885 (the three
// dropdown directives below) and of MatSidenav (2214), Subject (7579), highlight.js (6806), takeUntil (2722) and
// HttpClient (3144) – i.e. Egret's EgretSideNavToggle / EgretHighlight / FontSize / ScrollTo directives were
// declared here too but are unused (tree-shaken), so their code is not recoverable. highlight.js (ALL languages,
// ~1 MB) is still bundled because of that import – drop it when rebuilding.
import { LayoutModule } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { DropdownAnchorDirective } from './dropdown-anchor.directive';
import { DropdownLinkDirective } from './dropdown-link.directive';
import { AppDropdownDirective } from './dropdown.directive';

const directives = [AppDropdownDirective, DropdownAnchorDirective, DropdownLinkDirective];

@NgModule({
  imports: [CommonModule, LayoutModule],
  declarations: directives,
  exports: directives,
})
export class SharedDirectivesModule {}
