import { defineComponent } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import {
  setFirebaseCloud,
  type FirebaseAuthUser,
  type FirebaseCloudController,
  type FirebaseSyncSummary,
} from '@/core/storage';
import { useCloudAutoSync } from './useCloudAutoSync';

const platformMocks = vi.hoisted(() => {
  let appStateCb: ((state: { isActive: boolean }) => void) | null = null;
  const removeMock = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  const addListenerMock = vi.fn(
    async (event: string, cb: (state: { isActive: boolean }) => void): Promise<{ remove: () => Promise<void> }> => {
      if (event === 'appStateChange') {
        appStateCb = cb;
      }
      return { remove: removeMock };
    },
  );
  const isNativePlatformMock = vi.fn(() => true);

  return {
    addListenerMock,
    removeMock,
    isNativePlatformMock,
    emitAppState: (isActive: boolean) => appStateCb?.({ isActive }),
    reset: () => {
      appStateCb = null;
      isNativePlatformMock.mockReturnValue(true);
    },
  };
});

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: platformMocks.addListenerMock,
  },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: platformMocks.isNativePlatformMock,
  },
}));

function createMockCloud() {
  let authListener: ((user: FirebaseAuthUser | null) => void) | null = null;
  let currentUser: FirebaseAuthUser | null = null;
  const unsubscribeAuthMock = vi.fn();
  const syncNowMock = vi.fn<() => Promise<FirebaseSyncSummary>>().mockResolvedValue({
    pulledCategories: 0,
    pulledTransactions: 0,
    pushedCategories: 0,
    pushedTransactions: 0,
  });

  const controller: FirebaseCloudController = {
    getCurrentUser: () => currentUser,
    subscribeAuthState: (listener) => {
      authListener = listener;
      listener(currentUser);
      return unsubscribeAuthMock;
    },
    signInWithGoogle: vi.fn().mockResolvedValue(null),
    signOut: vi.fn().mockResolvedValue(undefined),
    syncNow: syncNowMock,
    isSyncEnabled: () => currentUser !== null,
    resetCursors: vi.fn(),
  };

  return {
    controller,
    syncNowMock,
    unsubscribeAuthMock,
    emitAuth: (user: FirebaseAuthUser | null) => {
      currentUser = user;
      authListener?.(user);
    },
  };
}

function mountHost(onPulled: () => void | Promise<void>) {
  return mount(
    defineComponent({
      setup() {
        useCloudAutoSync(onPulled);
        return () => null;
      },
    }),
  );
}

