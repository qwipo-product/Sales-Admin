// Reconstructed from chunk 882.6b51086d378f06a0.js (const `K`).
// Mounted by the app router at path "sessions" under AuthLayoutComponent (no guard):
//   { path: '', component: AuthLayoutComponent, children: [{ path: 'sessions', loadChildren: SessionsModule, data: { title: 'Session' } }] }
import { Routes } from '@angular/router';

import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { SigninComponent } from './signin/signin.component';
import { SignupComponent } from './signup/signup.component';
import { NotFoundComponent } from './not-found/not-found.component';
import { ErrorComponent } from './error/error.component';
import { UnauthorizedComponent } from './unauthorized/unauthorized.component';

export const SessionsRoutes: Routes = [
  {
    path: '',
    children: [
      { path: 'signup', component: SignupComponent, data: { title: 'Signup' } },
      { path: 'signin', component: SigninComponent, data: { title: 'Signin' } },
      { path: 'forgot-password', component: ForgotPasswordComponent, data: { title: 'Forgot password' } },
      { path: '404', component: NotFoundComponent, data: { title: 'Not Found' } },
      { path: 'unauthorized', component: UnauthorizedComponent, data: { title: 'Access error' } },
      { path: 'error', component: ErrorComponent, data: { title: 'Error' } },
    ],
  },
];
