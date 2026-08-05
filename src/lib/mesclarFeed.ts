import { SUPABASE_URL } from '../services/supabase/config'
import type { Alerta, Mutirao, Pico, Foto } from '../types/domain'

/** Alerta/mutirão normalizado para render no padrão do feed. */
export interface ItemEcoFeed {
  tipo: 'alerta' | 'mutirao'
  id: string
  titulo: string
  categoria?: string
  gravidade?: string
  municipio: string
  uf: string
  imagemUrl?: string
  quandoTxt?: string
  autorNome?: string
  autorFoto?: string
  picoId?: string
}

/** Uma linha do feed: ou um card de pico (fotos) ou um card ambiental. */
export type UnidadeFeed =
  | { tipo: 'surf'; picoId: string; fotos: Foto[] }
  | { tipo: 'eco'; item: ItemEcoFeed }

/** Normaliza texto p/ casar cidade sem depender de acento/caixa. */
const norm = (s: string) =>
  [...(s ?? '').normalize('NFD')]
    .filter((c) => c.charCodeAt(0) < 0x300 || c.charCodeAt(0) > 0x36f)
    .join('')
    .toLowerCase()
    .trim()

export function alertaParaEco(a: Alerta): ItemEcoFeed {
  return {
    tipo: 'alerta',
    id: a.id,
    titulo: a.titulo,
    categoria: a.categoria,
    gravidade: a.gravidade,
    municipio: a.municipio,
    uf: a.uf,
    imagemUrl: a.images?.[0]
      ? `${SUPABASE_URL}/storage/v1/object/public/fotos/${a.images[0]}`
      : undefined,
    autorNome: a.comunidadeNome ?? a.autorNome,
    autorFoto: a.comunidadeAvatar ?? a.autorFoto,
    picoId: a.picoId,
  }
}

export function mutiraoParaEco(m: Mutirao): ItemEcoFeed {
  return {
    tipo: 'mutirao',
    id: m.id,
    titulo: m.titulo,
    municipio: m.municipio,
    uf: m.uf,
    imagemUrl: m.imagemUrl,
    quandoTxt: m.quando ? `${m.quando}${m.horario ? ` · ${m.horario}` : ''}` : undefined,
    autorNome: m.comunidadeNome ?? m.autorNome ?? m.organizador,
    autorFoto: m.comunidadeAvatar ?? m.autorFoto,
    picoId: m.picoId,
  }
}

const PESO_GRAV: Record<string, number> = { emergencial: 0, alta: 1, media: 2, baixa: 3 }

/**
 * Mescla A + D: as fotos são a espinha dorsal e cada alerta/mutirão é
 * ancorado logo abaixo do card do pico do MESMO lugar (mesmo pico, ou mesma
 * cidade) — a "mescla inteligente". O que não tem lugar no feed é costurado
 * por gravidade num ritmo leve, pra não virar um bloco separado no fim.
 */
export function mesclarFeed(
  feedCards: [string, Foto[]][],
  alertas: Alerta[],
  mutiroes: Mutirao[],
  picoMap: Map<string, Pico>,
  { maxPorPico = 2, cadenciaSobra = 4 }: { maxPorPico?: number; cadenciaSobra?: number } = {},
): UnidadeFeed[] {
  const eco: ItemEcoFeed[] = [...alertas.map(alertaParaEco), ...mutiroes.map(mutiraoParaEco)]
  // alertas mais graves primeiro; mutirões depois
  eco.sort((a, b) => {
    if (a.tipo !== b.tipo) return a.tipo === 'alerta' ? -1 : 1
    if (a.tipo === 'alerta') return (PESO_GRAV[a.gravidade ?? 'media'] ?? 2) - (PESO_GRAV[b.gravidade ?? 'media'] ?? 2)
    return 0
  })

  const usados = new Set<string>()
  const saida: UnidadeFeed[] = []
  const sobra = () => eco.filter((e) => !usados.has(e.id))

  feedCards.forEach(([picoId, fotos], idx) => {
    saida.push({ tipo: 'surf', picoId, fotos })

    const pico = picoMap.get(picoId)
    const cidade = pico ? norm(pico.municipio) : ''
    const contextual = eco
      .filter((e) => !usados.has(e.id) && (e.picoId === picoId || (!!cidade && norm(e.municipio) === cidade)))
      .slice(0, maxPorPico)
    for (const e of contextual) {
      usados.add(e.id)
      saida.push({ tipo: 'eco', item: e })
    }

    // costura uma "sobra" (sem lugar) a cada `cadenciaSobra` picos
    if ((idx + 1) % cadenciaSobra === 0) {
      const resto = sobra()
      if (resto.length) {
        usados.add(resto[0].id)
        saida.push({ tipo: 'eco', item: resto[0] })
      }
    }
  })

  // o pouco que restar entra no fim
  for (const e of sobra()) saida.push({ tipo: 'eco', item: e })

  return saida
}
