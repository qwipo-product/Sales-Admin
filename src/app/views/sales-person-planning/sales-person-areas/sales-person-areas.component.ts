import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject, Subscription, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { CustomersService } from '../../../shared/services/customers.service';
import { SalesPersonService } from '../../../shared/services/sales-person.service';
import { AuthService } from '../../../shared/services/auth/auth.service';
import { AppLoaderService } from '../../../shared/services/app-loader/app-loader.service';
import { PageIds } from '../../../shared/constants/page-ids';
import {
  convertKeysToLowerCase,
  convertToLatLng,
  generateAreaId,
  getBusinessTypesByClusterType as getBusinessCategoryIdsByClusterType,
} from '../../../shared/helpers/utils';
import { PolygonService } from '../services/polygon.service';
import { MessageQueueService } from '../services/message-queue.service';
import { ScopedLoader } from '../services/scoped-loader';
import { AddAreaDialogComponent } from '../dialogs/add-area-dialog/add-area-dialog.component';
import { AddAreaNameDialogComponent } from '../dialogs/add-area-name-dialog/add-area-name-dialog.component';
import { UpdateCoordinatesDialogComponent } from '../dialogs/update-coordinates-dialog/update-coordinates-dialog.component';
import { AddJsonDialogComponent } from '../dialogs/add-json-dialog/add-json-dialog.component';
import { Cluster, GeoJsonCustomer, LatLng, MappedSalesPerson, PagePermission } from '../models/sales-person-planning.models';

/**
 * "Areas" tab (selector `sales-person-areas`, minified `Cm`).
 * Lists Firestore `SalesPersonClusters` and lets the user add an area (optionally with a 1-feature GeoJSON),
 * bulk-update polygons from a GeoJSON FeatureCollection, rename, replace a polygon, delete, refresh the
 * customers of one area or queue a refresh of all areas.
 *
 * Axis order: Firestore `coordinates` are `{ latitude, longitude }`; every polygon handed to turf
 * (PolygonService) or to customers_by_geojson is a GeoJSON ring of `[longitude, latitude]` (see toGeoJsonRing).
 */
@Component({
  selector: 'sales-person-areas',
  templateUrl: './sales-person-areas.component.html',
  styleUrls: ['./sales-person-areas.component.scss'],
})
export class SalesPersonAreasComponent implements OnInit, OnDestroy {
  pageId = PageIds.crm_salesperson_planning;
  displayedColumns: string[] = ['id', 'name', 'type', 'customerCount', 'updateJson', 'delete', 'refresh'];
  dataSource: Cluster[] = [];
  /** Accepted property keys (GeoJSON feature.properties) for the area id. */
  idCasingOptions: string[] = ['id', 'Id', 'ID', 'iD'];
  /** Accepted property keys for the area name (used after lower-casing the keys, so only lower-case ones match). */
  areaCasingOptions: string[] = ['areaname', 'areacode', 'AreaCode', 'areaName', 'AreaName', 'areaCode'];
  /** Accepted property keys for the area type. */
  typeCasingOptions: string[] = ['Type', 'type'];
  permissionObj: PagePermission;
  permissionSubscription: Subscription;
  private destroy$ = new Subject<void>();
  private loader: ScopedLoader;

  constructor(
    private dialog: MatDialog,
    private customerService: CustomersService,
    private salesPersonService: SalesPersonService,
    private polygonService: PolygonService,
    private egretLoader: AppLoaderService,
    private messageQueueService: MessageQueueService,
    private authService: AuthService
  ) {
    this.loader = new ScopedLoader(this.egretLoader);
  }

  async ngOnInit() {
    this.permissionSubscription = this.authService.permission$.pipe(takeUntil(this.destroy$)).subscribe(async (permissions: any) => {
      console.log('this.permissionObj res:- ', permissions);
      if (permissions && Object.keys(permissions).length > 0) {
        this.permissionObj = permissions[this.pageId];
        console.log('this.permissionObj:- ', this.permissionObj);
      }
    });
    await this.getClusters();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // The tab is destroyed on every tab switch: never leave its "Please wait" dialog behind.
    this.loader.close();
  }

