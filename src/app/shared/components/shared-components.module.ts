// Source: main.0ad03de76494ddf1.js webpack module 2994 (NgModule `Xn`):
// ɵinj imports [CommonModule, FormsModule, RouterModule, TranslateModule, PerfectScrollbarModule, SearchModule,
//               SharedPipesModule, SharedDirectivesModule, SharedMaterialModule].
// Declarations are reconstructed from the components still present in the bundle (side-effect imports in the same
// module: 994, 5092, 5201, 6191, 7751, 4453, 3293, 6001, 1299, 33, 3503 + the AppComfirm class inlined in 2994).
// Egret's CustomizerComponent / ButtonLoadingComponent / EgretSidebar* / BottomSheetShare / EgretExampleViewer* /
// FooterComponent were declared in the original template but are unused and tree-shaken (their Material deps –
// checkbox, radio, card, tabs, expansion, list, bottom-sheet – are still side-effect-imported).
//
// CUSTOM_ELEMENTS_SCHEMA: AdminLayout's template contains <app-footer> but no FooterComponent exists in the bundle
// (the element renders as an empty unknown element). A schema (or a stub FooterComponent) is needed for AOT to accept
// it; schemas are not emitted in prod Ivy metadata, so which one the original used is unknown.
import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { PerfectScrollbarModule } from 'ngx-perfect-scrollbar';
import { SharedDirectivesModule } from '../directives/shared-directives.module';
import { SharedPipesModule } from '../pipes/shared-pipes.module';
import { SearchModule } from '../search/search.module';
import { AppComfirmComponent } from '../services/app-confirm/app-confirm.component';
import { AppLoaderComponent } from '../services/app-loader/app-loader.component';
import { SharedMaterialModule } from '../shared-material.module';
import { BreadcrumbComponent } from './breadcrumb/breadcrumb.component';
import { EgretNotifications2Component } from './egret-notifications2/egret-notifications2.component';
import { HeaderSideComponent } from './header-side/header-side.component';
import { HeaderTopComponent } from './header-top/header-top.component';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout.component';
import { NotificationsComponent } from './notifications/notifications.component';
import { SidebarSideComponent } from './sidebar-side/sidebar-side.component';
import { SidebarTopComponent } from './sidebar-top/sidebar-top.component';
import { SidenavComponent } from './sidenav/sidenav.component';

const components = [
  HeaderTopComponent,
  SidebarTopComponent,
  SidenavComponent,
  NotificationsComponent,
  SidebarSideComponent,
  HeaderSideComponent,
  AdminLayoutComponent,
  AuthLayoutComponent,
  BreadcrumbComponent,
  AppComfirmComponent,
  AppLoaderComponent,
  EgretNotifications2Component,
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TranslateModule,
    PerfectScrollbarModule,
    SearchModule,
    SharedPipesModule,
    SharedDirectivesModule,
    SharedMaterialModule,
  ],
  declarations: components,
  exports: components,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class SharedComponentsModule {}
