// Reconstructed from chunk 482.0cee27ac2b0a7a5c.js (class `v`, exported as CustomersListModule).
// ɵinj imports order: [CommonModule, CustomersListRoutingModule, SharedModule, MatCardModule, MatTableModule, MatPaginatorModule]
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { SharedModule } from 'app/shared/shared.module'; // main 2994 (m)

import { CustomersListRoutingModule } from './customers-list-routing.module';
import { CustomersComponent } from './customers/customers.component';

@NgModule({
  declarations: [CustomersComponent],
  imports: [CommonModule, CustomersListRoutingModule, SharedModule, MatCardModule, MatTableModule, MatPaginatorModule],
})
export class CustomersListModule {}
