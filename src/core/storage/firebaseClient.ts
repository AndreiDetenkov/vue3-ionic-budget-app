import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  query,
  where,
  writeBatch,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore';
import {
  createFirebaseSyncService,
  type FirebaseRemoteAdapter,
  type FirebaseSyncService,
  type FirebaseSyncSummary,
} from './firebaseSync';
import type { LocalBudgetStorage, StoredCategory, StoredTransaction } from './types';

const CATEGORIES_COLLECTION = 'categories';
const TRANSACTIONS_COLLECTION = 'transactions';
const REDIRECT_FALLBACK_ERROR_CODES = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
]);

const DEFAULT_FIREBASE_CONFIG: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export interface FirebaseCloudControllerOptions {
  allowedEmails?: readonly string[];
}

export function parseAllowedEmails(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

export interface FirebaseAuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface FirebaseCloudController {
  getCurrentUser(): FirebaseAuthUser | null;
  subscribeAuthState(listener: (user: FirebaseAuthUser | null) => void): () => void;
  signInWithGoogle(): Promise<FirebaseAuthUser | null>;
  signOut(): Promise<void>;
  syncNow(): Promise<FirebaseSyncSummary>;
  isSyncEnabled(): boolean;
  resetCursors(): void;
  isSyncInFlight?(): boolean;
}

type FirestoreCategoryDoc = {
  id: string;
  title: string;
  icon: string | null;
  updatedAt: string;
  deletedAt: string | null;
};

type FirestoreTransactionDoc = {
  id: string;
  name: string;
  value: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  categoryId: string;
};

let cachedApp: FirebaseApp | null = null;
let cachedDb: Firestore | null = null;
let cachedAuth: Auth | null = null;

/**
 * Returns the lazily initialized Firebase App instance for this project.
 */
export function getApp(): FirebaseApp {
  if (!cachedApp) {
    const existing = getApps();
    cachedApp = existing.length > 0 ? existing[0] : initializeApp(DEFAULT_FIREBASE_CONFIG);
  }
  return cachedApp;
}

/**
 * Returns the lazily initialized Cloud Firestore instance.
 */
export function getDb(): Firestore {
  if (!cachedDb) {
    cachedDb = getFirestore(getApp());
  }
  return cachedDb;
}

/**
 * Returns the lazily initialized Firebase Auth instance with local persistence requested.
 */
export function getFirebaseAuth(): Auth {
  if (!cachedAuth) {
    cachedAuth = getAuth(getApp());
    void setPersistence(cachedAuth, browserLocalPersistence).catch(() => {
      // Headless or restricted environments may not support IndexedDB persistence.
    });
  }
  return cachedAuth;
}

function mapFirebaseUser(user: User | null): FirebaseAuthUser | null {
  if (!user) {
    return null;
  }
  return {
    uid: user.uid,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
  };
}

function toFirestoreCategory(category: StoredCategory): FirestoreCategoryDoc {
  return {
    id: category.id,
    title: category.title,
    icon: category.icon && category.icon.length > 0 ? category.icon : null,
    updatedAt: category.updatedAt,
    deletedAt: category.deletedAt && category.deletedAt.length > 0 ? category.deletedAt : null,
  };
}

function toStoredCategory(data: DocumentData, docId: string): StoredCategory {
  return {
    id: typeof data.id === 'string' && data.id.length > 0 ? data.id : docId,
    title: typeof data.title === 'string' ? data.title : '',
    icon: typeof data.icon === 'string' && data.icon.length > 0 ? data.icon : null,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date(0).toISOString(),
    deletedAt: typeof data.deletedAt === 'string' && data.deletedAt.length > 0 ? data.deletedAt : null,
  };
}

function toFirestoreTransaction(tx: StoredTransaction): FirestoreTransactionDoc {
  return {
    id: tx.id,
    name: tx.name,
    value: tx.value,
    createdAt: tx.createdAt,
    updatedAt: tx.updatedAt,
    deletedAt: tx.deletedAt && tx.deletedAt.length > 0 ? tx.deletedAt : null,
    categoryId: tx.categoryId,
  };
}

function toStoredTransaction(data: DocumentData, docId: string): StoredTransaction {
  return {
    id: typeof data.id === 'string' && data.id.length > 0 ? data.id : docId,
    name: typeof data.name === 'string' ? data.name : '',
    value: typeof data.value === 'number' && Number.isFinite(data.value) ? data.value : 0,
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : new Date(0).toISOString(),
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date(0).toISOString(),
    deletedAt: typeof data.deletedAt === 'string' && data.deletedAt.length > 0 ? data.deletedAt : null,
    categoryId: typeof data.categoryId === 'string' ? data.categoryId : '',
  };
}

/**
 * Creates a Firestore-backed remote adapter using strict document schemas matching firestore.rules.
 */
export function createFirestoreRemoteAdapter(db: Firestore): FirebaseRemoteAdapter {
  return {
    async fetchCategoriesSince(sinceIso: string | null): Promise<StoredCategory[]> {
      const ref = collection(db, CATEGORIES_COLLECTION);
      const q = sinceIso ? query(ref, where('updatedAt', '>', sinceIso)) : ref;
      const snapshot = await getDocs(q);
      return snapshot.docs.map((item) => toStoredCategory(item.data(), item.id));
    },

    async fetchTransactionsSince(sinceIso: string | null): Promise<StoredTransaction[]> {
      const ref = collection(db, TRANSACTIONS_COLLECTION);
      const q = sinceIso ? query(ref, where('updatedAt', '>', sinceIso)) : ref;
      const snapshot = await getDocs(q);
      return snapshot.docs.map((item) => toStoredTransaction(item.data(), item.id));
    },

    async upsertBatch(categories: StoredCategory[], transactions: StoredTransaction[]): Promise<void> {
      if (categories.length === 0 && transactions.length === 0) {
        return;
      }

      const batch = writeBatch(db);
      for (const category of categories) {
        batch.set(doc(db, CATEGORIES_COLLECTION, category.id), toFirestoreCategory(category));
      }
      for (const tx of transactions) {
        batch.set(doc(db, TRANSACTIONS_COLLECTION, tx.id), toFirestoreTransaction(tx));
      }
      await batch.commit();
    },
  };
}

function getFirebaseErrorCode(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    return String((err as { code?: unknown }).code ?? '');
  }
  return '';
}

