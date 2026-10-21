import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';

import { SharedModule } from 'app/shared/shared.module'; // main module 2994 (export m)
import { PerformanceRoutingModule } from './performance-routing.module';
import { MtdPerformanceReportComponent } from './mtd-performance-report/mtd-performance-report.component';

/**
 * Chunk 41 (lazy, module id 2041). Loaded together with chunk 574 (SheetJS `xlsx` 0.18.5),
 * which the component imports directly (`import * as XLSX from 'xlsx'`).
 *
 * SharedModule supplies Forms/ReactiveForms + SharedMaterialModule (MatExpansion, MatSelect,
 * MatDatepicker, MatInput, MatFormField, MatSort, MatButton, ...) and provides AppLoaderService.
 */
@NgModule({
  declarations: [MtdPerformanceReportComponent],
  imports: [
    CommonModule,
    PerformanceRoutingModule,
    SharedModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
  ],
})
export class PerformanceModule {}
