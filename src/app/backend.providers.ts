// Chooses the data backend at startup from ./assets/configs/config.json:
//   "env": "mock"  -> local sample data (app/mock), no Firebase project or APIs needed
//   anything else  -> the real Firebase project (firebaseConfig) and REST APIs, exactly like the original app
// The factories run lazily on first injection, which happens after APP_INITIALIZER has loaded the config.
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { Injector, Provider } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Database } from '@angular/fire/database';
import { Firestore } from '@angular/fire/firestore';
import { MockAuthBackend } from './mock/mock-auth.backend';
import { MockBackendInterceptor } from './mock/mock-backend.interceptor';
import { MockFirebaseDbService } from './mock/mock-firebase-db.service';
import { MockFirestoreService } from './mock/mock-firestore.service';
import { AuthBackend, FirebaseAuthBackend } from './shared/services/auth/auth-backend';
import { ConfigService } from './shared/services/config.service';
import { FirebaseDbService } from './shared/services/firebase-db.service';
import { FirestoreService } from './shared/services/firestore.service';

export function firestoreServiceFactory(config: ConfigService, injector: Injector) {
  return config.isMock() ? new MockFirestoreService() : new FirestoreService(injector.get(Firestore));
}

export function firebaseDbServiceFactory(config: ConfigService, injector: Injector) {
  return config.isMock() ? new MockFirebaseDbService() : new FirebaseDbService(injector.get(Database));
}

export function authBackendFactory(config: ConfigService, injector: Injector) {
  return config.isMock() ? new MockAuthBackend() : new FirebaseAuthBackend(injector.get(Auth), injector.get(Firestore));
}

export const BACKEND_PROVIDERS: Provider[] = [
  { provide: FirestoreService, useFactory: firestoreServiceFactory, deps: [ConfigService, Injector] },
  { provide: FirebaseDbService, useFactory: firebaseDbServiceFactory, deps: [ConfigService, Injector] },
  { provide: AuthBackend, useFactory: authBackendFactory, deps: [ConfigService, Injector] },
  // Registered after TokenInterceptor so mock requests still carry the bearer token like real ones.
  { provide: HTTP_INTERCEPTORS, useClass: MockBackendInterceptor, multi: true },
];
