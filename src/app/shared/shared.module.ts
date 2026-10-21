// Source: main.0ad03de76494ddf1.js webpack module 2994 (export `m`, NgModule `fi`) – Egret SharedModule.
// ɵinj providers [ThemeService, NavigationService, RoutePartsService, AuthGuard, UserRoleGuard, AppConfirmService,
//                 AppLoaderService]
// ɵinj imports  [CommonModule, SharedComponentsModule, SharedPipesModule, SharedDirectivesModule,
//                 ReactiveFormsModule, FormsModule, SharedMaterialModule, MatSelectModule]
//         + exports [SharedComponentsModule, SharedPipesModule, SharedDirectivesModule, ReactiveFormsModule,
//                    FormsModule, SharedMaterialModule, MatSelectModule]
// Imported by AppModule and by every lazy feature module (so every lazy injector gets its own instances of the
// non-root providers above – e.g. a feature-level AppLoaderService/NavigationService).
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { SharedComponentsModule } from './components/shared-components.module';
import { SharedDirectivesModule } from './directives/shared-directives.module';
import { AuthGuard } from './guards/auth.guard';
import { UserRoleGuard } from './guards/user-role.guard';
import { SharedPipesModule } from './pipes/shared-pipes.module';
import { AppConfirmService } from './services/app-confirm/app-confirm.service';
import { AppLoaderService } from './services/app-loader/app-loader.service';
import { NavigationService } from './services/navigation.service';
import { RoutePartsService } from './services/route-parts.service';
import { ThemeService } from './services/theme.service';
import { SharedMaterialModule } from './shared-material.module';

@NgModule({
  imports: [
    CommonModule,
    SharedComponentsModule,
    SharedPipesModule,
    SharedDirectivesModule,
    ReactiveFormsModule,
    FormsModule,
    SharedMaterialModule,
    MatSelectModule,
  ],
  providers: [
    ThemeService,
    NavigationService,
    RoutePartsService,
    AuthGuard,
    UserRoleGuard,
    AppConfirmService,
    AppLoaderService,
  ],
  exports: [
    SharedComponentsModule,
    SharedPipesModule,
    SharedDirectivesModule,
    ReactiveFormsModule,
    FormsModule,
    SharedMaterialModule,
    MatSelectModule,
  ],
})
export class SharedModule {}
