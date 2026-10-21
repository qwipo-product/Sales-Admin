// Reconstructed from chunk 704.86aaaae1881aced9.js (webpack module 5704, export "TasksListModule").
// Loaded lazily by the app routes "task-report" (AppRoutes.TASKS) and "task-details" (AppRoutes.TASK_DETAILS),
// both with Promise.all([574 (xlsx), 592 (common), 704]).
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';

import { SharedModule } from 'app/shared/shared.module';
import { TasksListRoutingModule } from './tasks-routing.module';
import { TasksComponent } from './tasks.component';
import { TaskListComponent } from './task-list/task-list.component';
import { TaskDetailsComponent } from './task-details/task-details.component';
import { InteractionDetailsComponent } from './interaction-details/interaction-details.component';

@NgModule({
  // NOTE: declarations are stripped from Ivy prod metadata; the list below is inferred from the
  // components that live in this chunk and the dependency lists of their templates.
  declarations: [TasksComponent, TaskListComponent, InteractionDetailsComponent, TaskDetailsComponent],
  imports: [
    CommonModule,
    TasksListRoutingModule,
    SharedModule, // Egret SharedModule (main.js 2994): Forms/ReactiveForms + SharedMaterialModule + AppLoaderService provider
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
  ],
})
export class TasksListModule {}