  async getClusters() {
    this.loader.open();
    try {
      const clusters = await this.salesPersonService.getAllClusters();
      if (clusters) {
        this.dataSource = clusters;
      }
    } catch (error) {
      console.log('getClusters Error ::: ', error);
    } finally {
      this.loader.close();
    }
  }

  /** "Add Area" button. */
  addCluster(cluster: Cluster | null = null) {
    this.dialog
      .open(AddAreaDialogComponent, {
        width: '75%',
        disableClose: true,
        data: {
          title: 'Add Area',
          cluster,
          currentClusterSearchKeys: this.dataSource.map((c) => c.searchKey),
        },
      })
      .afterClosed()
      .subscribe(async (result: any) => {
        // Closing the dialog with the X icon returns undefined.
        const newCluster = result?.cluster;
        if (!newCluster) return;
        try {
          if (newCluster.coordinates && newCluster.coordinates.length > 0) {
            const sameTypeClusters = this.dataSource.filter((c) => c.type === newCluster.type);
            const overlappingAreaNames = this.checkAreaOverlap(this.toGeoJsonRing(newCluster.coordinates), sameTypeClusters);
            if (overlappingAreaNames.length > 0) {
              Swal.fire(
                'Warning!',
                `<span style="color: green">${this.escapeHtml(overlappingAreaNames.join(','))}</span> Areas Coordinates Matching with <span style="color: red">${this.escapeHtml(newCluster.name)}</span>`,
                'warning'
              );
              return;
            }
          }
          this.loader.open();
          newCluster.id = generateAreaId();
          const customers: GeoJsonCustomer[] =
            (newCluster.coordinates?.length > 0 &&
              (await this.customerService.fetchCustomersNearGeoJson(
                this.toGeoJsonPolygon(newCluster.coordinates),
                getBusinessCategoryIdsByClusterType(newCluster.type)
              ))) ||
            [];
          newCluster.customerCount = customers.length;
          if (newCluster.customerCount > 0) {
            newCluster.customers = this.mapArrayToCustomers(customers);
          }
          await this.salesPersonService.createCluster(newCluster);
          // createCluster (FirestoreService.insertDocWithId) swallows write errors: read the doc back, this throws
          // 'No such document!' when the area was not saved.
          await this.salesPersonService.getCluster(newCluster.id);
          await this.getNewClusters();
          Swal.fire('success', 'Added Cluster Successfully', 'success');
        } catch (error) {
          Swal.fire('warning', 'Something Went Wrong', 'warning');
          console.log('addClusterOrUpdatePopUp Error ::: ', error);
        } finally {
          this.loader.close();
        }
      });
  }

  /** Pencil icon in the "Area Name" column. */
  async updateClusterName(cluster: Cluster) {
    this.dialog
      .open(AddAreaNameDialogComponent, {
        width: '40%',
        disableClose: true,
        data: {
          title: 'Update Area Name',
          cluster,
          currentClusterSearchKeys: this.dataSource.map((c) => c.searchKey),
        },
      })
      .afterClosed()
      .subscribe(async (result: any) => {
        // Closing the dialog with the X icon returns undefined.
        const updatedCluster = result?.cluster;
        if (!updatedCluster) return;
        if (updatedCluster.searchKey == result.previousSearchKey) {
          Swal.fire('warning', 'There Is No Change', 'warning');
          return;
        }
        try {
          this.loader.open();
          const clusterUpdate = { name: updatedCluster.name, searchKey: updatedCluster.searchKey };
          await this.salesPersonService.updateCluster(updatedCluster.id, clusterUpdate);
          const salesPerson = await this.salesPersonService.getSalesPersonByClusterId(updatedCluster.id);
          const salesPersonUpdate = { cluster: { id: updatedCluster.id, name: updatedCluster.name } };
          if (salesPerson) {
            await this.salesPersonService.updateSalesPersonCluster(salesPerson.id, salesPersonUpdate);
          }
          await this.getNewClusters();
          Swal.fire('success', 'Area Name Updated Successfully', 'success');
        } catch (error) {
          Swal.fire('warning', 'Something Went Wrong', 'warning');
          console.log('updateClusterName Error ::: ', error);
        } finally {
          this.loader.close();
        }
      });
  }

