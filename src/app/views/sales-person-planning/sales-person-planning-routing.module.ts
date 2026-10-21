import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SettingsComponent } from './settings/settings.component';

/**
 * Mounted from the app routes (main.js) as:
 *   { path: 'salesperson-planning',            // ROUTE_PATHS.SALESPERSON_PLANNING (module 6125)
 *     loadChildren: () => import('./views/sales-person-planning/sales-person-planning.module')
 *                           .then(m => m.SalesPersonPlanningModule),
 *     data: { title: 'salesperson-planning', breadcrumb: 'salesperson-planning' } }
 * as a child of { path: '', component: AdminLayoutComponent, canActivate: [AuthGuard], children: [...] }.
 */
const routes: Routes = [
  {
    path: '',
    component: SettingsComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SalesPersonPlanningRoutingModule {}
