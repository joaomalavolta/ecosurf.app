import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconSearch, IconRipple } from '@tabler/icons-react'
import { MapView } from '../map/MapView'
import { AccountMenu } from '../components/AccountMenu'
import { carregarPicos, carregarAmeacas, carregarMutiroes, carregarPicosComRelato } from '../services/picos'
import { useOnboarding } from '../onboarding/OnboardingContext'
import type { Ameaca, Mutirao, Pico } from '../types/domain'

type Filtro = 'tudo' | 'picos' | 'ameacas' | 'mutiroes'

export function MapaPage() {
  const [picos, setPicos] = useState<Pico[]>([])
  const [ativos, setAtivos] = useState<Set<string>>(new Set())
  const [ameacas, setAmeacas] = useState<Ameaca[]>([])
  const [mutiroes, setMutiroes] = useState<Mutirao[]>([])
  const [filtro, setFiltro] = useState<Filtro>('tudo')
  const [sel, setSel] = useState<Pico | null>(null)
  const navigate = useNavigate()
  const { onboarded, abrir } = useOnboarding()

  useEffect(() => {
    let vivo = true
    carregarPicos().then((p) => vivo && setPicos(p))
    carregarAmeacas().then((a) => vivo && setAmeacas(a))
    carregarMutiroes().then((m) => vivo && setMutiroes(m))
    carregarPicosComRelato().then((ids) => vivo && setAtivos(new Set(ids)))
    return () => {
      vivo = false
    }
  }, [])

  const verPicos = filtro === 'tudo' || filtro === 'picos'
  const verAmeacas = filtro === 'tudo' || filtro === 'ameacas'
  const verMutiroes = filtro === 'tudo' || filtro === 'mutiroes'
  const alertas = sel ? ameacas.filter((a) => a.picoId === sel.id).length : 0

  return (
    <div style={{ position: 'relative', height: '100dvh' }}>
      <MapView
        picos={verPicos ? picos.filter((p) => ativos.has(p.id)) : []}
        ameacas={verAmeacas ? ameacas : []}
        mutiroes={verMutiroes ? mutiroes : []}
        onSelectPico={setSel}
      />

      <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top,0px) + 12px)', left: 12, right: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <div className="card pad" style={{ padding: 12, flex: 1, minWidth: 0 }}>
          <div style={{ background: 'var(--cinza)', borderRadius: 12, padding: 11, color: 'var(--muted)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconSearch size={16} stroke={2} /> Buscar praia, pico ou ameaça
          </div>
          <div className="pills" style={{ marginTop: 10 }}>
            <Pill on={filtro === 'tudo'} onClick={() => setFiltro('tudo')}>Tudo</Pill>
            <Pill on={filtro === 'picos'} onClick={() => setFiltro('picos')}>Picos</Pill>
            <Pill on={filtro === 'ameacas'} onClick={() => setFiltro('ameacas')}>Ameaças</Pill>
            <Pill on={filtro === 'mutiroes'} onClick={() => setFiltro('mutiroes')}>Mutirões</Pill>
          </div>
        </div>
        <AccountMenu />
      </div>

      {sel && (
        <div className="sheet">
          <div className="grip" onClick={() => setSel(null)} style={{ cursor: 'pointer' }}></div>
          <div className="row">
            <div className="thumb">
              <IconRipple size={24} style={{ color: 'var(--foam)', margin: '13px' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="between">
                <h3 style={{ fontSize: 16 }}>{sel.nome}</h3>
                <span className="badge b-info">Ativo</span>
              </div>
              <div className="muted" style={{ marginTop: 2 }}>
                {sel.municipio} · {sel.uf}
                {alertas > 0 ? ` · ${alertas} alerta${alertas > 1 ? 's' : ''}` : ''}
              </div>
            </div>
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <Link to={`/pico/${sel.id}`} className="btn full" style={{ minHeight: 40, height: 40, fontSize: 13 }}>
              Abrir pico
            </Link>
            <button className="btn outline full" style={{ minHeight: 40, height: 40, fontSize: 13 }} onClick={() => (onboarded ? navigate('/capturar') : abrir())}>
              Registrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className={`pill ${on ? 'active' : ''}`} onClick={onClick} aria-pressed={on}>
      {children}
    </button>
  )
}
