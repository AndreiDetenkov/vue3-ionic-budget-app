import { mount } from '@vue/test-utils';
import Tab1Page from '../../src/modules/transactions/views/TransactionsPage.vue';
import { describe, expect, test, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

describe('Tab1Page.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  test('renders tab 1 Tab1Page', () => {
    const wrapper = mount(Tab1Page, {
      global: {
        plugins: [createPinia()],
      },
    });
    expect(wrapper.text()).toBeDefined();
  });
});
