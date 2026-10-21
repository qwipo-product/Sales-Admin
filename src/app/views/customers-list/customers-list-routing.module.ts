// Reconstructed from chunk 482.0cee27ac2b0a7a5c.js (const `i`, module class `h`).
// Mounted by the app router at RoutePaths.CUSTOMER_LIST ("customers-list") under AdminLayoutComponent, canActivate: [AuthGuard].
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CustomersComponent } from './customers/customers.component';

const routes: Routes = [{ path: '', component: CustomersComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CustomersListRoutingModule {}
