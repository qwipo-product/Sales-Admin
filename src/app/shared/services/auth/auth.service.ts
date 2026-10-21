// Source: main.0ad03de76494ddf1.js webpack module 8175 (export `e`; re-exported by the services barrel as `e8`).
//
// Responsibilities
//  1. Firebase Auth session (authState). No user -> redirect to the SSO portal (unless already on
//     /sessions/signin, where SigninComponent handles the ?idToken=... hand-off).
//  2. Backend API token: POST {authServiceApiUrl}/api/auth/generate_token {userId: uid, userType: 4} -> data.token,
//     refreshed via POST {authServiceApiUrl}/api/auth/refresh_token {token}. Used by TokenInterceptor as Bearer.
//  3. Permissions: live Firestore `Users/{uid}`, `pages`, `Roles` -> permission$ map page_id -> {view,create,...}.
//
// Changes from the original:
//  - Firebase calls go through AuthBackend (Firebase in real environments, sample data when env = "mock").
//  - signOut() now really signs out: it revokes the refresh tokens (as before), signs out of Firebase, clears local
//    storage and returns to the SSO login. The original only revoked the tokens and reloaded, so the cached Firebase
//    session kept the user signed in.
//  - The Firestore permission subscriptions are created once per session and torn down on sign-out (the original
//    re-subscribed on every auth emission and never unsubscribed).
//  - setPermission() tolerates users without `extended_permissions`.
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, firstValueFrom, lastValueFrom, map } from 'rxjs';
import { PageDoc, PagePermission, PermissionMap, RoleDoc, UserDoc } from '../../models/permission.model';
import { ConfigService } from '../config.service';
import { LocalStoreService } from '../local-store.service';
import { AuthBackend, AuthUser } from './auth-backend';

