// Source: main.0ad03de76494ddf1.js webpack module 7618 (export `a`).
// Not providedIn root: provided by SharedModule.providers. Used on the AdminLayout route (app.routing.ts).
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthService } from '../services/auth/auth.service';

/**
 * Lets navigation through once the auth session is known and a user is signed in; otherwise sends the browser to
 * the SSO login (via /sessions/signin). The original always returned true (`map(() => true)`), so signed-out users
 * briefly saw admin pages until AuthService redirected them.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private router: Router,
    private authService: AuthService,
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.authService.authState().pipe(
      take(1),
      map((user) => {
        if (!user) {
          this.router.navigate(['/sessions/signin'], { queryParams: { return: state.url } });
          return false;
        }
        return true;
      }),
    );
  }
}
