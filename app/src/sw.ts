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

/**
 * Notificações push (discussão em uso, 06/08). O payload vem da Edge
 * Function `notificar` como JSON: `{ title, body, rota }`. `rota` é onde
 * clicar na notificação deve levar — mesma ideia de `EventoCalendario.rota`,
 * a página nem sempre é a Home.
 */
self.addEventListener('push', (evento) => {
  if (!evento.data) return
  const { title, body, rota } = evento.data.json() as {
    title: string
    body: string
    rota?: string
  }

  evento.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      // Ícone colorido (`icon`) é o que aparece expandido, dentro da
      // notificação — mas a barra de status do Android desenha `badge` como
      // silhueta monocromática a partir do canal alfa. Usar o ícone colorido
      // (opaco, sem transparência real) ali também dava um quadrado branco
      // sólido — daí este PNG à parte, só com os pontinhos e fundo
      // transparente.
      badge: '/badge-monocromatico.png',
      data: { rota: rota ?? '/' },
    }),
  )
})

/**
 * Clique na notificação: foca uma aba já aberta do app (navegando pra rota
 * certa) em vez de sempre abrir uma janela nova — quem já está com o Nexus
 * aberto não precisa de uma segunda aba.
 */
self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()
  const rota = (evento.notification.data as { rota?: string })?.rota ?? '/'

  evento.waitUntil(
    (async () => {
      const clientes = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      const existente = clientes.find((cliente) => 'focus' in cliente) as
        | WindowClient
        | undefined

      if (existente) {
        await existente.focus()
        existente.postMessage({ tipo: 'navegar', rota })
      } else {
        await self.clients.openWindow(rota)
      }
    })(),
  )
})
