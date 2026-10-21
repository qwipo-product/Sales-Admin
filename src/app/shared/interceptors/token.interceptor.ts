// Source: class inlined into main.0ad03de76494ddf1.js webpack module 6250 (entry); registered in AppModule as
// { provide: HTTP_INTERCEPTORS, useClass: TokenInterceptor, multi: true }. Class name inferred (Egret naming).
//
//  - Request has header "No-Auth": strip the header and forward unchanged (no token).
//  - Otherwise: token = await AuthService.getAPIToken(); add "Authorization: Bearer <token>" and
//    "Accept: application/json" (only when a token exists).
//  - On HttpErrorResponse 401 (and a token had been sent): AuthService.refreshAPIToken(token) and retry once with the
//    new token; if refresh yields null rethrow the original error.
// Applies to ALL HttpClient calls (coreUrl REST calls, Cloud Functions without No-Auth, i18n json, ...).
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, from, mergeMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth/auth.service';

@Injectable()
export class TokenInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (request.headers.has('No-Auth')) {
      return next.handle(request.clone({ headers: request.headers.delete('No-Auth') }));
    }
    return from(this.authService.getAPIToken()).pipe(
      mergeMap((token) =>
        next.handle(this.addAuthorizationHeader(request, token)).pipe(
          catchError((error) =>
            token && error instanceof HttpErrorResponse && error.status === 401
              ? this.retryWithNewToken(request, next, token, error)
              : throwError(() => error),
          ),
        ),
      ),
    );
  }

  private retryWithNewToken(
    request: HttpRequest<any>,
    next: HttpHandler,
    failedToken: string,
    originalError: HttpErrorResponse,
  ): Observable<HttpEvent<any>> {
    return from(this.authService.refreshAPIToken(failedToken)).pipe(
      mergeMap((newToken) =>
        newToken ? next.handle(this.addAuthorizationHeader(request, newToken)) : throwError(() => originalError),
      ),
    );
  }

  private addAuthorizationHeader(request: HttpRequest<any>, token: string | null): HttpRequest<any> {
    return token
      ? request.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        })
      : request;
  }
}