  /** cloud_upload icon in the "Update Polygon" column. */
  async updateClusterCoordinates(cluster: Cluster) {
    this.dialog
      .open(UpdateCoordinatesDialogComponent, {
        width: '40%',
        disableClose: true,
        data: {
          title: 'Update Coordinates Name',
          cluster: JSON.parse(JSON.stringify(cluster)),
          updatedCoordinates: null,
        },
      })
      .afterClosed()
      .subscribe(async (result: any) => {
        if (result == null) return;
        try {
          const updatedCluster = { ...result.cluster };
          const updatedCoordinates: LatLng[] = result.updatedCoordinates;
          if (!updatedCoordinates || updatedCoordinates.length === 0) {
            // The uploaded feature has no polygon ring.
            Swal.fire('', 'Invalid File', 'error');
            return;
          }
          const uploadedRing = this.toGeoJsonRing(updatedCoordinates);
          const existingCluster = await this.salesPersonService.getCluster(updatedCluster.id);
          if (existingCluster.coordinates != null && existingCluster.coordinates.length > 0) {
            if (this.polygonService.arePolygonsSame(uploadedRing, this.toGeoJsonRing(existingCluster.coordinates))) {
              Swal.fire('No Updates Found ', 'No Coordinates are found updated', 'info');
              return;
            }
          }
          // Overlap check against the OTHER areas of the same type (the edited area itself is excluded: its new
          // polygon normally overlaps its own current one).
          const otherClusters = this.dataSource.filter((c) => c.type === cluster.type && c.id !== updatedCluster.id);
          const overlappingWithOthers = this.checkAreaOverlap(uploadedRing, otherClusters);
          if (overlappingWithOthers.length > 0) {
            Swal.fire(
              'Warning!',
              `<span style="color: green">${this.escapeHtml(overlappingWithOthers.join(','))}</span> Areas Coordinates Matching with <span style="color: red">${this.escapeHtml(cluster.name)}</span>`,
              'warning'
            );
            return;
          }
          updatedCluster.coordinates = JSON.parse(JSON.stringify(updatedCoordinates));
          const salesPerson = await this.salesPersonService.getSalesPersonByClusterId(updatedCluster.id);
          await this.handelClusterUpdate(updatedCluster, existingCluster, salesPerson || null);
        } catch (error) {
          Swal.fire('warning', 'Something Went Wrong', 'warning');
          console.log('updateClusterCoordinates Error ::: ', error);
        }
      });
  }

  async handelClusterUpdate(cluster: any, existingCluster: any, salesPerson: any = null) {
    this.loader.open();
    try {
      const customers: GeoJsonCustomer[] =
        (await this.customerService.fetchCustomersNearGeoJson(
          this.toGeoJsonPolygon(cluster.coordinates),
          getBusinessCategoryIdsByClusterType(cluster.type)
        )) || [];
      const clusterUpdate: any = { coordinates: cluster.coordinates, customerCount: customers.length };
      if (customers.length > 0) {
        clusterUpdate.customers = this.mapArrayToCustomers(customers);
      }
      if (existingCluster.customerCount > 0) {
        await this.salesPersonService.deleteClusterCustomers(existingCluster.id);
      }
      await this.salesPersonService.updateCluster(cluster.id, clusterUpdate);
      if (salesPerson) {
        await this.updateSalesPersonMappingOnClusterUpdate('UpdateClusterPolygon', salesPerson.id, cluster.id);
      }
      await this.getNewClusters();
      Swal.fire('success', 'Json Uploaded Successfully', 'success');
    } catch (error) {
      Swal.fire('warning', 'Something Went Wrong', 'warning');
      console.log('updateClusterCoordinates Error ::: ', error);
    } finally {
      this.loader.close();
    }
  }

