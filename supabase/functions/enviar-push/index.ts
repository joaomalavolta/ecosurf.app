import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

// IMPORTANTE: esta chave pública VAPID DEVE ser idêntica à de src/lib/push.ts
// (o cliente registra a assinatura com ela; o Web Push amarra a assinatura à
// chave pública do registro). Ela também forma par com o secret
// VAPID_PRIVATE_KEY. Chaves divergentes = a Apple/Google rejeita com 403 e
// nada é enviado. Já aconteceu; por isso o comentário.
const VAPID_PUBLICA = 'BMfCQugHDqz2TuS3lSCw-pENT3JZkgcwTGhq2VsuBYrNWhrqlWBE-fz-2LS9OmTBbGjrgkZR-sndc8xwsVDBsmU'
const ASSUNTOS = ['alertas', 'mutiroes', 'picos'] as const
type Assunto = typeof ASSUNTOS[number]

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('método não permitido', { status: 405 })
  }

  const chaveEsperada = Deno.env.get('PUSH_ENVIO_KEY')?.trim()
  if (!chaveEsperada || req.headers.get('x-ecosurf-key')?.trim() !== chaveEsperada) {
    return new Response('não autorizado', { status: 401 })
  }

  const vapidPrivada = Deno.env.get('VAPID_PRIVATE_KEY')?.trim()
  if (!vapidPrivada) {
    return new Response(JSON.stringify({ erro: 'VAPID_PRIVATE_KEY não configurada' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let corpo: {
    assunto?: string
    titulo?: string
    corpo?: string
    url?: string
    tag?: string
    excetoUserId?: string | null
    somenteFavoritosDoPico?: string | null
  }
  try {
    corpo = await req.json()
  } catch {
    return new Response(JSON.stringify({ erro: 'json inválido' }), { status: 400 })
  }

  const assunto = corpo.assunto as Assunto
  if (!ASSUNTOS.includes(assunto)) {
    return new Response(JSON.stringify({ erro: 'assunto inválido' }), { status: 400 })
  }
  if (!corpo.titulo) {
    return new Response(JSON.stringify({ erro: 'titulo obrigatório' }), { status: 400 })
  }

  webpush.setVapidDetails('mailto:ecosurf@ecosurf.org.br', VAPID_PUBLICA, vapidPrivada)

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: inscricoes, error } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, user_id')
  if (error) {
    return new Response(JSON.stringify({ erro: error.message }), { status: 500 })
  }

  const { data: prefs } = await admin
    .from('user_preferences')
    .select('user_id, notificacoes')

  const desligou = new Map<string, boolean>()
  for (const p of prefs ?? []) {
    const n = (p.notificacoes ?? {}) as Record<string, unknown>
    const tudoDesligado = n.ativas === false
    const assuntoDesligado = n[assunto] === false
    desligou.set(p.user_id as string, tudoDesligado || assuntoDesligado)
  }

  let publico: Set<string> | null = null
  if (corpo.somenteFavoritosDoPico) {
    const { data: favs } = await admin
      .from('favoritos')
      .select('user_id')
      .eq('pico_id', corpo.somenteFavoritosDoPico)
    publico = new Set((favs ?? []).map((f) => f.user_id as string))
  }

  const payload = JSON.stringify({
    titulo: corpo.titulo,
    corpo: corpo.corpo ?? '',
    url: corpo.url ?? '/',
    tag: corpo.tag ?? assunto,
  })

  let enviadas = 0
  let puladas = 0
  let removidas = 0
  const mortas: string[] = []
  const errosOutros: string[] = []

  await Promise.all(
    (inscricoes ?? []).map(async (s) => {
      const uid = s.user_id as string
      if (desligou.get(uid)) { puladas++; return }
      if (corpo.excetoUserId && uid === corpo.excetoUserId) { puladas++; return }
      if (publico && !publico.has(uid)) { puladas++; return }
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint as string,
            keys: { p256dh: s.p256dh as string, auth: s.auth as string },
          },
          payload,
        )
        enviadas++
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          mortas.push(s.endpoint as string)
        } else {
          // Nunca engolir em silêncio: foi o catch mudo que escondeu o bug da
          // chave VAPID trocada por semanas. Reportamos no retorno.
          errosOutros.push(`${status ?? '?'}: ${(e as Error).message ?? 'erro'}`)
        }
      }
    }),
  )

  if (mortas.length) {
    await admin.from('push_subscriptions').delete().in('endpoint', mortas)
    removidas = mortas.length
  }

  return new Response(JSON.stringify({ enviadas, puladas, removidas, errosOutros }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
