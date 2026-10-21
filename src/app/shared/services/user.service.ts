// Source: main.0ad03de76494ddf1.js webpack module 9143, export `KD` (class concatenated into the services barrel).
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { DbCollections } from '../constants/db-collections';
import { FirestoreOperator } from '../models/enums';
import { FirestoreFilter } from '../models/firestore-filter.model';
import { FirebaseDbService } from './firebase-db.service';
import { FirestoreService } from './firestore.service';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  constructor(
    private firebaseDbService: FirebaseDbService,
    private http: HttpClient,
    private firestoreService: FirestoreService,
  ) {}

  /** Live RTDB node `Crm/{userId}`. */
  fetchUserById(userId: string) {
    return this.firebaseDbService.fetchDataFromNode(`${DbCollections.CRM}/${userId}`);
  }

  /** Firestore `Users` where user_type == userType (logs the response as shipped). */
  async fetchSalesPersons(userType: number) {
    const filters: FirestoreFilter[] = [
      { fieldName: 'user_type', fieldValue: userType, operator: FirestoreOperator.EqualTo },
    ];
    const response = await this.firestoreService.queryCollectionByFilters(DbCollections.USERS, filters);
    console.log('response ::::', response);
    return response;
  }
}
