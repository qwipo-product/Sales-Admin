// Source: main.0ad03de76494ddf1.js webpack module 946 (export `E`).
// Loaded by APP_INITIALIZER (AppModule) BEFORE Firebase is initialised: provideFirebaseApp() reads
// inject(ConfigService).getConfig().firebaseConfig.
//
// Changes from the original:
//  - `coreApiUrl` is now copied from config.json (the original dropped it, so two customer endpoints called
//    "undefined/Customer/...").
//  - `isMock()` reports whether the app runs on the local sample-data backend (`"env": "mock"`).
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AppConfig } from '../models/app-config.model';

export const MOCK_ENV = 'mock';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private config!: AppConfig;

  // HttpClient is injected but not used: loadConfig() uses window.fetch (so that the
  // TokenInterceptor -> AuthService -> Firebase Auth chain is not instantiated before Firebase is configured).
  constructor(private http: HttpClient) {}

  loadConfig(): Promise<void> {
    return fetch('./assets/configs/config.json')
      .then((response) => response.json())
      .then((config) => {
        this.config = {
          env: config.env,
          production: false,
          firebaseConfig: config.firebaseConfig,
          ssoUrl: config.ssoUrl,
          cloudFunctionsUrl: config.cloudFunctionsUrl,
          coreUrl: config.coreUrl,
          coreApiUrl: config.coreApiUrl,
          authServiceApiUrl: config.authServiceApiUrl,
          messagingServiceUrl: config.messagingServiceUrl,
        };
      });
  }

  getConfig(): AppConfig {
    return this.config;
  }

  isMock(): boolean {
    return this.config?.env === MOCK_ENV;
  }
}
