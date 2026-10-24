import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SharedModule } from '../../shared/shared.module';
import { RescheduleTasksRoutingModule } from './reschedule-tasks-routing.module';
import { RescheduleTasksComponent } from './reschedule-tasks/reschedule-tasks.component';
import { GenerateTasksDialogComponent } from './dialogs/generate-tasks-dialog/generate-tasks-dialog.component';
import { SetDetailsDialogComponent } from './dialogs/set-details-dialog/set-details-dialog.component';

/**
 * "Reschedule Tasks" menu item (not in the original app): pick a sales person and a date range, then plan their shops
 * into sets, give each set a visit day and assign the schedule. Material modules and Forms come in through SharedModule.
 */
@NgModule({
  declarations: [RescheduleTasksComponent, GenerateTasksDialogComponent, SetDetailsDialogComponent],
  imports: [CommonModule, RescheduleTasksRoutingModule, SharedModule],
})
export class RescheduleTasksModule {}
