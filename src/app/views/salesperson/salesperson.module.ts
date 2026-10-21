// Reconstructed from chunk 195.b9a9d9fa81c4f371.js (class `we`, exported as SalespersonModule).
// Loaded together with the shared `common` chunk (592): Promise.all([o.e(592), o.e(195)]).
// ɵinj imports order: [CommonModule, SalespersonRoutingModule, SharedModule, MatCardModule, MatTableModule, MatPaginatorModule]
// SharedModule (main 2994) re-exports SharedMaterialModule, which provides the sidenav/sort/select/icon/dialog
// directives used by the non-standalone declarations below.
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { SharedModule } from 'app/shared/shared.module'; // main 2994 (m)

import { SalespersonRoutingModule } from './salesperson-routing.module';
import { SalespersonComponent } from './salesperson.component';
import { SalespersonListComponent } from './salesperson-list/salesperson-list.component';
import { EditSalespersonDialogComponent } from './edit-salesperson-dialog/edit-salesperson-dialog.component';

@NgModule({
  declarations: [SalespersonComponent, SalespersonListComponent, EditSalespersonDialogComponent],
  imports: [CommonModule, SalespersonRoutingModule, SharedModule, MatCardModule, MatTableModule, MatPaginatorModule],
})
export class SalespersonModule {}
