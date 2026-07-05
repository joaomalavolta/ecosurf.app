/**
 * OG dinâmico — o cartão de compartilhamento com a cara do registro.
 *
 * Crawlers (WhatsApp, Facebook, Telegram…) não executam JavaScript: o SPA
 * sempre lhes mostrava o card genérico. O vercel.json fareja o User-Agent
 * de bot nas rotas /pico, /alerta e /mutirao e reescreve para cá; esta
 * função busca o registro nas views públicas do Supabase e devolve um HTML
 * mínimo com as meta tags certas — título real, descrição real e a FOTO do
 * registro. Humanos nunca passam por aqui; se passarem, o refresh os leva
 * ao app.
 */
export const config = { runtime: 'edge' }

const SUPABASE_URL =
  (globalThis as { process?: { env?: Record<string, string> } }).process?.env?.VITE_SUPABASE_URL ??
  'https://mdgttlgtrrmkmqttrxdq.supabase.co'
const SUPABASE_KEY =
  (globalThis as { process?: { env?: Record<string, string> } }).process?.env?.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kZ3R0bGd0cnJta21xdHRyeGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNzQ3OTQsImV4cCI6MjA5NzY1MDc5NH0.q2LVxRcxugCL03izcHsRDHVquSy-_WLKr-Pu8uIvcg0'

const SITE = 'https://www.ecosurf.app'
const OG_PADRAO = `${SITE}/og.png`

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

async function rest<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    })
    if (!r.ok) return null
    return (await r.json()) as T
  } catch {
    return null
  }
}

const fotoPublica = (path: string) => `${SUPABASE_URL}/storage/v1/object/public/fotos/${path}`

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const tipo = url.searchParams.get('tipo') ?? ''
  const id = url.searchParams.get('id') ?? ''

  let titulo = 'Ecosurf — Surfar Global e Agir Local'
  let descricao = 'Radar colaborativo de surf e cartografia socioambiental do litoral brasileiro.'
  let imagem = OG_PADRAO
  let destino = SITE

  if (tipo === 'pico' && id) {
    destino = `${SITE}/pico/${id}`
    const p = await rest<{ nome: string; praia: string | null; municipio: string | null; uf: string | null }[]>(
      `picos_publicos?id=eq.${encodeURIComponent(id)}&select=nome,praia,municipio,uf&limit=1`,
    )
    if (p?.[0]) {
      titulo = `${p[0].nome} · ${p[0].municipio ?? ''}${p[0].uf ? `/${p[0].uf}` : ''} — Ecosurf`
      descricao = `Condições do mar, maré e fotos da comunidade no pico ${p[0].nome}. Veja o registro mais recente.`
      const f = await rest<{ storage_path: string | null }[]>(
        `fotos_publicas?pico_id=eq.${encodeURIComponent(id)}&select=storage_path&order=capturada_em.desc&limit=1`,
      )
      if (f?.[0]?.storage_path) imagem = fotoPublica(f[0].storage_path)
    }
  } else if (tipo === 'alerta' && id) {
    destino = `${SITE}/alerta/${id}`
    const a = await rest<{ titulo: string; gravidade: string | null; municipio: string | null; uf: string | null; images: string[] | null }[]>(
      `ameacas_publicas?id=eq.${encodeURIComponent(id)}&select=titulo,gravidade,municipio,uf,images&limit=1`,
    )
    if (a?.[0]) {
      titulo = `${a[0].titulo} — Ecosurf`
      descricao = `Alerta ambiental registrado pela comunidade · gravidade ${a[0].gravidade ?? 'média'} · ${a[0].municipio ?? ''}${a[0].uf ? `/${a[0].uf}` : ''}.`
      if (a[0].images?.[0]) imagem = fotoPublica(a[0].images[0])
    }
  } else if (tipo === 'mutirao' && id) {
    destino = `${SITE}/mutirao/${id}`
    const m = await rest<{ titulo: string; municipio: string; uf: string; quando: string; horario: string | null; imagem_url: string | null }[]>(
      `mutiroes_publicos?id=eq.${encodeURIComponent(id)}&select=titulo,municipio,uf,quando,horario,imagem_url&limit=1`,
    )
    if (m?.[0]) {
      titulo = `${m[0].titulo} — Ecosurf`
      descricao = `Mutirão em ${m[0].municipio}/${m[0].uf} · ${m[0].quando}${m[0].horario ? ` às ${m[0].horario}` : ''}. Participe!`
      if (m[0].imagem_url) imagem = m[0].imagem_url
    }
  }

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${esc(titulo)}</title>
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Ecosurf" />
<meta property="og:title" content="${esc(titulo)}" />
<meta property="og:description" content="${esc(descricao)}" />
<meta property="og:image" content="${esc(imagem)}" />
<meta property="og:url" content="${esc(destino)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(titulo)}" />
<meta name="twitter:description" content="${esc(descricao)}" />
<meta name="twitter:image" content="${esc(imagem)}" />
<meta http-equiv="refresh" content="0;url=${esc(destino)}" />
<link rel="canonical" href="${esc(destino)}" />
</head>
<body>Redirecionando para <a href="${esc(destino)}">${esc(destino)}</a>…</body>
</html>`

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  })
}
