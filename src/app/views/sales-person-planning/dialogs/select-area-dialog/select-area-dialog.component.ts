import { Component, EventEmitter, Inject, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';

import { SalesPersonService } from '../../../../shared/services/sales-person.service';
import { AppLoaderService } from '../../../../shared/services/app-loader/app-loader.service';
import { ClusterType } from '../../../../shared/models/enums';
import { MessageQueueService } from '../../services/message-queue.service';
import { ScopedLoader } from '../../services/scoped-loader';
import { Cluster, ExistingSalesPerson } from '../../models/sales-person-planning.models';

/**
 * "Select Area" dialog (selector `select-area-dialog`, minified `Pm`) - assigns an area to a sales person.
 * Opened by SalesPersonMappingComponent.selectAreaPopUp() with
 * data { title: 'Assign Area', salesPerson, existingSalesPersons: [{ id, name, areaId, areaName }] (other rows of the
 * currently filtered table) }. Writes SalesPerson/{id} { customerCount, cluster: { id, name } } and queues
 * MapSalesPersonToCluster. Closes with no result (caller always reloads).
 */
@Component({
  selector: 'select-area-dialog',
  templateUrl: './select-area-dialog.component.html',
  styleUrls: ['./select-area-dialog.component.scss'],
})
export class SelectAreaDialogComponent implements OnInit, OnDestroy {
  @Output() dialogClosed = new EventEmitter<any>();

  existingCluster: { id: string; name: string } | any;
  existingSalesPersons: ExistingSalesPerson[];
  dataSource: FormGroup;
  clusters: Cluster[];
  selectedCluster: Cluster;
  private loader: ScopedLoader;

  constructor(
    private salesPersonService: SalesPersonService,
    private egretLoader: AppLoaderService,
    public dialogRef: MatDialogRef<SelectAreaDialogComponent>,
    private fb: FormBuilder,
    private backendService: MessageQueueService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.loader = new ScopedLoader(this.egretLoader);
  }

  async ngOnInit() {
    this.loader.open();
    this.existingCluster = { id: this.data.salesPerson.areaId, name: this.data.salesPerson.areaName };
    this.existingSalesPersons = this.data.existingSalesPersons || [];
    this.dataSource = this.fb.group({ clusteredArea: [null] });
    try {
      this.clusters = await this.getClusters();
      // mat-select compares options by reference (no compareWith): pre-select the option object of the current area.
      const currentCluster = this.clusters.find((cluster) => !!this.existingCluster.id && cluster.id === this.existingCluster.id) || null;
      this.dataSource.get('clusteredArea')?.setValue(currentCluster);
      this.selectedCluster = currentCluster;
    } catch (error) {
      console.log('getClusters Error ::: ', error);
      this.clusters = [];
      Swal.fire({ title: 'Error', text: 'An error occurred. Please try again.', icon: 'error' });
    } finally {
      this.loader.close();
    }
  }

  ngOnDestroy(): void {
    this.loader.close();
  }

  onClusteredAreaChange() {
    this.selectedCluster = this.dataSource.get('clusteredArea')?.value;
  }

  /** Areas with a polygon (coordinates !== null), lightened (coordinates dropped). */
  async getClusters(): Promise<Cluster[]> {
    return (await this.salesPersonService.getAllClusters())
      .filter((cluster: Cluster) => cluster.coordinates !== null)
      .map((cluster: Cluster) => ({
        id: cluster.id,
        name: cluster.name,
        searchKey: cluster.searchKey,
        customerCount: cluster.customerCount,
        type: cluster.type || ClusterType.General,
        coordinates: null,
        createdDate: cluster.createdDate,
        updatedDate: cluster.updatedDate,
        customers: cluster?.customers || {},
      }));
  }

  /** "Submit" button. */
  async submit() {
    if (!this.selectedCluster) {
      Swal.fire('Warning!', 'Please Select the Area!', 'warning');
      return;
    }
    try {
      let confirmText: string;
      // An unmapped sales person has existingCluster = { id: '', name: '' } (areaId/areaName default to '').
      const isFirstMapping = !this.existingCluster || !this.existingCluster.id;
      if (!isFirstMapping && this.selectedCluster.id === this.existingCluster.id) {
        this.dialogRef.close();
        return;
      }
      const taggedSalesPerson = this.existingSalesPersons.find((sp) => sp.areaId === this.selectedCluster.id);
      // The "already tagged" warning comes first so that a first mapping onto a tagged area still tells the user
      // that the other sales person will be unmapped (the title is 'Warning' in that case).
      confirmText = taggedSalesPerson != null
        ? `Salesperson ${taggedSalesPerson.name} is already tagged with the area ${taggedSalesPerson.areaName}. Changing the area will unmap them. Do you want to proceed?`
        : isFirstMapping
        ? `Do you want to map the ${this.dataSource.get('clusteredArea')?.value.name} area to the Sales Person ${this.data.salesPerson.name} ?`
        : `Are you sure you want to map the ${this.dataSource.get('clusteredArea')?.value.name} area to the Sales Person ${this.data.salesPerson.name}?`;
      // The SweetAlert1-only options of the bundle (type: 'warning'|'info', closeOnConfirm: true) are dropped:
      // sweetalert2 ignored them (no icon was shown) and logged "Unknown parameter" warnings.
      const swalOptions: any = {
        title: taggedSalesPerson && Object.keys(taggedSalesPerson).length > 0 ? 'Warning' : 'Info',
        text: confirmText,
        showCancelButton: true,
        confirmButtonColor: '#13BB6F',
        confirmButtonText: 'Yes',
        cancelButtonText: 'Cancel',
      };
      if (!(await Swal.fire(swalOptions)).value) return;

      this.loader.open();
      const selectedArea = this.dataSource.get('clusteredArea')?.value;
      const salesPersonUpdate = {
        customerCount: selectedArea.customerCount,
        cluster: { id: selectedArea.id, name: selectedArea.name },
      };
      const message = {
        messageType: 'MapSalesPersonToCluster',
        input: JSON.stringify({
          salesPersonId: this.data.salesPerson.id,
          currentAreaId: isFirstMapping ? '' : this.existingCluster.id,
          newAreaId: this.selectedCluster.id,
          newAreaTaggedSalesPersonId: taggedSalesPerson ? taggedSalesPerson.id : '',
        }),
      };
      try {
        await this.salesPersonService.updateSalesPersonCluster(this.data.salesPerson.id, salesPersonUpdate);
        await this.backendService.postMessageToQueue(message);
        this.existingCluster = selectedArea;
        this.loader.close();
        const successText = isFirstMapping
          ? `Salesperson ${this.data.salesPerson.name} has been successfully mapped. Please allow up to 10 minutes for the changes to reflect.`
          : taggedSalesPerson != null
          ? `The previous mapping for salespersons in ${taggedSalesPerson.areaName} is currently being updated. The previous area was ${this.data.salesPerson.areaName}. Please wait for about 10 minutes for the changes to take effect for ${taggedSalesPerson.name}.`
          : `Current area un-mapping process is in progress for ${this.data.salesPerson.name} from ${this.data.salesPerson.areaName}. Please allow up to 10 minutes for these changes to reflect.`;
        Swal.fire({ title: 'Success!', text: successText, icon: 'success' });
        this.dialogRef.close();
      } catch (error) {
        console.log('Error in Submit :: ', error);
        this.loader.close();
        Swal.fire({ title: 'Error', text: 'An error occurred. Please try again.', icon: 'error' });
      }
    } catch (error) {
      console.log('error in Submit :: ', error);
    } finally {
      this.loader.close();
    }
  }
}
