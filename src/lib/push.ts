/**
 * Web Push do Ecosurf.
 *
 * Princípios (nesta ordem):
 *  1. NINGUÉM É AVISADO SEM PEDIR. Notificação é opt-in explícito, e desligar
 *     é tão fácil quanto ligar — um toque, e a inscrição some do servidor.
 *  2. HONESTIDADE SOBRE LIMITES. No iPhone, push só funciona com o app
 *     instalado na tela de início (exigência da Apple). Em vez de pedir
 *     permissão e falhar em silêncio, explicamos o porquê.
 *  3. FALHA SILENCIOSA NUNCA. Cada erro vira uma mensagem em português.
 */

/** Chave pública VAPID. Pública por natureza — a privada vive só no servidor. */
const VAPID_PUBLICA = 'BMfCQugHDqz2TuS3lSCw-pENT3JZkgcwTGhq2VsuBYrNWhrqlWBE-fz-2LS9OmTBbGjrgkZR-sndc8xwsVDBsmU'

export type EstadoPush =
  | 'indisponivel'      // navegador não suporta
  | 'precisa-instalar'  // iOS fora da tela de início
  | 'negado'            // usuário bloqueou nas configurações do sistema
  | 'desligado'         // suportado, sem inscrição
  | 'ligado'            // inscrito neste aparelho

function suportaPush(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/** iOS só entrega push quando o PWA está instalado (rodando standalone). */
function ehIosSemInstalar(): boolean {
  if (typeof navigator === 'undefined') return false
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
  if (!ios) return false
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia?.('(display-mode: standalone)').matches
  return !standalone
}

export async function estadoPush(): Promise<EstadoPush> {
  if (!suportaPush()) return ehIosSemInstalar() ? 'precisa-instalar' : 'indisponivel'
  if (ehIosSemInstalar()) return 'precisa-instalar'
  if (Notification.permission === 'denied') return 'negado'
  try {
    const reg = await navigator.serviceWorker.ready
    const inscricao = await reg.pushManager.getSubscription()
    return inscricao ? 'ligado' : 'desligado'
  } catch {
    return 'desligado'
  }
}

function base64ParaUint8(base64: string): Uint8Array {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  const cru = atob(b64)
  const saida = new Uint8Array(cru.length)
  for (let i = 0; i < cru.length; i++) saida[i] = cru.charCodeAt(i)
  return saida
}

/**
 * Liga as notificações neste aparelho: pede permissão, inscreve no navegador
 * e guarda a inscrição no Supabase (RLS: só o dono enxerga a própria).
 * Devolve o estado final — a UI nunca precisa adivinhar o que aconteceu.
 */
export async function ligarPush(): Promise<{ estado: EstadoPush; erro?: string }> {
  if (ehIosSemInstalar()) {
    return {
      estado: 'precisa-instalar',
      erro: 'No iPhone, as notificações só funcionam com o Ecosurf instalado na tela de início. Toque em compartilhar e escolha "Adicionar à Tela de Início".',
    }
  }
  if (!suportaPush()) {
    return { estado: 'indisponivel', erro: 'Este navegador não permite notificações.' }
  }
  const permissao = await Notification.requestPermission()
  if (permissao !== 'granted') {
    return {
      estado: permissao === 'denied' ? 'negado' : 'desligado',
      erro: permissao === 'denied'
        ? 'As notificações estão bloqueadas nas configurações do navegador para este site.'
        : undefined,
    }
  }
  try {
    const reg = await navigator.serviceWorker.ready
    const inscricao =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ParaUint8(VAPID_PUBLICA) as BufferSource,
      }))

    const bruta = inscricao.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
    if (!bruta.endpoint || !bruta.keys?.p256dh || !bruta.keys.auth) {
      return { estado: 'desligado', erro: 'O navegador não devolveu uma inscrição válida.' }
    }

    const { sb } = await import('../services/supabase/client')
    const cliente = sb()
    const { data: sess } = await cliente.auth.getSession()
    const uid = sess.session?.user?.id
    if (!uid) {
      await inscricao.unsubscribe().catch(() => {})
      return { estado: 'desligado', erro: 'Entre na sua conta para receber notificações.' }
    }

    const { error } = await cliente.from('push_subscriptions').upsert(
      {
        endpoint: bruta.endpoint,
        user_id: uid,
        p256dh: bruta.keys.p256dh,
        auth: bruta.keys.auth,
        user_agent: navigator.userAgent.slice(0, 200),
        ultima_vez: new Date().toISOString(),
      },
      { onConflict: 'endpoint' },
    )
    if (error) {
      await inscricao.unsubscribe().catch(() => {})
      return { estado: 'desligado', erro: 'Não deu para salvar a inscrição. Tente de novo.' }
    }
    return { estado: 'ligado' }
  } catch {
    return { estado: 'desligado', erro: 'Não foi possível ativar as notificações neste aparelho.' }
  }
}

/**
 * Desliga: apaga a inscrição no servidor E no navegador. Depois disto, o
 * Ecosurf não tem por onde alcançar este aparelho — o opt-out é de verdade.
 */
export async function desligarPush(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready
    const inscricao = await reg.pushManager.getSubscription()
    if (!inscricao) return
    const endpoint = inscricao.endpoint
    try {
      const { sb } = await import('../services/supabase/client')
      await sb().from('push_subscriptions').delete().eq('endpoint', endpoint)
    } catch { /* sem rede: a inscrição local sai mesmo assim */ }
    await inscricao.unsubscribe()
  } catch { /* nada inscrito: já está desligado */ }
}
