// Reconstructed from chunk 146.9273cda643bc5f94.js (module 5146, class `f`, providedIn: 'root').
// Bundled into the lazy SearchViewModule chunk because nothing in main references it.
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SearchService {
  public searchTerm: BehaviorSubject<string> = new BehaviorSubject<string>('');
  public searchTerm$: Observable<string> = this.searchTerm.asObservable();

  constructor() {}
}
