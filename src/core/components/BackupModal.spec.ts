import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import {
  createInMemoryStorage,
  createLocalStorage,
  serializeBackupSnapshot,
  setStorage,
  type Category,
  type LocalBudgetStorage,
} from '@/core/storage';
import { useCategoryStore } from '@/modules/categories';
import { useTransactionStore } from '@/modules/transactions';
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
  props: ['isOpen'],
  emits: ['didDismiss'],
  template: '<div class="ion-modal-stub" :data-is-open="String(Boolean(isOpen))"><slot v-if="isOpen" /></div>',
};

const foodCategory: Category = { id: 'cat-food', title: 'Food', icon: 'food' };
const clothesCategory: Category = { id: 'cat-clothes', title: 'Clothes', icon: 'clothes' };

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
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
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

  it('exports JSON backup file and shows success toast when Export Backup is clicked', async () => {
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
    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:backup-url');
    expect(showSuccessToastMock).toHaveBeenCalledWith('Backup exported');
  });

  it('imports valid JSON backup, refreshes stores, and shows success toast', async () => {
    const wrapper = mount(BackupModal, {
      props: { modelValue: true },
      global: { stubs: { IonModal: IonModalStub } },
    });
    await flushPromises();

    const categoryStore = useCategoryStore();
    const transactionStore = useTransactionStore();
    await categoryStore.getCategoryList();
    expect(categoryStore.categories).toHaveLength(1);

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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
          categoryId: clothesCategory.id,
        },
      ],
    });

    const fileInput = wrapper.find('[data-testid="backup-file-input"]');
    const file = new File([backupJson], 'backup.json', { type: 'application/json' });
    Object.defineProperty(fileInput.element, 'files', {
      value: [file],
      configurable: true,
    });

    await fileInput.trigger('change');
    await vi.waitFor(() => {
      expect(showSuccessToastMock).toHaveBeenCalledWith('Imported 1 transactions');
    });

    expect(categoryStore.categories).toHaveLength(2);
    expect(transactionStore.transactions).toHaveLength(1);
    expect(transactionStore.transactions[0].name).toBe('Imported Jacket');
  });

  it('shows error toast when imported JSON file is invalid', async () => {
    const wrapper = mount(BackupModal, {
      props: { modelValue: true },
      global: { stubs: { IonModal: IonModalStub } },
    });
    await flushPromises();

    const fileInput = wrapper.find('[data-testid="backup-file-input"]');
    const invalidFile = new File(['{not valid json'], 'broken.json', { type: 'application/json' });
    Object.defineProperty(fileInput.element, 'files', {
      value: [invalidFile],
      configurable: true,
    });

    await fileInput.trigger('change');
    await vi.waitFor(() => {
      expect(showErrorToastMock).toHaveBeenCalledWith('Invalid backup JSON');
    });
    expect(showSuccessToastMock).not.toHaveBeenCalled();
  });

  it('imports data from Supabase on button click, refreshes stores, and shows toast', async () => {
    const remoteStorage = createInMemoryStorage({
      categories: [foodCategory, clothesCategory],
      transactions: [
        {
          id: 'tx-supabase-1',
          name: 'Supabase Dinner',
          value: 1400,
          createdAt: new Date().toISOString(),
          categoryId: foodCategory.id,
          category: foodCategory,
        },
      ],
    });

    const wrapper = mount(BackupModal, {
      props: {
        modelValue: true,
        remoteStorage,
      },
      global: { stubs: { IonModal: IonModalStub } },
    });
    await flushPromises();

    const categoryStore = useCategoryStore();
    const transactionStore = useTransactionStore();

    const supabaseButton = wrapper.find('[data-testid="import-supabase-btn"]');
    await supabaseButton.trigger('click');
    await flushPromises();

    expect(categoryStore.categories).toHaveLength(2);
    expect(transactionStore.transactions).toHaveLength(1);
    expect(transactionStore.transactions[0].name).toBe('Supabase Dinner');
    expect(showSuccessToastMock).toHaveBeenCalledWith('Imported 1 transactions from Supabase');
  });
});
