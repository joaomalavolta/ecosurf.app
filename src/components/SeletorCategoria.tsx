import type { CategoriaAlerta } from '../types/domain'
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
} from '@tabler/icons-react'

export interface CategoriaInfo {
  id: CategoriaAlerta
  label: string
  icone: typeof IconTrash
  cor: string
}

export const CATEGORIAS: CategoriaInfo[] = [
  { id: 'lixo-praia', label: 'Lixo na praia', icone: IconTrash, cor: '#E84855' },
  { id: 'lixo-rio', label: 'Lixo no rio', icone: IconBottle, cor: '#D64045' },
  { id: 'esgoto', label: 'Esgoto aparente', icone: IconDroplet, cor: '#7B8794' },
  { id: 'erosao', label: 'Erosão costeira', icone: IconMountain, cor: '#C17817' },
  { id: 'oleo', label: 'Óleo ou substância', icone: IconCircleDot, cor: '#3D3D3D' },
  { id: 'animal', label: 'Animal morto/encalhado', icone: IconFish, cor: '#5B8C5A' },
  { id: 'entulho', label: 'Entulho', icone: IconBuildingFactory, cor: '#9B6B4D' },
  { id: 'microplasticos', label: 'Microplásticos', icone: IconCircleDot, cor: '#B266B2' },
  { id: 'espuma', label: 'Espuma / mau cheiro', icone: IconWaveSine, cor: '#5E8C61' },
  { id: 'queimada', label: 'Queimada', icone: IconFlame, cor: '#FF6B35' },
  { id: 'ocupacao', label: 'Ocupação irregular', icone: IconHome, cor: '#8B6914' },
  { id: 'outro', label: 'Outro impacto', icone: IconQuestionMark, cor: '#6B7280' },
]

export function categoriaPorId(id: CategoriaAlerta): CategoriaInfo {
  return CATEGORIAS.find((c) => c.id === id) ?? CATEGORIAS[CATEGORIAS.length - 1]
}

export function SeletorCategoria({
  selecionada,
  onSelecionar,
}: {
  selecionada?: CategoriaAlerta
  onSelecionar: (cat: CategoriaAlerta) => void
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
      {CATEGORIAS.map((cat) => {
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
              {cat.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