  /** Red delete icon in the "Delete" column. */
  async deleteCluster(cluster: Cluster) {
    const clusterId = cluster.id;
    try {
      const salesPerson = await this.salesPersonService.getSalesPersonByClusterId(clusterId);
      const confirmation = await Swal.fire({
        title: 'Do you want to Delete?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes',
        cancelButtonText: 'No',
      });
      if (!confirmation.isConfirmed) return;
      this.loader.open();
      await Promise.all([
        this.salesPersonService.deleteCluster(clusterId),
        salesPerson && this.updateSalesPersonMappingOnClusterUpdate('DeActivateSalesPerson', salesPerson.id, clusterId),
      ]);
      this.dataSource = this.dataSource.filter((c) => c.id !== clusterId);
      Swal.fire('success', 'Deleted Cluster Successfully', 'success');
    } catch (error) {
      Swal.fire('warning', 'Something Went Wrong', 'warning');
      console.log('deleteCluster Error ::: ', error);
    } finally {
      this.loader.close();
    }
  }

  async updateSalesPersonMappingOnClusterUpdate(messageType: string, salesPersonId: string, currentAreaId: string) {
    const message = {
      messageType,
      input: JSON.stringify({ salesPersonId, currentAreaId }),
    };
    await this.messageQueueService.postMessageToQueue(message);
  }

  /** "Upload Geo Json" button: bulk polygon update of EXISTING areas (ids must match). */
  addPolygonToClustersPopUp() {
    this.dialog
      .open(AddJsonDialogComponent, {
        width: '75%',
        disableClose: true,
        data: { title: 'Add Geo-Json' },
      })
      .afterClosed()
      .subscribe(async (result: any) => {
        if (result == null) return;
        try {
          const polygons = result.polygons || [];
          if (
            this.checkAndShowOverlapWarnings(polygons) ||
            this.checkForDuplicateClusterNames(polygons) ||
            this.checkForWrongClusterIds(polygons)
          ) {
            return;
          }
          const overlappingClusters = this.findOverlappingClusters(polygons);
          if (overlappingClusters.length > 0) {
            this.showOverlapWarning(overlappingClusters);
            return;
          }
          const updatedPolygonsInfo = this.getUpdatedPolygonsInfo(polygons);
          if (updatedPolygonsInfo.updatedPolygons.length === 0) {
            Swal.fire('No Updates Found ', 'No Coordinates are found updated', 'info');
            return;
          }
          this.loader.open();
          const mappedSalesPersons: MappedSalesPerson[] = await this.salesPersonService.getMappedSalesPersonFromClusterIds(
            updatedPolygonsInfo.updatedPolygonsIds
          );
          if (mappedSalesPersons.length > 0) {
            const title = mappedSalesPersons
              .map(
                (sp) =>
                  `Do You Want to Update Following salespersons <span style="color:red">${this.escapeHtml(sp.salesPersonName)}-${this.escapeHtml(sp.clusterName)}</span>`
              )
              .join('\n');
            const confirmation = await Swal.fire({
              title,
              icon: 'question',
              showCancelButton: true,
              confirmButtonText: 'Yes',
              cancelButtonText: 'No',
            });
            if (!confirmation.isConfirmed) {
              return;
            }
          }
          let allUpdated = true;
          for (const polygon of updatedPolygonsInfo.updatedPolygons) {
            if (!(await this.updateClusterAndSalesPerson(polygon, mappedSalesPersons))) {
              allUpdated = false;
            }
          }
          await this.getNewClusters();
          if (allUpdated) {
            Swal.fire('success', 'Json Uploaded Successfully', 'success');
          } else {
            Swal.fire('warning', 'Something Went Wrong', 'warning');
          }
        } catch (error) {
          Swal.fire('warning', 'Something Went Wrong', 'warning');
          console.log('addPolygonToClustersPopUp ::: error ::: ', error);
        } finally {
          this.loader.close();
        }
      });
  }

