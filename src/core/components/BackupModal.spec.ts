import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import {
  createLocalStorage,
  serializeBackupSnapshot,
  setFirebaseCloud,
  setStorage,
  type Category,
  type FirebaseAuthUser,
  type FirebaseCloudController,
  type FirebaseSyncSummary,
  type LocalBudgetStorage,
} from '@/core/storage';
import BackupModal from './BackupModal.vue';

const capacitorMocks = vi.hoisted(() => ({
  isNativePlatformMock: vi.fn(() => false),
  writeFileMock: vi.fn(),
  shareMock: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: capacitorMocks.isNativePlatformMock },
}));

vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Encoding: { UTF8: 'utf8' },
  Filesystem: { writeFile: capacitorMocks.writeFileMock },
}));

vi.mock('@capacitor/share', () => ({
  Share: { share: capacitorMocks.shareMock },
}));

const showSuccessToastMock = vi.fn();
const showErrorToastMock = vi.fn();

vi.mock('@/core/composables/useToast', () => ({
  useToast: () => ({
    showSuccessToast: showSuccessToastMock,
    showErrorToast: showErrorToastMock,
  }),
}));

const IonModalStub = {
  name: 'IonModal',
  props: ['isOpen', 'backdropDismiss'],
  emits: ['didDismiss'],
  template: '<div class="ion-modal-stub" :data-is-open="String(Boolean(isOpen))"><slot v-if="isOpen" /></div>',
};

const foodCategory: Category = { id: 'cat-food', title: 'Food', icon: 'food' };
const clothesCategory: Category = { id: 'cat-clothes', title: 'Clothes', icon: 'clothes' };

const originalCreateObjectUrlDesc = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
const originalRevokeObjectUrlDesc = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');

function restoreUrlObjectMethods(): void {
  if (originalCreateObjectUrlDesc) {
    Object.defineProperty(URL, 'createObjectURL', originalCreateObjectUrlDesc);
  } else {
    Reflect.deleteProperty(URL, 'createObjectURL');
  }

  if (originalRevokeObjectUrlDesc) {
    Object.defineProperty(URL, 'revokeObjectURL', originalRevokeObjectUrlDesc);
  } else {
    Reflect.deleteProperty(URL, 'revokeObjectURL');
  }
}

function createFakeCloudController(initialUser: FirebaseAuthUser | null = null) {
  let currentUser = initialUser;
  const listeners = new Set<(user: FirebaseAuthUser | null) => void>();

  const emitAuth = (nextUser: FirebaseAuthUser | null) => {
    currentUser = nextUser;
    for (const listener of listeners) {
      listener(currentUser);
    }
  };

  const controller: FirebaseCloudController = {
    getCurrentUser: () => currentUser,
    subscribeAuthState: vi.fn((listener: (user: FirebaseAuthUser | null) => void) => {
      listeners.add(listener);
      listener(currentUser);
      return () => {
        listeners.delete(listener);
      };
    }),
    signInWithGoogle: vi.fn(async () => {
      const signedIn: FirebaseAuthUser = {
        uid: 'u1',
        email: 'user@example.com',
        displayName: 'Andrei',
      };
      emitAuth(signedIn);
      return signedIn;
    }),
    signOut: vi.fn(async () => {
      emitAuth(null);
    }),
    syncNow: vi.fn(async (): Promise<FirebaseSyncSummary> => ({
      pulledCategories: 1,
      pulledTransactions: 2,
      pushedCategories: 0,
      pushedTransactions: 3,
    })),
    isSyncEnabled: () => currentUser !== null,
    resetCursors: vi.fn(),
  };

  return { controller, emitAuth };
}

