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
  const removeMock = vi.fn().mockResolvedValue(undefined);
  const addListenerMock = vi.fn(async (event: string, cb: (state: { isActive: boolean }) => void) => {
    if (event === 'appStateChange') {
      appStateCb = cb;
    }
    return { remove: removeMock };
  });
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

  it('coalesces concurrent triggers, handles native appStateChange/online, and cleans up listeners', async () => {
    const cloud = createMockCloud();
    const onPulled = vi.fn().mockResolvedValue(undefined);
    setFirebaseCloud(cloud.controller);

    const wrapper = mountHost(onPulled);
    await flushPromises();

    cloud.emitAuth({ uid: 'u1', email: 'a@example.com', displayName: 'User' });
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

    // Offline errors are swallowed
    cloud.syncNowMock.mockRejectedValueOnce(new Error('offline'));
    window.dispatchEvent(new Event('online'));
    await flushPromises();
    expect(cloud.syncNowMock).toHaveBeenCalledTimes(3);

    // Unmount removes online listener
    wrapper.unmount();
    window.dispatchEvent(new Event('online'));
    await flushPromises();
    expect(cloud.syncNowMock).toHaveBeenCalledTimes(3);
  });

  it('uses visibilitychange instead of Capacitor App listener on web and removes it on unmount', async () => {
    platformMocks.isNativePlatformMock.mockReturnValue(false);
    const cloud = createMockCloud();
    const onPulled = vi.fn();
    setFirebaseCloud(cloud.controller);

    const wrapper = mountHost(onPulled);
    await flushPromises();
    expect(platformMocks.addListenerMock).not.toHaveBeenCalled();

    cloud.emitAuth({ uid: 'u1', email: 'a@example.com', displayName: 'User' });
    await flushPromises();
    expect(cloud.syncNowMock).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await flushPromises();
    expect(cloud.syncNowMock).toHaveBeenCalledTimes(2);

    wrapper.unmount();
    document.dispatchEvent(new Event('visibilitychange'));
    await flushPromises();
    expect(cloud.syncNowMock).toHaveBeenCalledTimes(2);
  });
});
