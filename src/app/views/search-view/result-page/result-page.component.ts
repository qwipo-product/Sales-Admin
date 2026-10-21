// Reconstructed from chunk 146.9273cda643bc5f94.js (inlined component class in the routes array).
// Leftover Egret demo: the template iterates `countries$ | async`, but `countries$` is never assigned,
// so the page always renders an empty shadowed box.
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Observable } from 'rxjs';

import { SearchService } from 'app/shared/search/search.service';

@Component({
  selector: 'app-result-page',
  templateUrl: './result-page.component.html',
  styleUrls: ['./result-page.component.scss'],
})
export class ResultPageComponent implements OnInit, OnDestroy {
  /** Never assigned in production code (declared only for the template). */
  countries$: Observable<any[]>;

  constructor(private searchService: SearchService) {}

  ngOnInit() {}

  ngOnDestroy() {}
}
