// Reconstructed from chunk 374.ebdfb6cdb5b2c104.js (webpack module 6457, export "InteractionListModule").
// Loaded lazily by the app route "interaction-list" (AppRoutes.INTERACTION_LIST) with
// Promise.all([574 (xlsx), 592 (common), 374]).
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';

import { SharedModule } from 'app/shared/shared.module';
import { InteractionListRoutingModule } from './interaction-list-routing.module';
import { InteractionsComponent } from './interactions.component';
import { InteractionListComponent } from './interaction-list/interaction-list.component';
import { SearchInteractionDialogComponent } from './search-interaction-dialog/search-interaction-dialog.component';
import { InteractionSummaryDialogComponent } from './interaction-summary-dialog/interaction-summary-dialog.component';

@NgModule({
  // declarations inferred (stripped from Ivy prod metadata)
  declarations: [
    InteractionsComponent,
    SearchInteractionDialogComponent,
    InteractionSummaryDialogComponent,
    InteractionListComponent,
  ],
  imports: [CommonModule, InteractionListRoutingModule, SharedModule, MatCardModule, MatTableModule, MatPaginatorModule],
})
export class InteractionListModule {}
