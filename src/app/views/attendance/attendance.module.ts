import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';

import { SharedModule } from 'app/shared/shared.module'; // main module 2994 (export m)
import { AttendanceRoutingModule } from './attendance-routing.module';
import { AttendanceComponent } from './attendance.component';
import { AttendanceSummaryComponent } from './attendance-summary/attendance-summary.component';
import { LeaveRequestComponent } from './leave-request/leave-request.component';
import { AttendanceDetailsComponent } from './attendance-details/attendance-details.component';

/**
 * Chunk 205 (lazy). Loaded together with chunk 574 (SheetJS xlsx 0.18.5) and the common chunk 592
 * (ExcelService + CustomerService).
 *
 * SharedModule re-exports Forms/ReactiveForms and the SharedMaterialModule, which supplies
 * MatTabs, MatSelect, MatFormField, MatInput, MatDatepicker, MatSidenav, MatSort, MatButton, etc.
 * SharedModule also provides AppLoaderService (not providedIn root).
 */
@NgModule({
  declarations: [
    AttendanceComponent,
    AttendanceSummaryComponent,
    LeaveRequestComponent,
    AttendanceDetailsComponent,
  ],
  imports: [
    CommonModule,
    AttendanceRoutingModule,
    SharedModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
  ],
})
export class AttendanceModule {}
