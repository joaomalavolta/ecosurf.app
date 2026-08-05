import { rest } from './supabase/rest'
import { SUPABASE_URL } from './supabase/config'

/** Item ambiental unificado (alerta ou mutirão) para o feed do Radar. */
export interface ItemEco {
  tipo: 'alerta' | 'mutirao'
  id: string
  titulo: string
  categoria?: string
  gravidade?: string
  municipio: string
  uf: string
  imagemUrl?: string
  quandoTxt?: string
  ts: number
}

interface AmeacaRow {
  id: string
  titulo: string
  categoria: string
  gravidade: string | null
  municipio: string | null
  uf: string | null
  images: string[] | null
  criada_em: string | null
}

interface MutiraoRow {
  id: string
  titulo: string
  municipio: string | null
  uf: string | null
  imagem_url: string | null
  quando: string | null
  horario: string | null
}

/**
 * Itens ambientais recentes (alertas + mutirões) num fluxo único, mais novos
 * primeiro. Via REST (sem SDK), fora do caminho crítico. Datas ausentes viram
 * 0 e eventos futuros são limitados ao "agora" — assim nada pina o topo do
 * feed acima do mar que está rolando neste instante. Falha em silêncio.
 */
export async function restEcoRecentes(limite = 30): Promise<ItemEco[]> {
  const agora = Date.now()
  const tsSeguro = (raw: string | null | undefined): number => {
    if (!raw) return 0
    const t = new Date(raw).getTime()
    return Number.isNaN(t) ? 0 : Math.min(t, agora)
  }
  try {
    const [alertas, mutiroes] = await Promise.all([
      rest<AmeacaRow[]>(
        `ameacas_publicas?select=id,titulo,categoria,gravidade,municipio,uf,images,criada_em&order=criada_em.desc&limit=${limite}`,
      ).catch(() => [] as AmeacaRow[]),
      rest<MutiraoRow[]>(
        `mutiroes_publicos?select=id,titulo,municipio,uf,imagem_url,quando,horario&order=quando.desc&limit=${limite}`,
      ).catch(() => [] as MutiraoRow[]),
    ])

    const itensA: ItemEco[] = alertas.map((r) => ({
      tipo: 'alerta',
      id: r.id,
      titulo: r.titulo,
      categoria: r.categoria,
      gravidade: r.gravidade ?? 'media',
      municipio: r.municipio ?? '',
      uf: r.uf ?? '',
      imagemUrl: r.images?.[0]
        ? `${SUPABASE_URL}/storage/v1/object/public/fotos/${r.images[0]}`
        : undefined,
      ts: tsSeguro(r.criada_em),
    }))

    const itensM: ItemEco[] = mutiroes.map((r) => ({
      tipo: 'mutirao',
      id: r.id,
      titulo: r.titulo,
      municipio: r.municipio ?? '',
      uf: r.uf ?? '',
      imagemUrl: r.imagem_url ?? undefined,
      quandoTxt: r.quando ? `${r.quando}${r.horario ? ` ${r.horario}` : ''}` : undefined,
      ts: tsSeguro(r.quando),
    }))

    return [...itensA, ...itensM].sort((a, b) => b.ts - a.ts).slice(0, limite)
  } catch {
    return []
  }
}
