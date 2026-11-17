import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import {
  createLocalStorage,
  serializeBackupSnapshot,
  setStorage,
  type Category,
  type LocalBudgetStorage,
} from '@/core/storage';
import BackupModal from './BackupModal.vue';

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

describe('BackupModal.vue', () => {
  let localStorageAdapter: LocalBudgetStorage;

  beforeEach(() => {
    window.localStorage.clear();
    setActivePinia(createPinia());
    vi.clearAllMocks();

    localStorageAdapter = createLocalStorage({
      storageKey: 'backup-modal-test',
      categories: [foodCategory],
    });
    setStorage(localStorageAdapter);
  });

  afterEach(() => {
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

  it('imports transactions CSV file, awaits onRestored, and handles invalid CSV errors', async () => {
    const defaultStorage = createLocalStorage({ storageKey: 'backup-modal-csv-test' });
    setStorage(defaultStorage);

    const onRestored = vi.fn().mockResolvedValue(undefined);
    const wrapper = mount(BackupModal, {
      props: {
        modelValue: true,
        onRestored,
      },
      global: { stubs: { IonModal: IonModalStub } },
    });
    await flushPromises();

    const csvContent = [
      'id,created_at,name,value,category_id',
      '0011b1aa-9c5e-479f-b9aa-39711036c177,2025-06-21 20:59:14.881024+06,Dentist,1600,5cb289ab-2f7b-43bf-be3e-a4b577688333',
      '0028ee73-64e9-4326-87f4-3989fc6e48d0,2023-08-28 21:22:59.872722+06,Taxi,320,2fe6596b-6292-4d8c-826d-5f4d3d99f543',
    ].join('\n');

    const csvInput = wrapper.find('[data-testid="csv-file-input"]');
    const csvFile = new File([csvContent], 'transactions.csv', { type: 'text/csv' });
    Object.defineProperty(csvFile, 'text', {
      value: vi.fn().mockResolvedValue(csvContent),
      configurable: true,
    });
    Object.defineProperty(csvInput.element, 'files', {
      value: [csvFile],
      configurable: true,
    });

    await csvInput.trigger('change');
    await flushPromises();

    expect(onRestored).toHaveBeenCalledTimes(1);
    const snapshot = await defaultStorage.getSnapshot();
    expect(snapshot.transactions).toHaveLength(2);
    expect(snapshot.transactions.map((t) => t.name)).toEqual(['Dentist', 'Taxi']);
    expect(showSuccessToastMock).toHaveBeenCalledWith('Imported 2 transactions from CSV');

    const invalidCsvFile = new File(['bad,header'], 'bad.csv', { type: 'text/csv' });
    Object.defineProperty(invalidCsvFile, 'text', {
      value: vi.fn().mockResolvedValue('bad,header'),
      configurable: true,
    });
    Object.defineProperty(csvInput.element, 'files', {
      value: [invalidCsvFile],
      configurable: true,
    });

    await csvInput.trigger('change');
    await flushPromises();

    expect(showErrorToastMock).toHaveBeenCalledWith(
      'Invalid CSV header: expected id,created_at,name,value,category_id',
    );
  });
});
