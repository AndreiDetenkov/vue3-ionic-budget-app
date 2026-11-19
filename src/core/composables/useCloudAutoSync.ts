import { onMounted, onUnmounted } from 'vue';
import { App } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { useFirebaseCloud } from '@/core/storage';

export function useCloudAutoSync(onPulled: () => void | Promise<void>): void {
  const cloud = useFirebaseCloud();

  let unmounted = false;
  let inFlight: Promise<void> | null = null;
  let lastSyncedUid: string | null = null;
  let unsubscribeAuth: (() => void) | null = null;
  let appStateHandle: PluginListenerHandle | null = null;

  function syncAndRefresh(): Promise<void> {
    if (inFlight) {
      return inFlight;
    }
    if (unmounted || !cloud.isSyncEnabled()) {
      return Promise.resolve();
    }

    inFlight = (async () => {
      try {
        const summary = await cloud.syncNow();
        if (unmounted) {
          return;
        }
        if (summary.pulledCategories > 0 || summary.pulledTransactions > 0) {
          await onPulled();
        }
      } catch {
        // Offline or transient auth errors must not disrupt local-first usage.
      } finally {
        inFlight = null;
      }
    })();

    return inFlight;
  }

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      void syncAndRefresh();
    }
  };

  const handleOnline = () => {
    void syncAndRefresh();
  };

  onMounted(() => {
    unsubscribeAuth = cloud.subscribeAuthState((user) => {
      if (!user) {
        lastSyncedUid = null;
        return;
      }
      if (user.uid !== lastSyncedUid) {
        lastSyncedUid = user.uid;
        void syncAndRefresh();
      }
    });

    if (Capacitor.isNativePlatform()) {
      void App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          void syncAndRefresh();
        }
      })
        .then((handle) => {
          if (unmounted) {
            void handle.remove();
          } else {
            appStateHandle = handle;
          }
        })
        .catch(() => {
          // Ignore in environments where Capacitor App plugin is unavailable.
        });
    } else {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    window.addEventListener('online', handleOnline);
  });

  onUnmounted(() => {
    unmounted = true;
    unsubscribeAuth?.();
    unsubscribeAuth = null;
    if (appStateHandle) {
      void appStateHandle.remove();
      appStateHandle = null;
    }
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('online', handleOnline);
  });
}
