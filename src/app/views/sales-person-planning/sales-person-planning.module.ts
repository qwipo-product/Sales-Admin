import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatPseudoCheckboxModule } from '@angular/material/core';

import { SharedModule } from '../../shared/shared.module';
import { SalesPersonPlanningRoutingModule } from './sales-person-planning-routing.module';

import { SettingsComponent } from './settings/settings.component';
import { SalesPersonAreasComponent } from './sales-person-areas/sales-person-areas.component';
import { SalesPersonMappingComponent } from './sales-person-mapping/sales-person-mapping.component';
import { SalesPersonTasksComponent } from './sales-person-tasks/sales-person-tasks.component';
import { AddAreaDialogComponent } from './dialogs/add-area-dialog/add-area-dialog.component';
import { AddJsonDialogComponent } from './dialogs/add-json-dialog/add-json-dialog.component';
import { AddAreaNameDialogComponent } from './dialogs/add-area-name-dialog/add-area-name-dialog.component';
import { UpdateCoordinatesDialogComponent } from './dialogs/update-coordinates-dialog/update-coordinates-dialog.component';
import { SelectAreaDialogComponent } from './dialogs/select-area-dialog/select-area-dialog.component';
import { PreviewDialogComponent } from './dialogs/preview-dialog/preview-dialog.component';
import { ClusterTypePipe } from './pipes/cluster-type.pipe';

/**
 * Lazy module for route "salesperson-planning" (chunk 35 + shared chunk 592/common).
 * Prod ɵinj imports: [CommonModule, SalesPersonPlanningRoutingModule, SharedModule].
 * Declarations are not emitted in prod ɵmod; they are inferred from the components defined in chunk 35.
 * All Material modules (tabs, sidenav, table, sort, card, button, icon, input, form-field, radio,
 * select, checkbox, datepicker, dialog) + Forms/ReactiveForms come in through SharedModule.
 */
@NgModule({
  declarations: [
    SettingsComponent,
    SalesPersonAreasComponent,
    SalesPersonMappingComponent,
    SalesPersonTasksComponent,
    AddAreaDialogComponent,
    AddJsonDialogComponent,
    AddAreaNameDialogComponent,
    UpdateCoordinatesDialogComponent,
    SelectAreaDialogComponent,
    PreviewDialogComponent,
    ClusterTypePipe,
  ],
  // MatPseudoCheckboxModule: the "Select all" rows of the Tasks tab drop-downs (not in the original app).
  imports: [CommonModule, SalesPersonPlanningRoutingModule, SharedModule, MatPseudoCheckboxModule],
})
export class SalesPersonPlanningModule {}
