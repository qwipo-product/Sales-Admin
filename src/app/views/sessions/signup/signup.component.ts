// Reconstructed from chunk 882.6b51086d378f06a0.js (module 9882, class `R`) - stock Egret template page.
import { Component, OnInit, ViewChild } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatProgressBar } from '@angular/material/progress-bar';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss'],
})
export class SignupComponent implements OnInit {
  @ViewChild(MatProgressBar) progressBar: MatProgressBar;
  @ViewChild(MatButton) submitButton: MatButton;

  signupForm: UntypedFormGroup;

  constructor() {}

  ngOnInit() {
    const password = new UntypedFormControl('', Validators.required);

    this.signupForm = new UntypedFormGroup({
      email: new UntypedFormControl('', [Validators.required, Validators.email]),
      password: password,
      agreed: new UntypedFormControl('', (control: UntypedFormControl) => {
        const agreed = control.value;
        if (!agreed) {
          return { agreed: true };
        }
        return null;
      }),
    });
  }

  /** UI only - no backend call is made. */
  signup() {
    this.submitButton.disabled = true;
    this.progressBar.mode = 'indeterminate';
  }
}
