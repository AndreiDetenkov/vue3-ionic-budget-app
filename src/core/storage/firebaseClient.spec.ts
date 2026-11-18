import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Firestore } from 'firebase/firestore';
import { createLocalStorage, DEFAULT_CATEGORIES, type StoredCategory, type StoredTransaction } from '@/core/storage';

const mocks = vi.hoisted(() => {
  const appInstance = { name: '[DEFAULT]' };
  const dbInstance = { type: 'firestore' };
  const authInstance = { name: 'auth' };
  const batchSetMock = vi.fn();
  const batchCommitMock = vi.fn().mockResolvedValue(undefined);
  const collectionRefMock = vi.fn((_db: unknown, name: string) => ({ kind: 'collection', name }));
  const docRefMock = vi.fn((_db: unknown, name: string, id: string) => ({ kind: 'doc', name, id }));
  const whereMock = vi.fn((field: string, op: string, value: string) => ({ kind: 'where', field, op, value }));
  const queryMock = vi.fn((ref: unknown, constraint: unknown) => ({ kind: 'query', ref, constraint }));
  const getDocsMock = vi.fn().mockResolvedValue({ docs: [] });
  const writeBatchMock = vi.fn(() => ({
    set: batchSetMock,
    commit: batchCommitMock,
  }));

  let authStateHandler: ((user: unknown) => void) | null = null;
  const setCustomParametersMock = vi.fn();
  class GoogleAuthProviderMock {
    setCustomParameters = setCustomParametersMock;
  }

  return {
    appInstance,
    dbInstance,
    authInstance,
    getAppsMock: vi.fn((): { name: string }[] => []),
    initializeAppMock: vi.fn(() => appInstance),
    getFirestoreMock: vi.fn(() => dbInstance),
    getAuthMock: vi.fn(() => authInstance),
    setPersistenceMock: vi.fn().mockResolvedValue(undefined),
    browserLocalPersistenceMock: { type: 'LOCAL' },
    GoogleAuthProviderMock,
    setCustomParametersMock,
    onAuthStateChangedMock: vi.fn((_auth: unknown, cb: (user: unknown) => void) => {
      authStateHandler = cb;
      return vi.fn();
    }),
    emitAuthChange: (user: unknown) => authStateHandler?.(user),
    signInWithPopupMock: vi.fn(),
    signInWithRedirectMock: vi.fn().mockResolvedValue(undefined),
    signOutMock: vi.fn().mockResolvedValue(undefined),
    collectionRefMock,
    docRefMock,
    whereMock,
    queryMock,
    getDocsMock,
    writeBatchMock,
    batchSetMock,
    batchCommitMock,
  };
});

vi.mock('firebase/app', () => ({
  getApps: mocks.getAppsMock,
  initializeApp: mocks.initializeAppMock,
}));

vi.mock('firebase/auth', () => ({
  browserLocalPersistence: mocks.browserLocalPersistenceMock,
  getAuth: mocks.getAuthMock,
  GoogleAuthProvider: mocks.GoogleAuthProviderMock,
  onAuthStateChanged: mocks.onAuthStateChangedMock,
  setPersistence: mocks.setPersistenceMock,
  signInWithPopup: mocks.signInWithPopupMock,
  signInWithRedirect: mocks.signInWithRedirectMock,
  signOut: mocks.signOutMock,
}));

vi.mock('firebase/firestore', () => ({
  collection: mocks.collectionRefMock,
  doc: mocks.docRefMock,
  getDocs: mocks.getDocsMock,
  getFirestore: mocks.getFirestoreMock,
  query: mocks.queryMock,
  where: mocks.whereMock,
  writeBatch: mocks.writeBatchMock,
}));

import { ALLOWED_FAMILY_EMAILS, createFirebaseCloudController, createFirestoreRemoteAdapter } from './firebaseClient';

