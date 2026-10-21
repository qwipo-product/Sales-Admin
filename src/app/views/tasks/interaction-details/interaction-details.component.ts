// Reconstructed from chunk 704.86aaaae1881aced9.js (component "Ee", selector app-interaction-details).
// Dialog opened by TaskDetailsComponent.navigateToTaskList(interactionId) with
// { width: '85%', disableClose: true, data: <Firestore Interactions/{interactionId} document> }.
import { Component, Inject } from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';

import { formatDateTime, millisecondsToMinutes } from 'app/shared/helpers/common.helper'; // main.js 1972 (i$, d6)

@Component({
  selector: 'app-interaction-details',
  templateUrl: './interaction-details.component.html',
  styleUrls: ['./interaction-details.component.scss'],
  animations: [
    trigger('animate', [transition('* => *', [style({ opacity: 0 }), animate('300ms', style({ opacity: 1 }))])]),
  ],
})
export class InteractionDetailsComponent {
  displayedColumns: string[] = [
    'date',
    'customerId',
    'businessName',
    'mobileNumber',
    'salesPersonName',
    'salesPersonMobileNumber',
    'interactionCategory',
    'comments',
    'imageUrl',
    'customerVisitDuration',
    'checkInTime',
    'checkOutTime',
    'checkInLocation',
    'checkOutLocation',
    'checkInDistance',
    'checkOutDistance',
  ];
  dataSource: MatTableDataSource<any>;

  constructor(public dialogRef: MatDialogRef<InteractionDetailsComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {
    const input = [this.mapToInteraction(data)];
    console.log('input', input);
    this.dataSource = new MatTableDataSource(input);
  }

  mapToInteraction(interaction: any) {
    return {
      date: interaction.createdDate,
      customerId: interaction.customerId,
      businessName: interaction.customerInfo.name,
      mobileNumber: interaction.customerInfo.mobileNumber,
      salesPersonName: interaction.salesPersonInfo.name,
      salesPersonMobileNumber: interaction.salesPersonInfo.mobileNumber,
      interactionCategory: interaction.interactionInfo.commentCategory,
      comments: interaction.interactionInfo.comments,
      imageUrl: interaction.interactionInfo.imageUrl,
      // minutes, Math.floor((checkOut - checkIn) / 60000)
      customerVisitDuration: interaction.checkInfo.checkOutTime
        ? millisecondsToMinutes(interaction.checkInfo.checkOutTime - interaction.checkInfo.checkInTime)
        : 0,
      checkInTime: interaction.checkInfo.checkInTime != 0 ? formatDateTime(interaction.checkInfo.checkInTime) : 0,
      checkOutTime: interaction.checkInfo.checkOutTime != 0 ? formatDateTime(interaction.checkInfo.checkOutTime) : 0,
      checkInLocation: `${interaction.checkInfo.checkInLatitude}-${interaction.checkInfo.checkInLongitude}`,
      checkOutLocation: `${interaction.checkInfo.checkOutLatitude}-${interaction.checkInfo.checkOutLongitude}`,
      checkInDistance: interaction.checkInfo.checkInDistance,
      checkOutDistance: interaction.checkInfo.checkOutDistance,
    };
  }

  /** Unused by the template. */
  formatTimestamp(timestamp: number) {
    return new Date(timestamp);
  }
}
