import type { CategoriaRegistro, TipoRegistro } from '../types/domain'
import {
  IconTrash,
  IconDroplet,
  IconMountain,
  IconFlame,
  IconBuildingFactory,
  IconCircleDot,
  IconWaveSine,
  IconHome,
  IconQuestionMark,
  IconBottle,
  IconFish,
  IconPaw,
  IconEgg,
  IconEggs,
  IconTree,
  IconRecycle,
} from '@tabler/icons-react'

/**
 * O catálogo de categorias do mapa — as duas famílias na MESMA lista.
 *
 * Uma lista só porque `categoriaPorId` é chamada de nove telas que só têm o id
 * na mão (feed, carrossel, mosaico, ações, explorar, detalhe...). Se as
 * famílias morassem em arrays separados, cada uma dessas telas precisaria
 * decidir em qual procurar — e a que esquecesse renderizaria o ícone de
 * "outro" para uma tartaruga.
 *
 * O campo `tipo` é o que separa quando importa separar (o seletor do
 * formulário, os filtros do mapa, os contadores).
 */

export interface CategoriaInfo {
  id: CategoriaRegistro
  label: string
  /**
   * Forma curta, só para a grade de 3 colunas do seletor.
   *
   * "Vegetação preservada ou em recuperação" tem 38 caracteres; num chip de
   * ~110 px a 11,5 px isso vira cinco linhas e o card estica. O nome inteiro
   * é o que aparece em todo o resto — detalhe, título do registro, moderação,
   * carrossel —, onde há largura para ele.
   */
  curto?: string
  icone: typeof IconTrash
  cor: string
  /** A qual metade do mapa esta categoria pertence. */
  tipo: TipoRegistro
  /**
   * Publicar a coordenada exata entrega o endereço para quem quiser
   * perturbar. Aqui serve para AVISAR antes de publicar; quem de fato
   * aproxima o ponto é o gatilho da migration 0063, no banco.
   */
  sensivel?: boolean
}

/** Alertas ambientais — o que está errado. */
export const CATEGORIAS_ALERTA: CategoriaInfo[] = [
  { id: 'lixo-praia', label: 'Lixo na praia', icone: IconTrash, cor: '#E84855', tipo: 'alerta' },
  { id: 'lixo-rio', label: 'Lixo no rio', icone: IconBottle, cor: '#D64045', tipo: 'alerta' },
  { id: 'esgoto', label: 'Esgoto aparente', icone: IconDroplet, cor: '#7B8794', tipo: 'alerta' },
  { id: 'erosao', label: 'Erosão costeira', icone: IconMountain, cor: '#C17817', tipo: 'alerta' },
  { id: 'oleo', label: 'Óleo ou substância', icone: IconCircleDot, cor: '#3D3D3D', tipo: 'alerta' },
  { id: 'animal', label: 'Animal morto/encalhado', icone: IconFish, cor: '#5B8C5A', tipo: 'alerta' },
  { id: 'entulho', label: 'Entulho', icone: IconBuildingFactory, cor: '#9B6B4D', tipo: 'alerta' },
  { id: 'microplasticos', label: 'Microplásticos', icone: IconCircleDot, cor: '#B266B2', tipo: 'alerta' },
  { id: 'espuma', label: 'Espuma / mau cheiro', icone: IconWaveSine, cor: '#5E8C61', tipo: 'alerta' },
  { id: 'queimada', label: 'Queimada', icone: IconFlame, cor: '#FF6B35', tipo: 'alerta' },
  { id: 'ocupacao', label: 'Ocupação irregular', icone: IconHome, cor: '#8B6914', tipo: 'alerta' },
  { id: 'outro', label: 'Outro impacto', icone: IconQuestionMark, cor: '#6B7280', tipo: 'alerta' },
]

/**
 * Registros positivos — o que está indo bem.
 *
 * As cores ficam todas na faixa verde/petróleo/dourado, longe dos vermelhos e
 * cinzas dos alertas: no mapa, a família se lê antes da legenda.
 */
export const CATEGORIAS_POSITIVAS: CategoriaInfo[] = [
  { id: 'fauna-avistada', label: 'Fauna avistada', icone: IconPaw, cor: '#2E9B6B', tipo: 'positivo' },
  { id: 'area-desova', label: 'Área de desova', icone: IconEgg, cor: '#E0A82E', tipo: 'positivo', sensivel: true },
  { id: 'filhotes', label: 'Filhotes avistados', icone: IconEggs, cor: '#7AA93C', tipo: 'positivo', sensivel: true },
  { id: 'vegetacao-recuperacao', label: 'Vegetação preservada ou em recuperação', curto: 'Vegetação preservada', icone: IconTree, cor: '#15803D', tipo: 'positivo' },
  { id: 'coleta-seletiva', label: 'Ponto de coleta seletiva', icone: IconRecycle, cor: '#0E9AA7', tipo: 'positivo' },
]

export const CATEGORIAS: CategoriaInfo[] = [...CATEGORIAS_ALERTA, ...CATEGORIAS_POSITIVAS]

/** A gaveta de "não sei classificar". Também é o fallback de id desconhecido. */
const DESCONHECIDA = CATEGORIAS_ALERTA[CATEGORIAS_ALERTA.length - 1]

/**
 * Categoria por id, com fallback explícito.
 *
 * O fallback era `CATEGORIAS[CATEGORIAS.length - 1]`, que valia enquanto
 * "Outro impacto" fosse o último da lista. Com os positivos no fim, uma
 * categoria desconhecida viraria "Ponto de coleta seletiva" — um alerta
 * antigo de categoria removida apareceria como boa notícia.
 */
export function categoriaPorId(id: CategoriaRegistro | string): CategoriaInfo {
  return CATEGORIAS.find((c) => c.id === id) ?? DESCONHECIDA
}

/** A qual família um id pertence. Id desconhecido cai em 'alerta'. */
export function tipoDaCategoria(id: CategoriaRegistro | string): TipoRegistro {
  return categoriaPorId(id).tipo
}

/** Este registro tem a localização protegida? */
export function categoriaSensivel(id: CategoriaRegistro | string): boolean {
  return categoriaPorId(id).sensivel === true
}

export function SeletorCategoria({
  selecionada,
  onSelecionar,
  tipo = 'alerta',
}: {
  selecionada?: CategoriaRegistro
  onSelecionar: (cat: CategoriaRegistro) => void
  /** Qual família mostrar. O formulário escolhe antes de chegar aqui. */
  tipo?: TipoRegistro
}) {
  const lista = tipo === 'positivo' ? CATEGORIAS_POSITIVAS : CATEGORIAS_ALERTA
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
      {lista.map((cat) => {
        const ativa = selecionada === cat.id
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelecionar(cat.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              padding: '14px 8px',
              borderRadius: 14,
              border: ativa ? `2px solid ${cat.cor}` : '2px solid var(--line)',
              background: ativa ? `${cat.cor}15` : 'var(--card)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all .15s',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: ativa ? cat.cor : 'var(--cinza)',
                color: ativa ? '#fff' : cat.cor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all .15s',
              }}
            >
              <cat.icone size={22} stroke={2} />
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)', textAlign: 'center', lineHeight: 1.2 }}>
              {cat.curto ?? cat.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