describe('useCloudAutoSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    platformMocks.reset();
  });

  afterEach(() => {
    setFirebaseCloud(null);
    vi.restoreAllMocks();
  });

  it('syncs on auth restore, calls onPulled only when remote items arrive, and resets on sign-out', async () => {
    const cloud = createMockCloud();
    const onPulled = vi.fn().mockResolvedValue(undefined);
    cloud.syncNowMock.mockResolvedValueOnce({
      pulledCategories: 0,
      pulledTransactions: 1,
      pushedCategories: 0,
      pushedTransactions: 0,
    });
    setFirebaseCloud(cloud.controller);

    const wrapper = mountHost(onPulled);
    await flushPromises();
    expect(cloud.syncNowMock).not.toHaveBeenCalled();

    const user: FirebaseAuthUser = { uid: 'u1', email: 'a@example.com', displayName: 'User' };
    cloud.emitAuth(user);
    await flushPromises();
    expect(cloud.syncNowMock).toHaveBeenCalledTimes(1);
    expect(onPulled).toHaveBeenCalledTimes(1);

    // Duplicate auth emission for the same uid does not re-sync
    cloud.emitAuth(user);
    await flushPromises();
    expect(cloud.syncNowMock).toHaveBeenCalledTimes(1);

    // Sign out then sign in again triggers sync; 0 pulled items skips onPulled
    cloud.emitAuth(null);
    cloud.emitAuth(user);
    await flushPromises();
    expect(cloud.syncNowMock).toHaveBeenCalledTimes(2);
    expect(onPulled).toHaveBeenCalledTimes(1);

    wrapper.unmount();
    expect(cloud.unsubscribeAuthMock).toHaveBeenCalledTimes(1);
    expect(platformMocks.removeMock).toHaveBeenCalledTimes(1);
  });

  it('ignores signed-out triggers, coalesces concurrent triggers, recovers from sync throws, and cleans up', async () => {
    const cloud = createMockCloud();
    const onPulled = vi.fn().mockResolvedValue(undefined);
    setFirebaseCloud(cloud.controller);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');

    const wrapper = mountHost(onPulled);
    await flushPromises();

    // Signed-out triggers do not call syncNow
    platformMocks.emitAppState(true);
    window.dispatchEvent(new Event('online'));
    await flushPromises();
    expect(cloud.syncNowMock).not.toHaveBeenCalled();

    cloud.emitAuth({ uid: 'u1', email: 'a@example.com', displayName: 'User' });
    await flushPromises();
    expect(cloud.syncNowMock).toHaveBeenCalledTimes(1);

    // Native mode does not register visibilitychange alongside appStateChange
    document.dispatchEvent(new Event('visibilitychange'));
    await flushPromises();
    expect(cloud.syncNowMock).toHaveBeenCalledTimes(1);

    // Background transition is ignored
    platformMocks.emitAppState(false);
    await flushPromises();
    expect(cloud.syncNowMock).toHaveBeenCalledTimes(1);

    // Concurrent appStateChange + online coalesce into one syncNow call
    let resolveSync!: (summary: FirebaseSyncSummary) => void;
    cloud.syncNowMock.mockReturnValueOnce(
      new Promise<FirebaseSyncSummary>((resolve) => {
        resolveSync = resolve;
      }),
    );
    platformMocks.emitAppState(true);
    window.dispatchEvent(new Event('online'));
    expect(cloud.syncNowMock).toHaveBeenCalledTimes(2);
    resolveSync({ pulledCategories: 1, pulledTransactions: 0, pushedCategories: 0, pushedTransactions: 0 });
    await flushPromises();
    expect(onPulled).toHaveBeenCalledTimes(1);

    // Synchronous throw in syncNow must not wedge inFlight for subsequent triggers
    cloud.syncNowMock.mockImplementationOnce(() => {
      throw new Error('sync init failed');
    });
    window.dispatchEvent(new Event('online'));
    await flushPromises();
    expect(cloud.syncNowMock).toHaveBeenCalledTimes(3);

    // Offline async rejection is swallowed and subsequent trigger still runs
    cloud.syncNowMock.mockRejectedValueOnce(new Error('offline'));
    window.dispatchEvent(new Event('online'));
    await flushPromises();
    expect(cloud.syncNowMock).toHaveBeenCalledTimes(4);

    // Unmount removes online listener
    wrapper.unmount();
    window.dispatchEvent(new Event('online'));
    await flushPromises();
    expect(cloud.syncNowMock).toHaveBeenCalledTimes(4);
  });

  it('skips onPulled if unmounted mid-sync and removes pending Capacitor listener on fast unmount', async () => {
    const cloud = createMockCloud();
    const onPulled = vi.fn();
    setFirebaseCloud(cloud.controller);

    const pendingRemoveMock = vi.fn().mockRejectedValue(new Error('already removed'));
    let resolveListener!: (handle: { remove: () => Promise<void> }) => void;
    platformMocks.addListenerMock.mockReturnValueOnce(
      new Promise<{ remove: () => Promise<void> }>((resolve) => {
        resolveListener = resolve;
      }),
    );

    let resolveSync!: (summary: FirebaseSyncSummary) => void;
    cloud.syncNowMock.mockReturnValueOnce(
      new Promise<FirebaseSyncSummary>((resolve) => {
        resolveSync = resolve;
      }),
    );

    const wrapper = mountHost(onPulled);
    cloud.emitAuth({ uid: 'u1', email: 'a@example.com', displayName: 'User' });
    expect(cloud.syncNowMock).toHaveBeenCalledTimes(1);

    // Unmount while both syncNow and App.addListener are pending
    wrapper.unmount();
    resolveSync({ pulledCategories: 1, pulledTransactions: 2, pushedCategories: 0, pushedTransactions: 0 });
    resolveListener({ remove: pendingRemoveMock });
    await flushPromises();

    expect(onPulled).not.toHaveBeenCalled();
    expect(pendingRemoveMock).toHaveBeenCalledTimes(1);
  });

  it('uses visibilitychange on web only when visible and signed in, and removes listener on unmount', async () => {
    platformMocks.isNativePlatformMock.mockReturnValue(false);
    const cloud = createMockCloud();
    const onPulled = vi.fn();
    setFirebaseCloud(cloud.controller);
    const visibilitySpy = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');

    const wrapper = mountHost(onPulled);
    await flushPromises();
    expect(platformMocks.addListenerMock).not.toHaveBeenCalled();

    // Signed-out visibilitychange is ignored
    document.dispatchEvent(new Event('visibilitychange'));
    await flushPromises();
    expect(cloud.syncNowMock).not.toHaveBeenCalled();

    cloud.emitAuth({ uid: 'u1', email: 'a@example.com', displayName: 'User' });
    await flushPromises();
    expect(cloud.syncNowMock).toHaveBeenCalledTimes(1);

    // Hidden state does not trigger sync
    visibilitySpy.mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    await flushPromises();
    expect(cloud.syncNowMock).toHaveBeenCalledTimes(1);

    // Visible state triggers sync
    visibilitySpy.mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    await flushPromises();
    expect(cloud.syncNowMock).toHaveBeenCalledTimes(2);

    wrapper.unmount();
    document.dispatchEvent(new Event('visibilitychange'));
    await flushPromises();
    expect(cloud.syncNowMock).toHaveBeenCalledTimes(2);
  });
});
