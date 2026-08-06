/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

// `vite-plugin-pwa` não publica o tipo de `__WB_MANIFEST` — é o próprio
// plugin que substitui esta variável pela lista de assets no build.
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

/**
 * Service worker próprio (não o gerado automaticamente do `vite-plugin-pwa`).
 *
 * `injectManifest` em vez de `generateSW` porque este arquivo vai ganhar um
 * listener de `push` — o modo padrão do plugin só pré-cacheia o shell da
 * página e não deixa escrever handler nenhum aqui.
 *
 * `self.__WB_MANIFEST` é substituído em build pela lista de assets a
 * pré-cachear — sem essa injeção o array fica vazio e nada é cacheado.
 */
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

self.skipWaiting()
self.addEventListener('activate', () => {
  void self.clients.claim()
})
