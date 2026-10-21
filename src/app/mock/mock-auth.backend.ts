// Sample-data stand-in for Firebase Auth. The SSO hand-off is simulated: AuthService sends the browser to
// /sessions/signin?idToken=<MOCK_SSO_TOKEN>, SigninComponent exchanges it exactly like a real custom token.
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, asapScheduler, observeOn } from 'rxjs';
import { AuthBackend, AuthCredential, AuthTokenResult, AuthUser } from 'app/shared/services/auth/auth-backend';
import { MockDatabase } from './mock-database';
import { MOCK_ADMIN_UID, MOCK_SSO_TOKEN } from './mock-seed';

const SESSION_KEY = 'salesAdminMockSession';

@Injectable()
export class MockAuthBackend extends AuthBackend {
  private db = MockDatabase.instance;
  private user$ = new BehaviorSubject<AuthUser | null>(this.restore());

  private restore(): AuthUser | null {
    try {
      const uid = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
      return uid ? { uid, email: 'demo.admin@example.com', displayName: 'Sales Admin (Demo)' } : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Emits asynchronously, like Firebase's authState(). (A synchronous first emission would let AuthService fire its
   * first HTTP request while it is still being constructed, which Angular reports as a circular dependency.)
   */
  authState(): Observable<AuthUser | null> {
    return this.user$.pipe(observeOn(asapScheduler));
  }

  currentUser(): AuthUser | null {
    return this.user$.value;
  }

  async signInWithCustomToken(token: string): Promise<AuthCredential> {
    if (token !== MOCK_SSO_TOKEN) {
      throw Object.assign(new Error('Invalid custom token'), { code: 'auth/invalid-custom-token' });
    }
    const user: AuthUser = { uid: MOCK_ADMIN_UID, email: 'demo.admin@example.com', displayName: 'Sales Admin (Demo)' };
    localStorage.setItem(SESSION_KEY, user.uid);
    this.user$.next(user);
    return { user };
  }

  async signOut(): Promise<void> {
    localStorage.removeItem(SESSION_KEY);
    this.user$.next(null);
  }

  async getIdTokenResult(user: AuthUser): Promise<AuthTokenResult> {
    return { token: `mock-id-token-${user.uid}`, expirationTime: new Date(Date.now() + 3600 * 1000).toUTCString() };
  }

  async getIdToken(user: AuthUser): Promise<string> {
    return `mock-id-token-${user.uid}`;
  }

  docData<T = any>(path: string): Observable<T> {
    const [collection, id] = path.split('/');
    return this.db.watch(() => {
      const data = this.db.getDoc(collection, id);
      return (data ? { ...data, id } : undefined) as T;
    });
  }

  collectionData<T = any>(path: string): Observable<T[]> {
    return this.db.watch(() => this.db.listDocs(path).map((d) => ({ ...d.data, id: d.id }) as T));
  }

  async getDoc<T = any>(path: string): Promise<T | undefined> {
    const [collection, id] = path.split('/');
    return (this.db.getDoc(collection, id) || undefined) as T | undefined;
  }

  async createUserWithEmailAndPassword() {
    return null;
  }

  async signInWithEmailAndPassword() {
    return null;
  }

  async sendPasswordResetEmail() {}

  async updateProfile() {}
}