  /** Updates one existing area from an uploaded feature; resolves false (and logs) when any step failed. */
  async updateClusterAndSalesPerson(polygon: any, mappedSalesPersons: MappedSalesPerson[] = []): Promise<boolean> {
    try {
      const clusterId = this.getIdFromPolygon(polygon.properties, this.idCasingOptions);
      const existingCluster = this.dataSource.find((c) => c.id === clusterId);
      const mappedSalesPerson = mappedSalesPersons.find((sp) => sp.clusterId === clusterId);
      // Uploaded GeoJSON ring: [longitude, latitude] positions.
      const ring = polygon.geometry.coordinates[0];
      const geoJson = { type: 'Polygon', coordinates: [ring] };
      const clusterType = existingCluster ? existingCluster.type : this.getFeatureType(polygon);
      const customers: GeoJsonCustomer[] =
        (await this.customerService.fetchCustomersNearGeoJson(geoJson, getBusinessCategoryIdsByClusterType(clusterType))) || [];
      const clusterUpdate: any = {
        coordinates: convertToLatLng(ring),
        customerCount: customers.length,
      };
      if (customers.length > 0) {
        clusterUpdate.customers = this.mapArrayToCustomers(customers);
      }
      await this.salesPersonService.deleteClusterCustomers(clusterId);
      await this.salesPersonService.updateCluster(clusterId, clusterUpdate);
      if (mappedSalesPerson) {
        await this.updateSalesPersonMappingOnClusterUpdate('UpdateClusterPolygon', mappedSalesPerson.salesPersonId, clusterId);
      }
      return true;
    } catch (error) {
      console.log('updateClusterAndSalesPerson ::: error ::: ', error);
      return false;
    }
  }

  /** Reloads the table; errors are logged (the caller owns the loader). */
  async getNewClusters() {
    try {
      const clusters = await this.salesPersonService.getAllClusters();
      if (clusters) {
        this.dataSource = clusters;
      }
    } catch (error) {
      console.log('getNewClusters Error ::: ', error);
    }
  }

  /** Returns the uploaded features whose polygon differs from the stored one (plus their ids). */
  getUpdatedPolygonsInfo(polygons: any[]): { updatedPolygons: any[]; updatedPolygonsIds: string[] } {
    try {
      const updatedPolygons: any[] = [];
      const updatedPolygonsIds: string[] = [];
      for (const polygon of polygons) {
        const clusterId = this.getIdFromPolygon(polygon.properties, this.idCasingOptions);
        const existingCoordinates = this.toGeoJsonRing(this.dataSource.find((c) => c.id === clusterId)?.coordinates);
        if (!(existingCoordinates.length > 0 && this.polygonService.arePolygonsSame(existingCoordinates, polygon.geometry.coordinates[0]))) {
          updatedPolygons.push(polygon);
          updatedPolygonsIds.push(clusterId);
        }
      }
      return { updatedPolygons, updatedPolygonsIds };
    } catch (error) {
      console.log('getUpdatedPolygonsInfo ::: error ::: ', error);
      throw error;
    }
  }

  /** refresh icon in the "Refresh" column: re-query customers inside the polygon and re-map the sales person. */
  async refreshClusterCustomers(cluster: Cluster) {
    this.loader.open();
    try {
      // An area without a polygon has no customers.
      const customers: GeoJsonCustomer[] =
        (cluster?.coordinates?.length > 0 &&
          (await this.customerService.fetchCustomersNearGeoJson(
            this.toGeoJsonPolygon(cluster.coordinates),
            getBusinessCategoryIdsByClusterType(cluster.type)
          ))) ||
        [];
      const customerIds = customers.map((c) => c.id);
      const clusterUpdate: any = { customerCount: customers.length };
      if (customers.length > 0) {
        clusterUpdate.customers = this.mapArrayToCustomers(customers);
      }
      // The stored customers are only dropped once the new list has been fetched.
      await this.salesPersonService.deleteClusterCustomers(cluster.id);
      await this.salesPersonService.updateCluster(cluster.id, clusterUpdate);

      let refreshed = true;
      const salesPerson = await this.salesPersonService.getSalesPersonByClusterId(cluster.id);
      if (salesPerson) {
        const salesPersonUpdate = { customerCount: customers.length };
        await this.salesPersonService.updateSalesPersonCluster(salesPerson.id, salesPersonUpdate);
        if (!(await this.salesPersonService.unMapSalesPerson(salesPerson.id))) {
          refreshed = false;
          Swal.fire('Warning!', 'Failed to unmap customers from sales person', 'warning');
        } else if (!(await this.salesPersonService.mapSalesPerson(salesPerson.id, customerIds))) {
          refreshed = false;
          Swal.fire('Warning!', 'Failed to map customers to sales person', 'warning');
        }
      }
      this.dataSource = await this.salesPersonService.getAllClusters();
      if (refreshed) {
        Swal.fire('success', 'Cluster customers refreshed successfully!', 'success');
      }
    } catch (error) {
      Swal.fire('Warning!', 'Error refreshing cluster customers:', 'warning');
      console.log('error in refreshClusterCustomers :::: ', error);
    } finally {
      this.loader.close();
    }
  }