describe('firebaseClient', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    mocks.getAppsMock.mockReturnValue([mocks.appInstance]);
    mocks.getDocsMock.mockResolvedValue({ docs: [] });
    mocks.batchCommitMock.mockResolvedValue(undefined);
    mocks.signInWithRedirectMock.mockResolvedValue(undefined);
    mocks.signOutMock.mockResolvedValue(undefined);
  });

  describe('createFirestoreRemoteAdapter', () => {
    const db = mocks.dbInstance as unknown as Firestore;

    it('fetches full collections when sinceIso is null and normalizes icon/deletedAt to null', async () => {
      mocks.getDocsMock
        .mockResolvedValueOnce({
          docs: [
            {
              id: 'cat-1',
              data: () => ({
                id: 'cat-1',
                title: 'Food',
                icon: '',
                updatedAt: '2026-11-18T10:00:00.000Z',
                deletedAt: null,
              }),
            },
          ],
        })
        .mockResolvedValueOnce({
          docs: [
            {
              id: 'tx-1',
              data: () => ({
                id: 'tx-1',
                name: 'Lunch',
                value: 350,
                createdAt: '2026-11-18T09:00:00.000Z',
                updatedAt: '2026-11-18T10:00:00.000Z',
                deletedAt: '',
                categoryId: 'cat-1',
              }),
            },
          ],
        });

      const adapter = createFirestoreRemoteAdapter(db);
      const cats = await adapter.fetchCategoriesSince(null);
      const txs = await adapter.fetchTransactionsSince(null);

      expect(mocks.queryMock).not.toHaveBeenCalled();
      expect(mocks.whereMock).not.toHaveBeenCalled();
      expect(cats).toEqual([
        {
          id: 'cat-1',
          title: 'Food',
          icon: null,
          updatedAt: '2026-11-18T10:00:00.000Z',
          deletedAt: null,
        },
      ]);
      expect(txs).toEqual([
        {
          id: 'tx-1',
          name: 'Lunch',
          value: 350,
          createdAt: '2026-11-18T09:00:00.000Z',
          updatedAt: '2026-11-18T10:00:00.000Z',
          deletedAt: null,
          categoryId: 'cat-1',
        },
      ]);
    });

    it('queries with where(updatedAt, >, sinceIso) when cursor is provided', async () => {
      const adapter = createFirestoreRemoteAdapter(db);
      const cursor = '2026-11-18T10:00:00.000Z';

      await adapter.fetchCategoriesSince(cursor);
      await adapter.fetchTransactionsSince(cursor);

      expect(mocks.whereMock).toHaveBeenNthCalledWith(1, 'updatedAt', '>', cursor);
      expect(mocks.whereMock).toHaveBeenNthCalledWith(2, 'updatedAt', '>', cursor);
      expect(mocks.queryMock).toHaveBeenCalledTimes(2);
    });

    it('treats empty upsertBatch as a no-op and serializes exact Firestore schema keys otherwise', async () => {
      const adapter = createFirestoreRemoteAdapter(db);

      await adapter.upsertBatch([], []);
      expect(mocks.writeBatchMock).not.toHaveBeenCalled();

      const cat: StoredCategory = {
        id: 'cat-food',
        title: 'Food',
        icon: '',
        updatedAt: '2026-11-18T10:00:00.000Z',
        deletedAt: null,
      };
      const tx: StoredTransaction = {
        id: 'tx-1',
        name: 'Coffee',
        value: 200,
        createdAt: '2026-11-18T10:00:00.000Z',
        updatedAt: '2026-11-18T10:00:00.000Z',
        deletedAt: null,
        categoryId: 'cat-food',
      };

      await adapter.upsertBatch([cat], [tx]);

      expect(mocks.writeBatchMock).toHaveBeenCalledTimes(1);
      expect(mocks.batchSetMock).toHaveBeenCalledTimes(2);

      const [, serializedCat] = mocks.batchSetMock.mock.calls[0];
      expect(Object.keys(serializedCat).sort()).toEqual(['deletedAt', 'icon', 'id', 'title', 'updatedAt']);
      expect(serializedCat).toEqual({
        id: 'cat-food',
        title: 'Food',
        icon: null,
        updatedAt: '2026-11-18T10:00:00.000Z',
        deletedAt: null,
      });

      const [, serializedTx] = mocks.batchSetMock.mock.calls[1];
      expect(Object.keys(serializedTx).sort()).toEqual([
        'categoryId',
        'createdAt',
        'deletedAt',
        'id',
        'name',
        'updatedAt',
        'value',
      ]);
      expect(serializedTx).toEqual({
        id: 'tx-1',
        name: 'Coffee',
        value: 200,
        createdAt: '2026-11-18T10:00:00.000Z',
        updatedAt: '2026-11-18T10:00:00.000Z',
        deletedAt: null,
        categoryId: 'cat-food',
      });
      expect(mocks.batchCommitMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('createFirebaseCloudController', () => {
    it('subscribes, deduplicates identical auth users, and cleans up on unsubscribe', () => {
      const local = createLocalStorage({ storageKey: 'firebase-client-auth-sub-test' });
      const controller = createFirebaseCloudController(local);
      const listener = vi.fn();

      const unsubscribe = controller.subscribeAuthState(listener);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenLastCalledWith(null);

      const allowlisted = {
        uid: 'u1',
        email: ALLOWED_FAMILY_EMAILS[0],
        emailVerified: true,
        displayName: 'Andrei',
      };
      mocks.emitAuthChange(allowlisted);
      mocks.emitAuthChange({ ...allowlisted });

      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenLastCalledWith({
        uid: 'u1',
        email: ALLOWED_FAMILY_EMAILS[0],
        displayName: 'Andrei',
      });
      expect(controller.isSyncEnabled()).toBe(true);

      unsubscribe();
      mocks.emitAuthChange(null);
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('allows allowlisted email sign-in, signs out non-allowlisted emails, and handles redirect/error cases', async () => {
      const local = createLocalStorage({ storageKey: 'firebase-client-signin-test' });
      const controller = createFirebaseCloudController(local);

      mocks.signInWithPopupMock.mockResolvedValueOnce({
        user: {
          uid: 'u1',
          email: ALLOWED_FAMILY_EMAILS[0],
          emailVerified: true,
          displayName: 'Andrei',
        },
      });

      const user = await controller.signInWithGoogle();
      expect(user).toEqual({
        uid: 'u1',
        email: ALLOWED_FAMILY_EMAILS[0],
        displayName: 'Andrei',
      });
      expect(controller.getCurrentUser()).toEqual(user);

      // Non-allowlisted email gets signed out immediately with clear error
      mocks.signInWithPopupMock.mockResolvedValueOnce({
        user: {
          uid: 'u-stranger',
          email: 'stranger@gmail.com',
          emailVerified: true,
          displayName: 'Stranger',
        },
      });
      await expect(controller.signInWithGoogle()).rejects.toThrow(
        'Access denied: this Google account is not in the family allowlist.',
      );
      expect(mocks.signOutMock).toHaveBeenCalled();
      expect(controller.getCurrentUser()).toBeNull();

      // Popup blocked -> falls back to signInWithRedirect and returns null
      mocks.signInWithPopupMock.mockRejectedValueOnce({ code: 'auth/popup-blocked' });
      await expect(controller.signInWithGoogle()).resolves.toBeNull();
      expect(mocks.signInWithRedirectMock).toHaveBeenCalledTimes(1);

      // Environment not supported -> falls back to signInWithRedirect
      mocks.signInWithPopupMock.mockRejectedValueOnce({ code: 'auth/operation-not-supported-in-this-environment' });
      await expect(controller.signInWithGoogle()).resolves.toBeNull();
      expect(mocks.signInWithRedirectMock).toHaveBeenCalledTimes(2);

      // Non-fallback error rethrows
      mocks.signInWithPopupMock.mockRejectedValueOnce(new Error('auth/popup-closed-by-user'));
      await expect(controller.signInWithGoogle()).rejects.toThrow('auth/popup-closed-by-user');
    });

    it('rejects syncNow when signed out, syncs when signed in, and clears user on signOut', async () => {
      const local = createLocalStorage({
        storageKey: 'firebase-client-sync-test',
        categories: [...DEFAULT_CATEGORIES],
      });
      const controller = createFirebaseCloudController(local);

      await expect(controller.syncNow()).rejects.toThrow('Sign in with Google before syncing with Firebase.');

      mocks.signInWithPopupMock.mockResolvedValueOnce({
        user: {
          uid: 'u2',
          email: ALLOWED_FAMILY_EMAILS[1],
          emailVerified: true,
          displayName: 'Anastasia',
        },
      });
      await controller.signInWithGoogle();

      const summary = await controller.syncNow();
      expect(summary.pushedCategories).toBe(DEFAULT_CATEGORIES.length);
      expect(mocks.batchCommitMock).toHaveBeenCalled();

      await controller.signOut();
      expect(controller.getCurrentUser()).toBeNull();
      expect(controller.isSyncEnabled()).toBe(false);
    });
  });
});
