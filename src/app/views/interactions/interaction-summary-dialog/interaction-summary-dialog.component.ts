// Reconstructed from chunk 374.ebdfb6cdb5b2c104.js (component "oe", selector app-interaction-summary-dialog).
// Opened by InteractionListComponent.interactionSummaryPopUp() with
// { width: '50%', height: '90%', disableClose: true,
//   data: { title: 'Interaction Summary', interactionReport: InteractionSummaryRow[] } }.
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import Swal from 'sweetalert2';

import { AppLoaderService } from 'app/shared/services/app-loader/app-loader.service';
import { ExcelService } from 'app/shared/services/excel.service';
import { InteractionSummaryRow } from '../models/interaction.model';

@Component({
  selector: 'app-interaction-summary-dialog',
  templateUrl: './interaction-summary-dialog.component.html',
  styleUrls: ['./interaction-summary-dialog.component.scss'],
})
export class InteractionSummaryDialogComponent implements OnInit, OnDestroy {
  private ngUnsubscribe = new Subject<void>();
  displayedColumns1: string[] = ['salesPersonName', 'salesPersonMobileNumber', 'taskCount', 'interactionCount'];
  interactionReport: InteractionSummaryRow[];

  constructor(
    public dialogRef: MatDialogRef<InteractionSummaryDialogComponent>,
    private fb: FormBuilder, // unused
    private egretLoader: AppLoaderService,
    private excelService: ExcelService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.interactionReport = data.interactionReport;
    console.log('this.interactionReport::', this.interactionReport);
  }

  async ngOnInit() {
    this.egretLoader.open();
    this.egretLoader.close();
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  async downloadToExcel() {
    try {
      const result = await Swal.fire({
        title: 'Do you want to proceed?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes',
        cancelButtonText: 'No',
      });
      if (!result.isConfirmed) {
        return;
      }
      this.egretLoader.open();
      const excelData = this.mapInteractionToExcelData(this.interactionReport);
      if (excelData && excelData.length > 0) {
        // -> DownloadedInteractions.xlsx, sheet "InteractionReport"
        this.excelService.exportToExcel(excelData, 'InteractionReport', 'DownloadedInteractions');
        Swal.fire('success', 'Excel Downloaded Successfully', 'success');
      } else {
        Swal.fire('error', 'No Interactions Found.', 'error');
      }
    } catch (error) {
      console.error('Error downloading interactions:', error);
      Swal.fire('error', 'An error occurred while downloading interactions.', 'error');
    } finally {
      this.egretLoader.close();
    }
  }

  mapInteractionToExcelData(report: InteractionSummaryRow[]) {
    return report.map((row) => ({
      'Sales Person Name': row.salesPersonName,
      'Sales Person MobileNumber': row.salesPersonMobileNumber,
      'Total Count': row.taskCount,
      'Total Visited Count': row.interactionCount,
    }));
  }
}
