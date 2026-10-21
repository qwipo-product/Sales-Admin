// Reconstructed from chunk 882.6b51086d378f06a0.js (class `j`, exported as SessionsModule).
// ɵinj imports order: [CommonModule, FormsModule, TranslateModule, ReactiveFormsModule,
//                      SharedMaterialModule, PerfectScrollbarModule, RouterModule.forChild(SessionsRoutes)]
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';                                    // main 3081 (aw)
import { PerfectScrollbarModule } from 'ngx-perfect-scrollbar';                         // main 2769 (Xd), exportAs 'ngxPerfectScrollbar'
import { SharedMaterialModule } from 'app/shared/shared-material.module';                 // main 5772 (m)

import { SessionsRoutes } from './sessions.routing';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { SigninComponent } from './signin/signin.component';
import { SignupComponent } from './signup/signup.component';
import { NotFoundComponent } from './not-found/not-found.component';
import { ErrorComponent } from './error/error.component';
import { UnauthorizedComponent } from './unauthorized/unauthorized.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    ReactiveFormsModule,
    SharedMaterialModule,
    PerfectScrollbarModule,
    RouterModule.forChild(SessionsRoutes),
  ],
  declarations: [
    ForgotPasswordComponent,
    SigninComponent,
    SignupComponent,
    NotFoundComponent,
    ErrorComponent,
    UnauthorizedComponent,
  ],
})
export class SessionsModule {}
