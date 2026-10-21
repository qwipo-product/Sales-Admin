// Source: main.0ad03de76494ddf1.js webpack module 4453 (export `J`) – selector app-auth-layout,
// ViewEncapsulation.None. Wraps the /sessions/* routes (SessionsModule).
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-auth-layout',
  template: '<router-outlet></router-outlet>',
  encapsulation: ViewEncapsulation.None,
})
export class AuthLayoutComponent implements OnInit {
  constructor(public translate: TranslateService) {}

  ngOnInit() {}
}