  /** "Sync All Areas" button: queue a backend refresh of every area. */
  async refreshAllClusters() {
    const clusters = this.dataSource;
    this.loader.open();
    try {
      const input = { areaIds: clusters.map((c) => c.id) };
      const message = { messageType: 'RefreshClusters', input: JSON.stringify(input) };
      await this.messageQueueService.postMessageToQueue(message);
      Swal.fire('success', 'Cluster customers refresh is in progress please wait for 10 to 15 minutes!', 'success');
    } catch (error) {
      Swal.fire('warning', 'Something Went Wrong', 'warning');
      console.log('refreshAllClusters Error ::: ', error);
    } finally {
      this.loader.close();
    }
  }

  /** Overlaps among the uploaded features themselves, per type (1 = General, 2 = Wholesale). */
  checkAndShowOverlapWarnings(polygons: any[]): boolean {
    return !!(this.checkAndShowOverlapWarning(polygons, 1) || this.checkAndShowOverlapWarning(polygons, 2));
  }

  checkForDuplicateClusterNames(polygons: any[]): boolean {
    const names: any[] = [];
    const duplicateNames: any[] = [];
    for (const polygon of polygons) {
      const lowerCaseProperties = convertKeysToLowerCase(polygon.properties);
      const name = this.getIdFromPolygon(lowerCaseProperties, this.areaCasingOptions);
      if (names.includes(name)) {
        duplicateNames.push(name);
      }
      names.push(name);
    }
    if (duplicateNames.length > 0) {
      Swal.fire('Warning!', `<span style="color:red"> ${this.escapeHtml(duplicateNames.join(','))}</span> Names repeating Please Check`, 'warning');
      return true;
    }
    return false;
  }

  checkForWrongClusterIds(polygons: any[]): boolean {
    const wrongIdNames: any[] = [];
    for (const polygon of polygons) {
      const clusterId = this.getIdFromPolygon(polygon.properties, this.idCasingOptions);
      const lowerCaseProperties = convertKeysToLowerCase(polygon.properties);
      const name = this.getIdFromPolygon(lowerCaseProperties, this.areaCasingOptions);
      if (clusterId == null || !this.dataSource.find((c) => c.id === clusterId)) {
        wrongIdNames.push(name);
      }
    }
    if (wrongIdNames.length > 0) {
      Swal.fire('Warning!', `<span style="color:red"> ${this.escapeHtml(wrongIdNames.join(','))}</span> Id's are Not Matching Please Check`, 'warning');
      return true;
    }
    return false;
  }

  /**
   * Uploaded features overlapping stored areas of the same type. Stored areas that are themselves part of the
   * upload are skipped: they get new polygons (already checked against each other by checkAndShowOverlapWarnings),
   * so comparing with their current polygon would reject an area for overlapping its own old shape.
   */
  findOverlappingClusters(polygons: any[]): { name: any; existingClusterNames: string[] }[] {
    const overlapping: { name: any; existingClusterNames: string[] }[] = [];
    const uploadedIds = polygons.map((polygon) => this.getIdFromPolygon(polygon.properties, this.idCasingOptions));
    for (const polygon of polygons) {
      const lowerCaseProperties = convertKeysToLowerCase(polygon.properties);
      const name = this.getIdFromPolygon(lowerCaseProperties, this.areaCasingOptions);
      const type = this.getFeatureType(polygon);
      const sameTypeClusters = this.dataSource.filter((c) => c.type === type && !uploadedIds.includes(c.id));
      const existingClusterNames = this.checkAreaOverlap(polygon.geometry.coordinates[0], sameTypeClusters);
      if (existingClusterNames.length > 0) {
        overlapping.push({ name, existingClusterNames });
      }
    }
    return overlapping;
  }