function sameUser(a: FirebaseAuthUser | null, b: FirebaseAuthUser | null): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return a.uid === b.uid && a.email === b.email && a.displayName === b.displayName;
}

function isAllowedFamilyUser(user: User | null, allowedEmails: readonly string[]): boolean {
  if (!user || user.emailVerified === false) {
    return false;
  }
  if (allowedEmails.length === 0) {
    return true;
  }
  return Boolean(user.email && allowedEmails.includes(user.email.toLowerCase()));
}

async function signOutAll(auth: Auth): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } finally {
    if (Capacitor.isNativePlatform()) {
      await FirebaseAuthentication.signOut().catch(() => {
        // Best-effort native credential state reset so next sign-in prompts account chooser
      });
    }
  }
}

/**
 * Creates the cloud auth + incremental delta-sync controller bound to the given local storage.
 */
export function createFirebaseCloudController(
  local: LocalBudgetStorage,
  controllerOptions: FirebaseCloudControllerOptions = {},
): FirebaseCloudController {
  const allowedEmails = (
    controllerOptions.allowedEmails ?? parseAllowedEmails(import.meta.env.VITE_FIREBASE_ALLOWED_EMAILS)
  )
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);

  let currentUser: FirebaseAuthUser | null = null;
  let authUnsubscribe: (() => void) | null = null;
  let syncService: FirebaseSyncService | null = null;
  const listeners = new Set<(user: FirebaseAuthUser | null) => void>();

  function updateCurrentUser(nextUser: FirebaseAuthUser | null): void {
    if (sameUser(currentUser, nextUser)) {
      return;
    }
    currentUser = nextUser;
    for (const listener of listeners) {
      listener(currentUser);
    }
  }

  function ensureAuthSubscription(): Auth {
    const auth = getFirebaseAuth();
    if (!authUnsubscribe) {
      authUnsubscribe = onAuthStateChanged(auth, (fbUser) => {
        if (fbUser && !isAllowedFamilyUser(fbUser, allowedEmails)) {
          void signOutAll(auth).catch(() => {
            // Best-effort sign-out of non-allowlisted Google account
          });
          updateCurrentUser(null);
          return;
        }
        updateCurrentUser(mapFirebaseUser(fbUser));
      });
    }
    return auth;
  }

  function ensureSyncService(): FirebaseSyncService {
    if (!syncService) {
      syncService = createFirebaseSyncService({
        local,
        remote: createFirestoreRemoteAdapter(getDb()),
      });
    }
    return syncService;
  }

  return {
    getCurrentUser(): FirebaseAuthUser | null {
      return currentUser;
    },

    subscribeAuthState(listener: (user: FirebaseAuthUser | null) => void): () => void {
      listeners.add(listener);
      try {
        ensureAuthSubscription();
      } catch {
        // Headless/jsdom test environments without Web Auth support remain signed out.
      }
      listener(currentUser);
      return () => {
        listeners.delete(listener);
      };
    },

    async signInWithGoogle(): Promise<FirebaseAuthUser | null> {
      const auth = ensureAuthSubscription();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      try {
        // Popup/redirect cannot return into the Capacitor WebView, so use native Google Sign-In there.
        const credential = Capacitor.isNativePlatform()
          ? await signInWithCredential(
              auth,
              GoogleAuthProvider.credential((await FirebaseAuthentication.signInWithGoogle()).credential?.idToken),
            )
          : await signInWithPopup(auth, provider);
        if (!isAllowedFamilyUser(credential.user, allowedEmails)) {
          await signOutAll(auth);
          updateCurrentUser(null);
          throw new Error('Access denied: this Google account is not in the family allowlist.');
        }
        const mapped = mapFirebaseUser(credential.user);
        updateCurrentUser(mapped);
        return mapped;
      } catch (err) {
        if (!Capacitor.isNativePlatform() && REDIRECT_FALLBACK_ERROR_CODES.has(getFirebaseErrorCode(err))) {
          await signInWithRedirect(auth, provider);
          return null;
        }
        throw err;
      }
    },

    async signOut(): Promise<void> {
      const auth = ensureAuthSubscription();
      await signOutAll(auth);
      updateCurrentUser(null);
    },

    async syncNow(): Promise<FirebaseSyncSummary> {
      if (!currentUser) {
        throw new Error('Sign in with Google before syncing with Firebase.');
      }
      return ensureSyncService().syncNow();
    },

    isSyncEnabled(): boolean {
      return currentUser !== null;
    },

    resetCursors(): void {
      ensureSyncService().resetCursors();
    },

    isSyncInFlight(): boolean {
      return syncService?.isSyncInFlight() ?? false;
    },
  };
}
