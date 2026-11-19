import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import BaseRefresher from './BaseRefresher.vue';

describe('BaseRefresher.vue', () => {
  it('calls complete() only after async onRefresh settles', async () => {
    let resolveRefresh!: () => void;
    const onRefresh = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        }),
    );

    const wrapper = mount(BaseRefresher, { props: { onRefresh } });
    const completeMock = vi.fn();

    await wrapper.find('ion-refresher').trigger('ionRefresh', { detail: { complete: completeMock } });
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(completeMock).not.toHaveBeenCalled();

    resolveRefresh();
    await flushPromises();
    expect(completeMock).toHaveBeenCalledTimes(1);
  });

  it('calls complete() in finally even when onRefresh rejects', async () => {
    const error = new Error('sync boom');
    const onRefresh = vi.fn().mockRejectedValue(error);
    const errorHandler = vi.fn();

    const wrapper = mount(BaseRefresher, {
      props: { onRefresh },
      global: {
        config: {
          errorHandler,
        },
      },
    });
    const completeMock = vi.fn();

    await wrapper.find('ion-refresher').trigger('ionRefresh', { detail: { complete: completeMock } });
    await flushPromises();

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(completeMock).toHaveBeenCalledTimes(1);
    expect(errorHandler).toHaveBeenCalledWith(error, expect.anything(), expect.any(String));
  });

  it('calls complete() immediately when onRefresh is omitted', async () => {
    const wrapper = mount(BaseRefresher);
    const completeMock = vi.fn();

    await wrapper.find('ion-refresher').trigger('ionRefresh', { detail: { complete: completeMock } });
    await flushPromises();

    expect(completeMock).toHaveBeenCalledTimes(1);
  });
});
