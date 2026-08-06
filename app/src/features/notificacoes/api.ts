import { supabase } from '@/lib/supabase'

/**
 * Notificações push (discussão em uso, 06/08) — feature transversal, sem
 * pilar próprio, no mesmo espírito de Metas.
 */

/**
 * `base64url` → `Uint8Array`, formato que `applicationServerKey` exige.
 *
 * `new Uint8Array(length)` em vez de `Uint8Array.from(...)`: só a forma com
 * length explícito o TS tipa como `Uint8Array<ArrayBuffer>` — a outra infere
 * `ArrayBufferLike` (que inclui `SharedArrayBuffer`), incompatível com
 * `BufferSource` que `applicationServerKey` exige.
 */
function paraUint8Array(base64url: string): Uint8Array<ArrayBuffer> {
  const preenchimento = '='.repeat((4 - (base64url.length % 4)) % 4)
  const base64 = (base64url + preenchimento)
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const bruto = atob(base64)
  const bytes = new Uint8Array(bruto.length)
  for (let i = 0; i < bruto.length; i++) bytes[i] = bruto.charCodeAt(i)
  return bytes
}

export function suportado(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

export function permissaoAtual(): NotificationPermission {
  return 'Notification' in window ? Notification.permission : 'denied'
}

async function inscricaoAtual(): Promise<PushSubscription | null> {
  const registro = await navigator.serviceWorker.ready
  return registro.pushManager.getSubscription()
}

export async function estaInscrito(): Promise<boolean> {
  if (!suportado()) return false
  return (await inscricaoAtual()) !== null
}

/**
 * Pede permissão e inscreve no push, salvando endpoint + chaves no banco.
 * `upsert` por `endpoint`: reautorizar sem ter desinscrito antes devolve a
 * mesma inscrição do navegador, e gravar de novo não deveria falhar.
 */
export async function ativar(): Promise<void> {
  if (!suportado()) throw new Error('Notificação não é suportada neste navegador')

  const permissao = await Notification.requestPermission()
  if (permissao !== 'granted') {
    throw new Error('Permissão de notificação não concedida')
  }

  const registro = await navigator.serviceWorker.ready
  const existente = await registro.pushManager.getSubscription()
  const inscricao =
    existente ??
    (await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: paraUint8Array(
        import.meta.env.VITE_VAPID_PUBLIC_KEY,
      ),
    }))

  const json = inscricao.toJSON()
  if (!json.keys?.p256dh || !json.keys.auth || !json.endpoint) {
    throw new Error('Inscrição de push incompleta')
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    { onConflict: 'endpoint' },
  )
  if (error) throw new Error(error.message)
}

/** Desinscreve no navegador E remove a linha — os dois lados, não só um. */
export async function desativar(): Promise<void> {
  const inscricao = await inscricaoAtual()
  if (!inscricao) return

  const endpoint = inscricao.endpoint
  await inscricao.unsubscribe()

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
  if (error) throw new Error(error.message)
}
