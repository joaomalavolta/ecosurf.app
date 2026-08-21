/**
 * Exportar meus dados (GeoJSON) — a promessa de soberania de dados do menu
 * do Perfil, agora real. Gera um FeatureCollection com TODAS as
 * contribuições georreferenciadas da pessoa (fotos, alertas, mutirões),
 * baixado como arquivo no aparelho. Padrão aberto: abre no QGIS, no
 * geojson.io, no Google Earth — os dados são do usuário, não do app.
 */
import { restMinhasFotos, rest } from './supabase/rest'
import { carregarPicos } from './picos'
import { linkFoto } from '../lib/linkFoto'

type Feature = {
  type: 'Feature'
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: Record<string, unknown>
}

export interface ResultadoExport {
  fotos: number
  alertas: number
  positivos: number
  mutiroes: number
  arquivo: string
}

export async function exportarMeusDadosGeoJSON(): Promise<ResultadoExport | null> {
  const { sb } = await import('./supabase/client')
  const { data: sess } = await sb().auth.getSession()
  const uid = sess.session?.user?.id
  if (!uid) return null

  const features: Feature[] = []

  // ── Fotos: ponto = local da captura (ou o pico, quando capturada sem GPS) ──
  const [fotos, picos] = await Promise.all([restMinhasFotos(), carregarPicos()])
  const picoMap = new Map(picos.map((p) => [p.id, p]))
  let nFotos = 0
  for (const f of fotos) {
    const pico = picoMap.get(f.pico_id)
    const lng = f.captura_lng ?? pico?.lng
    const lat = f.captura_lat ?? pico?.lat
    if (lng == null || lat == null) continue
    nFotos++
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        tipo: 'foto',
        pico: pico?.nome ?? f.pico_id,
        municipio: pico?.municipio,
        uf: pico?.uf,
        capturada_em: f.capturada_em,
        procedencia: f.procedencia ?? 'nao-verificado',
        // A feature É esta foto, então o link abre nela em tela cheia.
        url: `https://www.ecosurf.app${linkFoto(f.pico_id, f.id, true)}`,
      },
    })
  }

  // ── Registros da pessoa: alertas e positivos (via view pública) ──
  //
  // ⚠️ As coordenadas vêm da view, então categoria sensível sai APROXIMADA
  // também aqui — de propósito. Um GeoJSON é feito para ser aberto no QGIS e
  // mandado por e-mail; se o ponto exato saísse no arquivo, toda a proteção
  // do banco viraria uma formalidade. `precisao` acompanha para quem for
  // analisar saber com o que está lidando.
  let nAlertas = 0
  let nPositivos = 0
  try {
    const registros = await rest<{ id: string; titulo: string; categoria: string; tipo_registro: string | null; precisao: string | null; gravidade: string | null; status: string; municipio: string | null; uf: string | null; lat: number | null; lng: number | null; criada_em: string }[]>(
      `ameacas_publicas?select=id,titulo,categoria,tipo_registro,precisao,gravidade,status,municipio,uf,lat,lng,criada_em&autor_id=eq.${uid}`,
    )
    for (const a of registros) {
      if (a.lat == null || a.lng == null) continue
      const ehPositivo = a.tipo_registro === 'positivo'
      if (ehPositivo) nPositivos++
      else nAlertas++
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [a.lng, a.lat] },
        properties: {
          tipo: ehPositivo ? 'registro-positivo' : 'alerta',
          titulo: a.titulo,
          categoria: a.categoria,
          ...(ehPositivo ? {} : { gravidade: a.gravidade ?? 'media', status: a.status }),
          precisao: a.precisao ?? 'exata',
          municipio: a.municipio,
          uf: a.uf,
          criada_em: a.criada_em,
          url: `https://www.ecosurf.app/alerta/${a.id}`,
        },
      })
    }
  } catch { /* sem registros ou sem rede: exporta o que houver */ }

  // ── Mutirões organizados pela pessoa ──
  let nMutiroes = 0
  try {
    const ms = await rest<{ id: string; titulo: string; tipo_acao: string | null; status: string; municipio: string; uf: string; quando: string; lat: number | null; lng: number | null }[]>(
      `mutiroes_publicos?select=id,titulo,tipo_acao,status,municipio,uf,quando,lat,lng&autor_id=eq.${uid}`,
    )
    for (const m of ms) {
      if (m.lat == null || m.lng == null) continue
      nMutiroes++
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [m.lng, m.lat] },
        properties: {
          tipo: 'mutirao',
          titulo: m.titulo,
          tipo_acao: m.tipo_acao ?? 'limpeza',
          status: m.status,
          municipio: m.municipio,
          uf: m.uf,
          quando: m.quando,
          url: `https://www.ecosurf.app/mutirao/${m.id}`,
        },
      })
    }
  } catch { /* idem */ }

  const geojson = {
    type: 'FeatureCollection' as const,
    features,
    // metadados do export (fora do padrão obrigatório, mas úteis e válidos)
    properties: {
      gerado_por: 'Ecosurf App — exportação de dados do usuário (LGPD)',
      gerado_em: new Date().toISOString(),
      total: features.length,
    },
  }

  // download client-side: os dados nunca passam por servidor de terceiros
  const nomeArquivo = `ecosurf-meus-dados-${new Date().toISOString().slice(0, 10)}.geojson`
  const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)

  return { fotos: nFotos, alertas: nAlertas, positivos: nPositivos, mutiroes: nMutiroes, arquivo: nomeArquivo }
}
