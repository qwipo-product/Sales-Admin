// Source: main.0ad03de76494ddf1.js webpack module 2994 (class `Q`, concatenated into the SharedModule module).
// Egret UserRoleGuard stub: always allows. Provided by SharedModule but not referenced by any route.
import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';

@Injectable()
export class UserRoleGuard implements CanActivate {
  constructor(
    private router: Router,
    private snack: MatSnackBar,
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    return true;
  }

  hasPermission(permission: string): boolean {
    const permissions: string[] = [];
    permissions && permissions.find((p) => p === permission);
    return true;
  }
}
