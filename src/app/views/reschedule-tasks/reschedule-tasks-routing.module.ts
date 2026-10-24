import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { RescheduleTasksComponent } from './reschedule-tasks/reschedule-tasks.component';

/** Lazy-loaded from the app routes as RoutePaths.RESCHEDULE_TASKS ('reschedule-tasks'). Not in the original app. */
const routes: Routes = [{ path: '', component: RescheduleTasksComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RescheduleTasksRoutingModule {}
