// The Firebase Auth / Firestore calls AuthService needs, behind one small interface so the app can run either
// against the real Firebase project (FirebaseAuthBackend) or the local sample data (MockAuthBackend in app/mock).
import { Injectable } from '@angular/core';
import {
  Auth,
  authState,
  createUserWithEmailAndPassword,
  getIdToken,
  getIdTokenResult,
  sendPasswordResetEmail,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from '@angular/fire/auth';
import { Firestore, collection, collectionData, doc, docData, getDoc, query } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

/** The parts of a Firebase `User` the app uses. */
export interface AuthUser {
  uid: string;
  [key: string]: any;
}

export interface AuthCredential {
  user: AuthUser;
}

export interface AuthTokenResult {
  token: string;
  expirationTime: string;
}

export abstract class AuthBackend {
  /** Emits the signed-in user (or null) whenever the session changes. */
  abstract authState(): Observable<AuthUser | null>;
  abstract currentUser(): AuthUser | null;
  abstract signInWithCustomToken(token: string): Promise<AuthCredential>;
  abstract signOut(): Promise<void>;
  abstract getIdTokenResult(user: AuthUser): Promise<AuthTokenResult>;
  abstract getIdToken(user: AuthUser, forceRefresh?: boolean): Promise<string>;
  /** Live Firestore document (with `id` merged in). */
  abstract docData<T = any>(path: string): Observable<T>;
  /** Live Firestore collection (with `id` merged into every document). */
  abstract collectionData<T = any>(path: string): Observable<T[]>;
  abstract getDoc<T = any>(path: string): Promise<T | undefined>;
  // Legacy Egret email/password helpers (not used by the app UI)
  abstract createUserWithEmailAndPassword(email: string, password: string): Promise<unknown>;
  abstract signInWithEmailAndPassword(email: string, password: string): Promise<unknown>;
  abstract sendPasswordResetEmail(email: string): Promise<void>;
  abstract updateProfile(displayName: string, photoURL: string): Promise<void>;
}

@Injectable()
export class FirebaseAuthBackend extends AuthBackend {
  constructor(
    private auth: Auth,
    private firestore: Firestore,
  ) {
    super();
  }

  authState(): Observable<AuthUser | null> {
    return authState(this.auth);
  }

  currentUser(): AuthUser | null {
    return this.auth.currentUser;
  }

  signInWithCustomToken(token: string): Promise<AuthCredential> {
    return signInWithCustomToken(this.auth, token);
  }

  signOut(): Promise<void> {
    return signOut(this.auth);
  }

  getIdTokenResult(user: AuthUser): Promise<AuthTokenResult> {
    return getIdTokenResult(user as any);
  }

  getIdToken(user: AuthUser, forceRefresh?: boolean): Promise<string> {
    return getIdToken(user as any, forceRefresh);
  }

  docData<T = any>(path: string): Observable<T> {
    return docData(doc(this.firestore, path), { idField: 'id' } as any) as Observable<T>;
  }

  collectionData<T = any>(path: string): Observable<T[]> {
    return collectionData(query(collection(this.firestore, path)), { idField: 'id' }) as Observable<T[]>;
  }

  async getDoc<T = any>(path: string): Promise<T | undefined> {
    return (await getDoc(doc(this.firestore, path))).data() as T | undefined;
  }

  createUserWithEmailAndPassword(email: string, password: string) {
    return createUserWithEmailAndPassword(this.auth, email, password);
  }

  signInWithEmailAndPassword(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  sendPasswordResetEmail(email: string) {
    return sendPasswordResetEmail(this.auth, email);
  }

  async updateProfile(displayName: string, photoURL: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('No user is authenticated.');
    await updateProfile(user, { displayName, photoURL });
  }
}