@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  private userSubject = new BehaviorSubject<AuthUser | null>(null);
  public user$: Observable<AuthUser | null> = this.userSubject.asObservable();

  /** Firestore `Users/{uid}` document (live). */
  public userDocData$ = new BehaviorSubject<UserDoc | null>(null);
  /** Firestore `pages` collection (live). */
  public pages$ = new BehaviorSubject<PageDoc[]>([]);
  /** Computed permissions, keyed by page_id. Consumed by SidenavComponent and feature pages. */
  public permission$ = new BehaviorSubject<PermissionMap>({});
  /** Firestore `Roles` collection (live). */
  public roles$ = new BehaviorSubject<RoleDoc[]>([]);

  private _unsubscribeAll: Subscription[] = [];
  private subscribedUid: string | null = null;

  private apiToken: string | null = null;
  private apiTokenRequest: Promise<string | null> | null = null;
  private refreshTokenRequest: Promise<string | null> | null = null;

  constructor(
    private authBackend: AuthBackend,
    private ls: LocalStoreService,
    private http: HttpClient,
    private configService: ConfigService,
  ) {
    this.authBackend.authState().subscribe((user) => {
      if (user) {
        if (!this.apiToken && !this.apiTokenRequest) {
          this.apiTokenRequest = this.generateAPIToken(user.uid);
        }
        this.ls.setItem('uid', user.uid);
        this.userSubject.next(user);
        if (this.subscribedUid !== user.uid) {
          this.unsubscribePermissionData();
          this.subscribedUid = user.uid;
          this.subscribeUserData();
          this.subscribePageData();
          this.subscribeRolesData();
        }
      } else {
        this.userSubject.next(null);
        if (!window.location.href.includes('/sessions/signin')) {
          this.redirectToSso();
        }
      }
    });
  }

  /** Sends the browser to the SSO portal, which returns to /sessions/signin?idToken=<custom token>. */
  redirectToSso(): void {
    if (this.configService.isMock()) {
      // Sample-data mode: the sign-in page stands in for the SSO portal.
      window.location.href = '/sessions/signin';
      return;
    }
    // The SSO portal expects an http:// return URL (as in the original app); HSTS upgrades it on https hosts.
    window.open(`${this.configService.getConfig().ssoUrl}/login?redirectto=http://${window.location.host}/sessions/signin`, '_self');
  }

  getCurrentUser(): Observable<AuthUser | null> {
    return this.user$;
  }

  /** Session state as reported by Firebase (first emission only after a persisted session has been restored). */
  authState(): Observable<AuthUser | null> {
    return this.authBackend.authState();
  }

  /** Legacy Egret email/password helpers – unused by the app UI. Errors are swallowed. */
  async signUp(email: string, password: string): Promise<void> {
    try {
      await this.authBackend.createUserWithEmailAndPassword(email, password);
    } catch (error) {}
  }

  async signIn(email: string, password: string): Promise<void> {
    try {
      await this.authBackend.signInWithEmailAndPassword(email, password);
    } catch (error) {
      console.log(error);
    }
  }

  /** Revokes the user's refresh tokens via Cloud Function, signs out of Firebase and returns to the SSO login. */
  async signOut(): Promise<void> {
    const uid = this.userSubject.value?.uid;
    try {
      if (uid) {
        const request$ = this.http.post(
          `${this.configService.getConfig().cloudFunctionsUrl}/revoke_user_token_uid`,
          { uid },
          { headers: this.noAuthHeaders() },
        );
        await lastValueFrom(request$);
      }
    } catch (error) {
      console.log('Signout ::: revoke token failed', error);
    }
    this.unsubscribePermissionData();
    this.apiToken = null;
    this.permission$.next({});
    await this.authBackend.signOut();
    this.clearLocalStorage();
  }

  /** Clears the app's local storage on sign-out, keeping the sample-data database (mock mode only). */
  private clearLocalStorage(): void {
    const keep = Object.keys(localStorage)
      .filter((key) => key.startsWith('salesAdminMockDb'))
      .map((key) => [key, localStorage.getItem(key)] as [string, string | null]);
    localStorage.clear();
    keep.forEach(([key, value]) => value !== null && localStorage.setItem(key, value));
  }

  async resetPassword(email: string): Promise<void> {
    try {
      await this.authBackend.sendPasswordResetEmail(email);
    } catch (error) {}
  }

  async updateProfile(displayName: string, photoURL: string): Promise<void> {
    try {
      await this.authBackend.updateProfile(displayName, photoURL);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  isLoggedIn(): Observable<boolean> {
    return this.user$.pipe(map((user) => !!user));
  }

  /**
   * Returns the cached Firebase ID token (localStorage "idToken", JSON-encoded) or the current one; force-refreshes
   * and caches it when expired. Called by SigninComponent right after custom-token sign-in.
   */
  async getUserIDTokenAndCache(): Promise<string | null> {
    try {
      const user = this.authBackend.currentUser();
      if (!user) {
        console.error('No user is authenticated.');
        return null;
      }
      const tokenResult = await this.authBackend.getIdTokenResult(user);
      const expirationTime = new Date(tokenResult.expirationTime);
      if (Date.now() >= expirationTime.getTime()) {
        const freshToken = await this.authBackend.getIdToken(user, true);
        this.ls.setItem('idToken', freshToken);
        return freshToken;
      }
      return this.ls.getItem('idToken') || tokenResult.token;
    } catch (error) {
      console.error('Error checking or refreshing idToken:', error);
      throw error;
    }
  }

  /** Backend API token for TokenInterceptor (deduplicates concurrent generate requests). */
  async getAPIToken(): Promise<string | null> {
    if (this.apiToken) return this.apiToken;
    if (this.apiTokenRequest) return this.apiTokenRequest;
    const user = await firstValueFrom(this.authBackend.authState());
    if (!user) return null;
    if (!this.apiToken && !this.apiTokenRequest) {
      this.apiTokenRequest = this.generateAPIToken(user.uid);
    }
    return this.apiToken || this.apiTokenRequest;
  }

  /** Called by TokenInterceptor on HTTP 401 with the token that failed. */
  async refreshAPIToken(failedToken: string): Promise<string | null> {
    if (this.apiToken && this.apiToken !== failedToken) return this.apiToken;
    if (!this.refreshTokenRequest) {
      this.refreshTokenRequest = this.requestRefreshToken(failedToken);
    }
    return this.refreshTokenRequest;
  }

  /** POST {authServiceApiUrl}/api/auth/generate_token { userId, userType: 4 } -> response.data.token */
  private async generateAPIToken(userId: string): Promise<string | null> {
    try {
      const url = `${this.configService.getConfig().authServiceApiUrl}/api/auth/generate_token`;
      const response: any = await lastValueFrom(
        this.http.post(url, { userId, userType: 4 }, { headers: this.noAuthHeaders() }),
      );
      this.apiToken = response?.data?.token || null;
      return this.apiToken;
    } catch (error) {
      console.error('Error generating API token:', error);
      return null;
    } finally {
      this.apiTokenRequest = null;
    }
  }

  /** POST {authServiceApiUrl}/api/auth/refresh_token { token } -> response.data.token */
  private async requestRefreshToken(token: string): Promise<string | null> {
    try {
      const url = `${this.configService.getConfig().authServiceApiUrl}/api/auth/refresh_token`;
      const response: any = await lastValueFrom(this.http.post(url, { token }, { headers: this.noAuthHeaders() }));
      this.apiToken = response?.data?.token || null;
      return this.apiToken;
    } catch (error) {
      console.error('Error refreshing API token:', error);
      this.apiToken = null;
      return null;
    } finally {
      this.refreshTokenRequest = null;
    }
  }

  /** "No-Auth: true" makes TokenInterceptor skip the Bearer header (and it removes this header). */
  private noAuthHeaders(): HttpHeaders {
    return new HttpHeaders().set('No-Auth', 'true');
  }

  /**
   * Recomputes permission$ once user doc, pages and roles are all loaded:
   *  - every page starts all-false;
   *  - OR-merges permissions[page_id] of every Role whose id is in user.roles;
   *  - if the user has >= 1 matching role, OR-merges user.extended_permissions[page_id] as well.
   */
  setPermission(): void {
    if (this.userDocData$.value && this.pages$.value.length > 0 && this.roles$.value.length > 0) {
      const permissions: PermissionMap = {};
      const userRoleIds = this.userDocData$.value.roles || [];
      const userRoles = this.roles$.value.filter((role) => userRoleIds.includes(role.id));

      for (const page of this.pages$.value) {
        permissions[page.page_id] = { view: false, create: false, delete: false, edit: false, import: false, export: false };
      }

      const merge = (source: Record<string, Partial<PagePermission>> | undefined) => {
        for (const page of this.pages$.value) {
          const incoming = source?.[page.page_id];
          const current = permissions[page.page_id];
          permissions[page.page_id] = {
            view: this.updatePermission(current.view, incoming?.view),
            create: this.updatePermission(current.create, incoming?.create),
            delete: this.updatePermission(current.delete, incoming?.delete),
            edit: this.updatePermission(current.edit, incoming?.edit),
            import: this.updatePermission(current.import, incoming?.import),
            export: this.updatePermission(current.export, incoming?.export),
          };
        }
      };

      for (const role of userRoles) {
        merge(role.permissions);
      }

      if (userRoles && userRoles.length > 0) {
        merge(this.userDocData$.value.extended_permissions);
      }

      this.permission$.next(permissions);
    }
  }

  /** OR-merge: once true stays true; undefined never grants. */
  updatePermission(current: boolean, incoming: boolean | undefined): boolean {
    return current || (incoming !== undefined && incoming);
  }

  /** Snapshot lookup – undefined until permission$ is populated. */
  getPageAccessPermission(pageId: string): PagePermission {
    return this.permission$.value[pageId];
  }

  /** Exchanges the SSO-issued Firebase custom token for a Firebase session. */
  signinWithToken(token: string) {
    return this.authBackend.signInWithCustomToken(token);
  }

  /** Live Firestore `Users/{uid}` (uid read back from LocalStoreService). */
  subscribeUserData(): void {
    const subscription = this.authBackend.docData<UserDoc>(`Users/${this.ls.getItem('uid')}`).subscribe((userDoc) => {
      this.userDocData$.next(userDoc);
      this.setPermission();
    });
    this._unsubscribeAll.push(subscription);
  }

  /** Live Firestore `pages` collection. */
  subscribePageData(): void {
    const subscription = this.authBackend.collectionData<PageDoc>('pages').subscribe((pages) => {
      this.pages$.next(pages);
      this.setPermission();
    });
    this._unsubscribeAll.push(subscription);
  }

  async getUserById(userId: string) {
    return this.authBackend.getDoc(`Users/${userId}`);
  }

  /** Live Firestore `Roles` collection. */
  subscribeRolesData(): void {
    const subscription = this.authBackend.collectionData<RoleDoc>('Roles').subscribe((roles) => {
      this.roles$.next(roles);
      this.setPermission();
    });
    this._unsubscribeAll.push(subscription);
  }

  private unsubscribePermissionData(): void {
    this._unsubscribeAll.forEach((sub) => sub.unsubscribe());
    this._unsubscribeAll = [];
    this.subscribedUid = null;
  }

  ngOnDestroy(): void {
    this.unsubscribePermissionData();
  }
}
