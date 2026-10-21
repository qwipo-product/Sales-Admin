// Reconstructed from chunk 882.6b51086d378f06a0.js (module 9882, class `_`)
//
// Changes from the original:
//  - Waits for Firebase to restore a persisted session before deciding to redirect to SSO (the original redirected
//    on the initial `null` of user$, before the session was restored).
//  - A failed sign-in shows an error and offers to retry via SSO instead of throwing (the original touched the
//    never-rendered submit button and crashed).
//  - The subscription is torn down on destroy (the original passed an array to takeUntil(), a no-op).
//  - Sample-data mode (config env "mock"): this page stands in for the SSO portal and shows the sign-in card.
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatProgressBar } from '@angular/material/progress-bar';
import { Subject } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { AuthService, UserService } from 'app/shared/services'; // main 9143 (e8, KD)
import { AppLoaderService } from 'app/shared/services/app-loader/app-loader.service'; // main 7009
import { FirebaseDbService } from 'app/shared/services/firebase-db.service'; // main 1057
import { ConfigService } from 'app/shared/services/config.service'; // main 946
import { RoutePaths } from 'app/shared/constants/route-paths'; // main 6125
import { DbCollections } from 'app/shared/constants/db-collections'; // main 6081
import { UserType } from 'app/shared/models/enums'; // main 8352 (FW)
import { MOCK_SSO_TOKEN } from 'app/mock/mock-seed';

export interface LocalUserDetails {
  userId: string;
  roleTypeId: number | string;
  name: string;
}

@Component({
  selector: 'app-signin',
  templateUrl: './signin.component.html',
  styleUrls: ['./signin.component.scss'],
})
export class SigninComponent implements OnInit, OnDestroy {
  @ViewChild(MatProgressBar) progressBar: MatProgressBar;
  @ViewChild(MatButton) submitButton: MatButton;

  /** user type id -> Realtime Database root node holding that user type's profile. */
  userTypeDictionary: { [userTypeId: number]: string } = {
    1: DbCollections.CUSTOMER, // "Customer"
    2: DbCollections.DEALER, // "Dealer"
    3: DbCollections.MERCHANT, // "Merchant"
    4: DbCollections.FIELDAGENT, // "FieldAgent"
    5: DbCollections.CRM, // "Crm"  (UserType.SupportMember)
    6: DbCollections.MARKETINGEXECUTIVE, // "MarketingExecutive"
  };

  errorMsg = '';
  /** Only shown in sample-data mode, where this page stands in for the SSO portal. */
  showSigninPage = false;
  private _unsubscribeAll = new Subject<void>();

  signinForm = new FormGroup({
    username: new FormControl('', Validators.required),
    password: new FormControl('', Validators.required),
    rememberMe: new FormControl(true),
  });

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private egretLoader: AppLoaderService,
    private router: Router,
    private route: ActivatedRoute,
    private firebaseDbService: FirebaseDbService,
    private configService: ConfigService,
  ) {}

  /**
   * SSO flow:
   *  1. Wait for the auth session to be restored.
   *  2. If a user is already signed in -> go to /home.
   *  3. Else if the SSO portal redirected back with ?idToken=<firebase custom token> -> signin(idToken).
   *  4. Else -> redirect (same tab) to `${ssoUrl}/login?redirectto=http://<host>/sessions/signin`.
   */
  ngOnInit(): void {
    if (this.configService.isMock()) {
      this.showSigninPage = true;
      this.signinForm.patchValue({ username: 'demo.admin', password: 'demo' });
    }
    this.authService
      .authState()
      .pipe(take(1), takeUntil(this._unsubscribeAll))
      .subscribe((user) => {
        if (user?.uid) {
          this.router.navigateByUrl(RoutePaths.WELCOME);
        } else if (this.route.snapshot.queryParams['idToken']) {
          this.signin(this.route.snapshot.queryParams['idToken']);
        } else if (!this.showSigninPage) {
          this.authService.redirectToSso();
        }
      });
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

  /** Sign-in card submit (sample-data mode only). */
  submit() {
    if (this.signinForm.invalid) return;
    if (this.submitButton) this.submitButton.disabled = true;
    if (this.progressBar) this.progressBar.mode = 'indeterminate';
    this.signin(MOCK_SSO_TOKEN);
  }

  /**
   * Signs into Firebase Auth with the custom token handed back by the SSO portal, loads the
   * support-member profile from RTDB `Crm/{uid}/`, caches it in localStorage("userDetails"),
   * caches the Firebase ID token and navigates to /home.
   */
  async signin(idToken?: string) {
    try {
      const res = await this.authService.signinWithToken(idToken);
      const userDetails = await this.getUser(UserType.SupportMember, res.user.uid);
      this.setUserDetailsInLocal({
        userId: res.user.uid,
        roleTypeId: userDetails?.roleTypeId ?? '',
        name: userDetails?.name ?? '',
      });
      await this.authService.getUserIDTokenAndCache();
      this.router.navigateByUrl(RoutePaths.WELCOME);
    } catch (error: any) {
      console.log('Signin Error:', error);
      if (this.submitButton) this.submitButton.disabled = false;
      if (this.progressBar) this.progressBar.mode = 'determinate';
      this.errorMsg =
        (error?.code || '') == 'auth/user-not-found' ? 'Please enter valid credentials ' : 'Something went wrong';
      if (!this.showSigninPage) {
        const result = await Swal.fire({
          title: 'Sign in failed',
          text: 'Your sign in link is invalid or has expired. Please sign in again.',
          icon: 'error',
          confirmButtonText: 'Sign in again',
          allowOutsideClick: false,
        });
        if (result.isConfirmed) this.authService.redirectToSso();
      }
    }
  }

  getUser(userType: UserType, uid: string): Promise<any> {
    return this.firebaseDbService
      .getDataFromNode(`${this.userTypeDictionary[userType]}/${uid}/`)
      .then((snapshot) => snapshot.val());
  }

  setUserDetailsInLocal(userDetails: LocalUserDetails) {
    localStorage.setItem('userDetails', JSON.stringify(userDetails));
  }

  /** Not referenced by the template. */
  async signout() {
    try {
      await this.authService.signOut();
      this.router.navigate(['/sessions/' + RoutePaths.SIGNIN]);
    } catch (error) {
      console.log('Signout ::: ', error);
    }
  }
}
