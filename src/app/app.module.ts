// Source: NgModule `qs` inlined into main.0ad03de76494ddf1.js webpack module 6250 (entry), bootstrap [AppComponent].
// Order of `imports` and `providers` is exactly as in the compiled ɵinj.
//
// NB: BOTH BrowserAnimationsModule and NoopAnimationsModule are imported (as shipped). NoopAnimationsModule comes
// later, so its providers win: ANIMATION_MODULE_TYPE = 'NoopAnimations' and Material animations/ripples are
// effectively disabled app-wide. Keep both to stay pixel/behaviour-identical.
import { LayoutModule } from '@angular/cdk/layout';
import { HTTP_INTERCEPTORS, HttpClient, HttpClientModule } from '@angular/common/http';
import { APP_INITIALIZER, ErrorHandler, NgModule, inject } from '@angular/core';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getDatabase, provideDatabase } from '@angular/fire/database';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule, NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import {
  PERFECT_SCROLLBAR_CONFIG,
  PerfectScrollbarConfigInterface,
  PerfectScrollbarModule,
} from 'ngx-perfect-scrollbar';
import { AppComponent } from './app.component';
import { BACKEND_PROVIDERS } from './backend.providers';
import { rootRouterConfig } from './app.routing';
import { TokenInterceptor } from './shared/interceptors/token.interceptor';
import { ConfigService } from './shared/services/config.service';
import { ErrorHandlerService } from './shared/services/error-handler.service';
import { SharedModule } from './shared/shared.module';

// AoT requires an exported function for factories
export function HttpLoaderFactory(httpClient: HttpClient) {
  // default prefix '/assets/i18n/', suffix '.json' (no translation file is ever requested: no language is set)
  return new TranslateHttpLoader(httpClient);
}

const DEFAULT_PERFECT_SCROLLBAR_CONFIG: PerfectScrollbarConfigInterface = {
  suppressScrollX: true,
};

/** APP_INITIALIZER: loads ./assets/configs/config.json before bootstrap completes. */
export function initializeAppConfig(configService: ConfigService) {
  return () => configService.loadConfig();
}

@NgModule({
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    SharedModule,
    HttpClientModule,
    LayoutModule,
    PerfectScrollbarModule,
    NoopAnimationsModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
    }),
    // Firebase config comes from config.json (ConfigService is already loaded by APP_INITIALIZER when this runs)
    provideFirebaseApp(() => initializeApp(inject(ConfigService).getConfig().firebaseConfig)), // only created in real environments
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideDatabase(() => getDatabase()),
    RouterModule.forRoot(rootRouterConfig, { useHash: false }),
  ],
  declarations: [AppComponent],
  providers: [
    { provide: ErrorHandler, useClass: ErrorHandlerService },
    { provide: PERFECT_SCROLLBAR_CONFIG, useValue: DEFAULT_PERFECT_SCROLLBAR_CONFIG },
    { provide: HTTP_INTERCEPTORS, useClass: TokenInterceptor, multi: true },
    // Real Firebase/REST backend or local sample data, depending on config.json "env" (see backend.providers.ts)
    ...BACKEND_PROVIDERS,
    ConfigService,
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAppConfig,
      deps: [ConfigService],
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
