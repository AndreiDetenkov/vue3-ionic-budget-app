import { VueQueryPlugin, type VueQueryPluginOptions } from '@tanstack/vue-query';
import { FunctionPlugin } from 'vue';

const vueQueryOptions: VueQueryPluginOptions = {
  queryClientConfig: {
    defaultOptions: {
      queries: {
        gcTime: 60_000 * 4,
        staleTime: 60_000,
      },
    },
  },
};

export const vueQueryPlugin: FunctionPlugin = (app) => {
  app.use(VueQueryPlugin, vueQueryOptions);
};
