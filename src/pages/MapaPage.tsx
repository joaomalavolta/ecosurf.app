import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconSearch, IconRipple } from '@tabler/icons-react'
import { MapView } from '../map/MapView'
import { Header } from '../components/Header'
import { carregarPicos, carregarAmeacas, carregarMutiroes, carregarPicosComRelato } from '../services/picos'
import { useOnboarding } from '../onboarding/OnboardingContext'
import type { Alerta, Mutirao, Pico } from '../types/domain'

type Filtro = 'tudo' | 'picos' | 'alertas' | 'mutiroes'

export function MapaPage() {
  const [picos, setPicos] = useState<Pico[]>([])
  const [ativos, setAtivos] = useState<Set<string>>(new Set())
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [mutiroes, setMutiroes] = useState<Mutirao[]>([])
  const [filtro, setFiltro] = useState<Filtro>('tudo')
  const [sel, setSel] = useState<Pico | null>(null)
  const navigate = useNavigate()
  const { onboarded, abrir } = useOnboarding()

  useEffect(() => {
    let vivo = true
    carregarPicos().then((p) => vivo && setPicos(p))
    carregarAmeacas().then((a) => vivo && setAlertas(a))
    carregarMutiroes().then((m) => vivo && setMutiroes(m))
    carregarPicosComRelato().then((ids) => vivo && setAtivos(new Set(ids)))
    return () => {
      vivo = false
    }
  }, [])

  const verPicos = filtro === 'tudo' || filtro === 'picos'
  const verAlertas = filtro === 'tudo' || filtro === 'alertas'
  const verMutiroes = filtro === 'tudo' || filtro === 'mutiroes'
  const numAlertas = sel ? alertas.filter((a) => a.picoId === sel.id).length : 0

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      {/* Header padrão com onda */}
      <Header title="Mapa" sub="Explore praias, alertas e mutirões.">
        {/* Busca + Filtros dentro do header */}
        <div style={{ marginTop: 14 }}>
          <div style={{ background: 'rgba(255,255,255,.15)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderRadius: 12, padding: 11, color: 'rgba(255,255,255,.8)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,.2)' }}>
            <IconSearch size={16} stroke={2} /> Buscar praia, pico ou alerta
          </div>
          <div className="pills" style={{ marginTop: 10 }}>
            <Pill on={filtro === 'tudo'} onClick={() => setFiltro('tudo')}>Tudo</Pill>
            <Pill on={filtro === 'picos'} onClick={() => setFiltro('picos')}>Picos</Pill>
            <Pill on={filtro === 'alertas'} onClick={() => setFiltro('alertas')}>Alertas</Pill>
            <Pill on={filtro === 'mutiroes'} onClick={() => setFiltro('mutiroes')}>Mutirões</Pill>
          </div>
        </div>
      </Header>

      {/* Mapa ocupa todo espaço restante */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <MapView
          picos={verPicos ? picos.filter((p) => ativos.has(p.id)) : []}
          alertas={verAlertas ? alertas : []}
          mutiroes={verMutiroes ? mutiroes : []}
          onSelectPico={setSel}
        />

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
                  {numAlertas > 0 ? ` · ${numAlertas} alerta${numAlertas > 1 ? 's' : ''}` : ''}
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
