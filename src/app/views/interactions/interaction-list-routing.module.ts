// Reconstructed from chunk 374 (routes const "nt", routing module "at").
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AppRoutes } from 'app/shared/constants/app-routes'; // main.js module 6125
import { InteractionsComponent } from './interactions.component';
import { InteractionListComponent } from './interaction-list/interaction-list.component';

const routes: Routes = [
  {
    path: '',
    component: InteractionsComponent, // <router-outlet> shell
    children: [
      { path: '', component: InteractionListComponent },
      { path: AppRoutes.INTERACTION_LIST, component: InteractionListComponent }, // "interaction-list"
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class InteractionListRoutingModule {}