  showOverlapWarning(overlappingClusters: { name: any; existingClusterNames: string[] }[]) {
    const message = overlappingClusters
      .map((item) => {
        const existingNames = item.existingClusterNames.join(', ');
        return `<span style="color:red">${this.escapeHtml(item.name)}</span> <span style="color:black">overlaps with</span> <span style="color:red">${this.escapeHtml(existingNames)}</span>`;
      })
      .join(',');
    Swal.fire('Warning!', `${message} Please Check`, 'warning');
  }

  /** Names of `clusters` whose stored polygon equals/overlaps `coordinates` (a GeoJSON [lng, lat] ring). */
  checkAreaOverlap(coordinates: number[][], clusters: Cluster[]): string[] {
    const overlappingNames: string[] = [];
    for (const cluster of clusters) {
      if (cluster.coordinates != null && cluster.coordinates.length > 0) {
        const clusterCoordinates = this.toGeoJsonRing(cluster.coordinates);
        this.polygonService.arePolygonsOverlapping(coordinates, clusterCoordinates)
          ? overlappingNames.push(cluster.name)
          : console.log('not overlap', cluster.name);
      }
    }
    return overlappingNames;
  }

  getOverlappingPolygonNames(polygons: any[]): any[] {
    const names: any[] = [];
    for (let i = 0; i < polygons.length; i++) {
      for (let j = i + 1; j < polygons.length; j++) {
        const first = polygons[i];
        const second = polygons[j];
        if (this.polygonService.arePolygonsOverlapping(first.geometry.coordinates[0], second.geometry.coordinates[0])) {
          const firstName = this.getIdFromPolygon(first.properties, this.areaCasingOptions);
          const secondName = this.getIdFromPolygon(second.properties, this.areaCasingOptions);
          names.push(firstName);
          names.push(secondName);
        }
      }
    }
    return names;
  }

  checkAndShowOverlapWarning(polygons: any[], type: number): boolean {
    const sameTypePolygons = polygons.filter((p) => this.getFeatureType(p) === type);
    const overlappingNames = this.getOverlappingPolygonNames(sameTypePolygons);
    if (overlappingNames.length > 0) {
      Swal.fire(
        'Warning!',
        `<span style="color:red">${this.escapeHtml(overlappingNames.join(','))}</span> Area Polygons are Overlapping. Please Check`,
        'warning'
      );
      return true;
    }
    return false;
  }

  /** First matching key of `keys` in `properties` (string values are trimmed); null if none. */
  getIdFromPolygon(properties: any = {}, keys: string[]): any {
    for (const key of keys) {
      if (properties.hasOwnProperty(key)) {
        return typeof properties[key] == 'string' ? properties[key].trim() : properties[key];
      }
    }
    return null;
  }

  /** Area type of an uploaded feature as a number (GeoJSON files may carry it as a string, e.g. "1"). */
  getFeatureType(polygon: any): number {
    return Number(this.getIdFromPolygon(polygon.properties, this.typeCasingOptions));
  }

  /** Firestore `{ latitude, longitude }[]` -> GeoJSON ring `[longitude, latitude][]`. */
  toGeoJsonRing(coordinates: LatLng[] | null | undefined): number[][] {
    return (coordinates || []).map((c) => [c.longitude, c.latitude]);
  }

  /** Body `geoJson` of customers_by_geojson for a stored polygon. */
  toGeoJsonPolygon(coordinates: LatLng[] | null | undefined): { type: string; coordinates: number[][][] } {
    return { type: 'Polygon', coordinates: [this.toGeoJsonRing(coordinates)] };
  }

  /** Values interpolated into SweetAlert2 HTML (names/ids can come from an uploaded file). */
  escapeHtml(value: any): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** customers_by_geojson result -> { [customerId]: { name: businessName } } */
  mapArrayToCustomers(customers: GeoJsonCustomer[]): { [id: string]: { name: string } } {
    const result: { [id: string]: { name: string } } = {};
    for (const customer of customers) {
      result[customer.id] = { name: customer.businessName };
    }
    return result;
  }
}
