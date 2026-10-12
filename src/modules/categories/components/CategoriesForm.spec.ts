import { beforeEach, describe, expect, it } from 'vitest';
import { mount, type DOMWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createInMemoryStorage, setStorage } from '@/core/storage';
import { useCategoryStore } from '@/modules/categories';
import CategoriesForm from './CategoriesForm.vue';

function getPressedStates(cards: DOMWrapper<Element>[]): boolean[] {
  return cards.map((card) => card.classes().includes('pressed-card'));
}

describe('CategoriesForm', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    setStorage(
      createInMemoryStorage({
        categories: [
          { id: 'cat-1', title: 'Food', icon: 'food' },
          { id: 'cat-2', title: 'Transportation', icon: 'transportation' },
        ],
      }),
    );
    const categoryStore = useCategoryStore();
    await categoryStore.getCategoryList();
  });

  it('renders Categories from useCategoryStore and highlights the card matching modelValue', () => {
    const wrapper = mount(CategoriesForm, {
      props: {
        modelValue: 'cat-2',
      },
    });

    const cards = wrapper.findAll('.card');
    expect(cards).toHaveLength(2);
    expect(cards[0].text()).toContain('Food');
    expect(cards[1].text()).toContain('Transportation');
    expect(getPressedStates(cards)).toEqual([false, true]);
  });

  it('updates v-model on tap, keeps selection on repeated tap, and clears highlight when parent resets modelValue to empty', async () => {
    const wrapper = mount(CategoriesForm, {
      props: {
        modelValue: '',
        'onUpdate:modelValue': (id: string) => {
          void wrapper.setProps({ modelValue: id });
        },
      },
    });

    const cards = wrapper.findAll('.card');
    expect(getPressedStates(cards)).toEqual([false, false]);

    // Tap first category ("Food")
    await cards[0].trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['cat-1']);
    expect(getPressedStates(cards)).toEqual([true, false]);

    // Tap first category again (idempotent — stays selected)
    await cards[0].trigger('click');
    expect(getPressedStates(cards)).toEqual([true, false]);

    // Tap second category ("Transportation" — switches selection)
    await cards[1].trigger('click');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['cat-2']);
    expect(getPressedStates(cards)).toEqual([false, true]);

    // Parent clears state (e.g. after submitting Transaction)
    await wrapper.setProps({ modelValue: '' });
    expect(getPressedStates(cards)).toEqual([false, false]);
  });
});
