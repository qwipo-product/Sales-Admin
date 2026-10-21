// Reconstructed from chunk 704 (routes const "Ut", routing module "Mt").
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AppRoutes } from 'app/shared/constants/app-routes'; // main.js module 6125
import { TasksComponent } from './tasks.component';
import { TaskListComponent } from './task-list/task-list.component';
import { TaskDetailsComponent } from './task-details/task-details.component';

const routes: Routes = [
  {
    path: '',
    component: TasksComponent, // <router-outlet> shell
    children: [
      { path: '', component: TaskListComponent },
      { path: AppRoutes.TASKS, component: TaskListComponent }, // "task-report"
      { path: 'task-details/:taskId', component: TaskDetailsComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TasksListRoutingModule {}
