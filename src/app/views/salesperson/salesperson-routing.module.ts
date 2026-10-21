// Reconstructed from chunk 195.b9a9d9fa81c4f371.js (const `Te`, module class `Oe`).
// Mounted by the app router at RoutePaths.SALESPERSON_LIST ("salesperson-list") under AdminLayoutComponent,
// canActivate: [AuthGuard] (no route data). Resulting URLs:
//   /salesperson-list                                   -> SalespersonListComponent
//   /salesperson-list/salesperson-list                  -> SalespersonListComponent (duplicate)
//   /salesperson-list/create-salesperson                -> CreateSalespersonComponent (standalone)
//   /salesperson-list/edit-salesperson-profile/:id      -> ProfileInformationComponent (standalone)
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { RoutePaths } from 'app/shared/constants/route-paths'; // main 6125

import { SalespersonComponent } from './salesperson.component';
import { SalespersonListComponent } from './salesperson-list/salesperson-list.component';
import { CreateSalespersonComponent } from './create-salesperson/create-salesperson.component';
import { ProfileInformationComponent } from './profile-information/profile-information.component';

const routes: Routes = [
  {
    path: '',
    component: SalespersonComponent,
    children: [
      { path: '', component: SalespersonListComponent },
      { path: RoutePaths.SALESPERSON_LIST, component: SalespersonListComponent }, // "salesperson-list"
      { path: RoutePaths.SALESPERSON_CREATE, component: CreateSalespersonComponent }, // "create-salesperson"
      { path: 'edit-salesperson-profile/:id', component: ProfileInformationComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SalespersonRoutingModule {}
