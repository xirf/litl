import { bindings, defineConfig, defineWorker } from 'cf/config';

export default defineConfig({
  accountId: '94d4dcf8ea96e76cfceac33c55833b40',
  worker: defineWorker({
    name: 'litl',
    domains: ['litl.andka.id'],
    entrypoint: 'vinext/server/fetch-handler',
    compatibilityDate: '2026-09-30',
    compatibilityFlags: ['nodejs_compat'],
    assets: { notFoundHandling: 'none' },
    env: {
      ASSETS: bindings.assets(),
    },
  }),
});
