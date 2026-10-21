// Shape of ./assets/configs/config.json as read by ConfigService.loadConfig() (main.js module 946).
// Only these keys are copied from the JSON; `production` is hard-coded to false.
export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string; // required: Realtime Database is used (provideDatabase)
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  measurementId?: string;
}

export interface AppConfig {
  env: string;
  production: boolean;
  firebaseConfig: FirebaseWebConfig;
  /** SSO portal base URL; app redirects to `${ssoUrl}/login?redirectto=http://<host>/sessions/signin` */
  ssoUrl: string;
  /** Cloud Functions base URL (revoke_user_token_uid, getSalesPersonReport, ...) */
  cloudFunctionsUrl: string;
  /** Core REST API base URL (customer/count_by_salesperson, customer/update_salesperson_ids, customer/:id) */
  coreUrl: string;
  /** Auth service base URL (api/auth/generate_token, api/auth/refresh_token) */
  authServiceApiUrl: string;
  messagingServiceUrl: string;
  /**
   * NOT populated by ConfigService (not copied from config.json) although some feature code reads it;
   * it will always be `undefined` at runtime unless ConfigService is changed.
   */
  coreApiUrl?: string;
}
