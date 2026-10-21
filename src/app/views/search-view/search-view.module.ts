// Reconstructed from chunk 146.9273cda643bc5f94.js (class `Z`, exported as SearchViewModule).
// ɵinj imports order: [MatCardModule, CommonModule, MatTableModule, MatPaginatorModule, SearchViewRoutingModule]
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';

import { SearchViewRoutingModule } from './search-view-routing.module';
import { ResultPageComponent } from './result-page/result-page.component';

@NgModule({
  declarations: [ResultPageComponent],
  imports: [MatCardModule, CommonModule, MatTableModule, MatPaginatorModule, SearchViewRoutingModule],
})
export class SearchViewModule {}