describe('BackupModal.vue', () => {
  let localStorageAdapter: LocalBudgetStorage;
  let fakeCloud: ReturnType<typeof createFakeCloudController>;

  beforeEach(() => {
    window.localStorage.clear();
    setActivePinia(createPinia());
    vi.clearAllMocks();
    capacitorMocks.isNativePlatformMock.mockReturnValue(false);
    capacitorMocks.writeFileMock.mockResolvedValue({ uri: 'file:///cache/budget-backup.json' });
    capacitorMocks.shareMock.mockResolvedValue({});

    localStorageAdapter = createLocalStorage({
      storageKey: 'backup-modal-test',
      categories: [foodCategory],
    });
    setStorage(localStorageAdapter);

    fakeCloud = createFakeCloudController(null);
    setFirebaseCloud(fakeCloud.controller);
  });

  afterEach(() => {
    setFirebaseCloud(null);
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    restoreUrlObjectMethods();
  });

  it('renders Backup & Sync header and closes when Close chip is clicked', async () => {
    const wrapper = mount(BackupModal, {
      props: {
        modelValue: true,
      },
      global: {
        stubs: {
          IonModal: IonModalStub,
        },
      },
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Backup & Sync');

    const closeChip = wrapper.find('ion-chip');
    await closeChip.trigger('click');

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
  });

  it('exports JSON backup file, defers blob URL revocation, and shows success toast', async () => {
    vi.useFakeTimers();

    await localStorageAdapter.createTransaction({
      name: 'Morning Coffee',
      value: 250,
      categoryId: foodCategory.id,
    });

    const createObjectUrlMock = vi.fn(() => 'blob:backup-url');
    const revokeObjectUrlMock = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectUrlMock, configurable: true, writable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectUrlMock, configurable: true, writable: true });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const wrapper = mount(BackupModal, {
      props: { modelValue: true },
      global: { stubs: { IonModal: IonModalStub } },
    });
    await flushPromises();

    const exportButton = wrapper.find('[data-testid="export-backup-btn"]');
    await exportButton.trigger('click');
    await flushPromises();

    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:backup-url');
    expect(showSuccessToastMock).toHaveBeenCalledWith('Backup exported');
  });

  it('shows error toast when exporting backup fails', async () => {
    localStorageAdapter.getSnapshot = async () => {
      throw new Error('Disk read failed');
    };

    const wrapper = mount(BackupModal, {
      props: { modelValue: true },
      global: { stubs: { IonModal: IonModalStub } },
    });
    await flushPromises();

    await wrapper.find('[data-testid="export-backup-btn"]').trigger('click');
    await flushPromises();

    expect(showErrorToastMock).toHaveBeenCalledWith('Disk read failed');
    expect(showSuccessToastMock).not.toHaveBeenCalled();
  });

  it('exports JSON backup via Filesystem and Share on native platforms', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-20T10:00:00.000Z'));
    capacitorMocks.isNativePlatformMock.mockReturnValue(true);
    capacitorMocks.writeFileMock.mockResolvedValueOnce({ uri: 'file:///cache/budget-backup-2026-11-20.json' });

    await localStorageAdapter.createTransaction({
      name: 'Native Coffee',
      value: 300,
      categoryId: foodCategory.id,
    });

    const createObjectUrlMock = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectUrlMock, configurable: true, writable: true });

    const wrapper = mount(BackupModal, {
      props: { modelValue: true },
      global: { stubs: { IonModal: IonModalStub } },
    });
    await flushPromises();

    await wrapper.find('[data-testid="export-backup-btn"]').trigger('click');
    await flushPromises();

    expect(createObjectUrlMock).not.toHaveBeenCalled();
    expect(capacitorMocks.writeFileMock).toHaveBeenCalledWith({
      path: 'budget-backup-2026-11-20.json',
      data: expect.stringContaining('"Native Coffee"'),
      directory: 'CACHE',
      encoding: 'utf8',
    });
    expect(capacitorMocks.shareMock).toHaveBeenCalledWith({
      title: 'budget-backup-2026-11-20.json',
      files: ['file:///cache/budget-backup-2026-11-20.json'],
      dialogTitle: 'Export Backup',
    });
    expect(showSuccessToastMock).toHaveBeenCalledWith('Backup exported');
    expect(showErrorToastMock).not.toHaveBeenCalled();
  });

  it('suppresses toasts when native share sheet is canceled and shows error toast on real export failure', async () => {
    capacitorMocks.isNativePlatformMock.mockReturnValue(true);
    capacitorMocks.shareMock.mockRejectedValueOnce(new Error('Share canceled'));

    const wrapper = mount(BackupModal, {
      props: { modelValue: true },
      global: { stubs: { IonModal: IonModalStub } },
    });
    await flushPromises();

    await wrapper.find('[data-testid="export-backup-btn"]').trigger('click');
    await flushPromises();

    expect(showSuccessToastMock).not.toHaveBeenCalled();
    expect(showErrorToastMock).not.toHaveBeenCalled();

    capacitorMocks.writeFileMock.mockRejectedValueOnce(new Error('Cache directory unavailable'));
    await wrapper.find('[data-testid="export-backup-btn"]').trigger('click');
    await flushPromises();

    expect(showErrorToastMock).toHaveBeenCalledWith('Cache directory unavailable');
    expect(showSuccessToastMock).not.toHaveBeenCalled();
  });

  it('omits accept attribute on native file inputs and relaxes MIME filters on web', async () => {
    const webWrapper = mount(BackupModal, {
      props: { modelValue: true },
      global: { stubs: { IonModal: IonModalStub } },
    });
    await flushPromises();

    const webJsonAccept = webWrapper.find('[data-testid="backup-file-input"]').attributes('accept');
    expect(webJsonAccept).toContain('text/plain');
    expect(webJsonAccept).toContain('application/octet-stream');

    capacitorMocks.isNativePlatformMock.mockReturnValue(true);
    const nativeWrapper = mount(BackupModal, {
      props: { modelValue: true },
      global: { stubs: { IonModal: IonModalStub } },
    });
    await flushPromises();

    expect(nativeWrapper.find('[data-testid="backup-file-input"]').attributes('accept')).toBeUndefined();
  });

  it('rejects oversized import files before reading them', async () => {
    const wrapper = mount(BackupModal, {
      props: { modelValue: true },
      global: { stubs: { IonModal: IonModalStub } },
    });
    await flushPromises();

    const fileInput = wrapper.find('[data-testid="backup-file-input"]');
    const oversizedFile = new File(['{}'], 'huge.json', { type: 'application/json' });
    const textMock = vi.fn();
    Object.defineProperty(oversizedFile, 'text', { value: textMock, configurable: true });
    Object.defineProperty(oversizedFile, 'size', { value: 50 * 1024 * 1024 + 1, configurable: true });
    Object.defineProperty(fileInput.element, 'files', { value: [oversizedFile], configurable: true });

    await fileInput.trigger('change');
    await flushPromises();

    expect(textMock).not.toHaveBeenCalled();
    expect(showErrorToastMock).toHaveBeenCalledWith('File is too large to import (max 50 MB)');
    expect(showSuccessToastMock).not.toHaveBeenCalled();
  });

  it('imports valid JSON backup using file.text, awaits onRestored, and shows success toast', async () => {
    const onRestored = vi.fn().mockResolvedValue(undefined);
    const wrapper = mount(BackupModal, {
      props: { modelValue: true, onRestored },
      global: { stubs: { IonModal: IonModalStub } },
    });
    await flushPromises();

    const backupJson = serializeBackupSnapshot({
      version: 1,
      updatedAt: '2026-10-20T12:00:00.000Z',
      categories: [
        { ...foodCategory, updatedAt: '2026-10-01T00:00:00.000Z', deletedAt: null },
        { ...clothesCategory, updatedAt: '2026-10-01T00:00:00.000Z', deletedAt: null },
      ],
      transactions: [
        {
          id: 'tx-imported-1',
          name: 'Imported Jacket',
          value: 5000,
          createdAt: '2026-10-19T12:00:00.000Z',
          updatedAt: '2026-10-19T12:00:00.000Z',
          deletedAt: null,
          categoryId: clothesCategory.id,
        },
      ],
    });

    const fileInput = wrapper.find('[data-testid="backup-file-input"]');
    const file = new File([backupJson], 'backup.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', {
      value: vi.fn().mockResolvedValue(backupJson),
      configurable: true,
    });
    Object.defineProperty(fileInput.element, 'files', {
      value: [file],
      configurable: true,
    });

    await fileInput.trigger('change');
    await flushPromises();

    expect(onRestored).toHaveBeenCalledTimes(1);
    const snapshot = await localStorageAdapter.getSnapshot();
    expect(snapshot.categories).toHaveLength(2);
    expect(snapshot.transactions.map((t) => t.name)).toEqual(['Imported Jacket']);
    expect(showSuccessToastMock).toHaveBeenCalledWith('Imported 1 transactions');
  });

  it('falls back to FileReader when file.text is unavailable and handles both success and read error', async () => {
    const onRestored = vi.fn().mockResolvedValue(undefined);
    const wrapper = mount(BackupModal, {
      props: { modelValue: true, onRestored },
      global: { stubs: { IonModal: IonModalStub } },
    });
    await flushPromises();

    const backupJson = serializeBackupSnapshot({
      version: 1,
      updatedAt: '2026-10-20T12:00:00.000Z',
      categories: [{ ...foodCategory, updatedAt: '2026-10-01T00:00:00.000Z', deletedAt: null }],
      transactions: [
        {
          id: 'tx-filereader-1',
          name: 'FileReader Lunch',
          value: 600,
          createdAt: '2026-10-19T12:00:00.000Z',
          updatedAt: '2026-10-19T12:00:00.000Z',
          deletedAt: null,
          categoryId: foodCategory.id,
        },
      ],
    });

    const fileInput = wrapper.find('[data-testid="backup-file-input"]');
    const file = new File([backupJson], 'backup.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', { value: undefined, configurable: true });
    Object.defineProperty(fileInput.element, 'files', { value: [file], configurable: true });

    await fileInput.trigger('change');
    await vi.waitFor(() => {
      expect(showSuccessToastMock).toHaveBeenCalledWith('Imported 1 transactions');
    });
    expect(onRestored).toHaveBeenCalledTimes(1);

    // Simulate FileReader failure
    class FailingFileReader {
      result: string | ArrayBuffer | null = null;
      error: DOMException | null = new DOMException('Unreadable file');
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsText(): void {
        queueMicrotask(() => {
          this.onerror?.();
        });
      }
    }
    vi.stubGlobal('FileReader', FailingFileReader);

    const unreadableFile = new File(['{}'], 'broken-read.json', { type: 'application/json' });
    Object.defineProperty(unreadableFile, 'text', { value: undefined, configurable: true });
    Object.defineProperty(fileInput.element, 'files', { value: [unreadableFile], configurable: true });

    await fileInput.trigger('change');
    await flushPromises();

    expect(showErrorToastMock).toHaveBeenCalledWith('Unreadable file');
  });

  it('shows error toast when imported JSON file fails schema validation', async () => {
    const wrapper = mount(BackupModal, {
      props: { modelValue: true },
      global: { stubs: { IonModal: IonModalStub } },
    });
    await flushPromises();

    const fileInput = wrapper.find('[data-testid="backup-file-input"]');
    const invalidFile = new File(['{not valid json'], 'broken.json', { type: 'application/json' });
    Object.defineProperty(invalidFile, 'text', {
      value: vi.fn().mockResolvedValue('{not valid json'),
      configurable: true,
    });
    Object.defineProperty(fileInput.element, 'files', {
      value: [invalidFile],
      configurable: true,
    });

    await fileInput.trigger('change');
    await flushPromises();

    expect(showErrorToastMock).toHaveBeenCalledWith('Invalid backup JSON');
    expect(showSuccessToastMock).not.toHaveBeenCalled();
  });

  it('renders Sign in with Google button when signed out and calls signInWithGoogle on click', async () => {
    const wrapper = mount(BackupModal, {
      props: { modelValue: true },
      global: { stubs: { IonModal: IonModalStub } },
    });
    await flushPromises();

    const signInBtn = wrapper.find('[data-testid="google-signin-btn"]');
    expect(signInBtn.exists()).toBe(true);
    expect(wrapper.find('[data-testid="firebase-sync-btn"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="firebase-signout-btn"]').exists()).toBe(false);

    await signInBtn.trigger('click');
    await flushPromises();

    expect(fakeCloud.controller.signInWithGoogle).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('user@example.com');
    expect(wrapper.find('[data-testid="firebase-sync-btn"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="firebase-signout-btn"]').exists()).toBe(true);
  });

  it('displays signed-in email, Sync Now, and Sign out buttons when user is signed in', async () => {
    fakeCloud.emitAuth({
      uid: 'u1',
      email: 'user@example.com',
      displayName: 'Andrei',
    });

    const wrapper = mount(BackupModal, {
      props: { modelValue: true },
      global: { stubs: { IonModal: IonModalStub } },
    });
    await flushPromises();

    expect(wrapper.find('[data-testid="google-signin-btn"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('user@example.com');
    expect(wrapper.find('[data-testid="firebase-sync-btn"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="firebase-signout-btn"]').exists()).toBe(true);
  });

  it('calls syncNow, awaits onRestored, and shows success toast when clicking Sync Now', async () => {
    fakeCloud.emitAuth({
      uid: 'u1',
      email: 'user@example.com',
      displayName: 'Andrei',
    });
    const onRestored = vi.fn().mockResolvedValue(undefined);

    const wrapper = mount(BackupModal, {
      props: { modelValue: true, onRestored },
      global: { stubs: { IonModal: IonModalStub } },
    });
    await flushPromises();

    await wrapper.find('[data-testid="firebase-sync-btn"]').trigger('click');
    await flushPromises();

    expect(fakeCloud.controller.syncNow).toHaveBeenCalledTimes(1);
    expect(onRestored).toHaveBeenCalledTimes(1);
    expect(showSuccessToastMock).toHaveBeenCalledWith(expect.stringContaining('Sync complete'));
  });

  it('calls signOut, updates UI, and shows toast when clicking Sign out', async () => {
    fakeCloud.emitAuth({
      uid: 'u1',
      email: 'user@example.com',
      displayName: 'Andrei',
    });

    const wrapper = mount(BackupModal, {
      props: { modelValue: true },
      global: { stubs: { IonModal: IonModalStub } },
    });
    await flushPromises();

    await wrapper.find('[data-testid="firebase-signout-btn"]').trigger('click');
    await flushPromises();

    expect(fakeCloud.controller.signOut).toHaveBeenCalledTimes(1);
    expect(wrapper.find('[data-testid="google-signin-btn"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="firebase-sync-btn"]').exists()).toBe(false);
    expect(showSuccessToastMock).toHaveBeenCalledWith('Signed out');
  });

  it('shows error toast when Google Sign-In or Firebase sync fails', async () => {
    vi.mocked(fakeCloud.controller.signInWithGoogle).mockRejectedValueOnce(new Error('Popup closed'));

    const wrapper = mount(BackupModal, {
      props: { modelValue: true },
      global: { stubs: { IonModal: IonModalStub } },
    });
    await flushPromises();

    await wrapper.find('[data-testid="google-signin-btn"]').trigger('click');
    await flushPromises();

    expect(showErrorToastMock).toHaveBeenCalledWith('Popup closed');

    fakeCloud.emitAuth({
      uid: 'u1',
      email: 'user@example.com',
      displayName: 'Andrei',
    });
    await flushPromises();

    const onRestored = vi.fn().mockResolvedValue(undefined);
    await wrapper.setProps({ onRestored });
    vi.mocked(fakeCloud.controller.syncNow).mockRejectedValueOnce(new Error('Permission denied'));

    await wrapper.find('[data-testid="firebase-sync-btn"]').trigger('click');
    await flushPromises();

    expect(showErrorToastMock).toHaveBeenCalledWith('Permission denied');
    expect(onRestored).not.toHaveBeenCalled();
  });

  it('unsubscribes auth listener on unmount and ignores toast when Google Sign-In falls back to redirect', async () => {
    const unsubscribeMock = vi.fn();
    vi.mocked(fakeCloud.controller.subscribeAuthState).mockImplementationOnce((listener) => {
      listener(null);
      return unsubscribeMock;
    });
    vi.mocked(fakeCloud.controller.signInWithGoogle).mockResolvedValueOnce(null);

    const wrapper = mount(BackupModal, {
      props: { modelValue: true },
      global: { stubs: { IonModal: IonModalStub } },
    });
    await flushPromises();

    await wrapper.find('[data-testid="google-signin-btn"]').trigger('click');
    await flushPromises();

    expect(showSuccessToastMock).not.toHaveBeenCalled();
    expect(showErrorToastMock).not.toHaveBeenCalled();

    wrapper.unmount();
    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });

  it('disables modal buttons and close chip while sync is busy, and awaits onRestored before showing toast', async () => {
    fakeCloud.emitAuth({
      uid: 'u1',
      email: 'user@example.com',
      displayName: 'Andrei',
    });

    const events: string[] = [];
    let releaseSync!: () => void;
    vi.mocked(fakeCloud.controller.syncNow).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseSync = () => {
            events.push('syncNow');
            resolve({
              pulledCategories: 0,
              pulledTransactions: 1,
              pushedCategories: 0,
              pushedTransactions: 1,
            });
          };
        }),
    );

    let releaseRestored!: () => void;
    const onRestored = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          releaseRestored = () => {
            events.push('onRestored');
            resolve();
          };
        }),
    );
    showSuccessToastMock.mockImplementationOnce(async () => {
      events.push('toast');
    });

    const wrapper = mount(BackupModal, {
      props: { modelValue: true, onRestored },
      global: { stubs: { IonModal: IonModalStub } },
    });
    await flushPromises();

    const syncTrigger = wrapper.find('[data-testid="firebase-sync-btn"]').trigger('click');
    await flushPromises();

    const busyButtons = wrapper.findAllComponents({ name: 'IonButton' });
    expect(busyButtons).toHaveLength(4);
    expect(busyButtons.every((btn) => btn.props('disabled') === true)).toBe(true);
    expect(wrapper.findComponent({ name: 'IonChip' }).props('disabled')).toBe(true);

    releaseSync();
    await flushPromises();
    expect(showSuccessToastMock).not.toHaveBeenCalled();

    releaseRestored();
    await syncTrigger;
    await flushPromises();

    expect(events).toEqual(['syncNow', 'onRestored', 'toast']);
    const idleButtons = wrapper.findAllComponents({ name: 'IonButton' });
    expect(idleButtons.every((btn) => btn.props('disabled') === false)).toBe(true);
    expect(wrapper.findComponent({ name: 'IonChip' }).props('disabled')).toBe(false);

    // Error during onRestored triggers error toast instead of success toast
    vi.mocked(fakeCloud.controller.syncNow).mockResolvedValueOnce({
      pulledCategories: 0,
      pulledTransactions: 0,
      pushedCategories: 0,
      pushedTransactions: 0,
    });
    onRestored.mockRejectedValueOnce(new Error('Store refresh failed'));
    await wrapper.find('[data-testid="firebase-sync-btn"]').trigger('click');
    await flushPromises();

    expect(showErrorToastMock).toHaveBeenCalledWith('Store refresh failed');
    expect(showSuccessToastMock).toHaveBeenCalledTimes(1);
  });
});
