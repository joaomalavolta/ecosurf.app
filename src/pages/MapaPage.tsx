import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconRipple } from '@tabler/icons-react'
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
  const [soRecentes, setSoRecentes] = useState(false)
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

  // Quando toggle "Só com foto recente" está ON, mostra só os picos ativos
  const picosNoMapa = verPicos
    ? (soRecentes ? picos.filter((p) => ativos.has(p.id)) : picos)
    : []

  const numAlertas = sel ? alertas.filter((a) => a.picoId === sel.id).length : 0

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      {/* Header padrão — mesmo tamanho de todas as páginas */}
      <Header title="Mapa" sub="Explore praias, alertas e mutirões." />

      {/* Mapa ocupa todo espaço restante */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0, margin: '12px 12px 0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,.12)' }}>
        {/* Filtros flutuantes sobre o mapa */}
        <div className="map-filter-bar">
          <Pill on={filtro === 'tudo'} onClick={() => setFiltro('tudo')}>Tudo</Pill>
          <Pill on={filtro === 'picos'} onClick={() => setFiltro('picos')}>Picos</Pill>
          <Pill on={filtro === 'alertas'} onClick={() => setFiltro('alertas')}>Alertas</Pill>
          <Pill on={filtro === 'mutiroes'} onClick={() => setFiltro('mutiroes')}>Mutirões</Pill>
        </div>

        {/* Toggle "Só com foto recente" */}
        {(filtro === 'tudo' || filtro === 'picos') && (
          <button
            onClick={() => setSoRecentes(!soRecentes)}
            style={{
              position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
              zIndex: 10, display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 20,
              background: soRecentes ? 'rgba(34,197,94,0.9)' : 'rgba(20,32,42,0.75)',
              color: '#fff', border: '1.5px solid rgba(255,255,255,0.3)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              transition: 'background .2s',
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: soRecentes ? '#fff' : '#22c55e', flexShrink: 0 }} />
            {soRecentes ? 'Só com foto recente' : 'Todos os picos'}
          </button>
        )}

        <MapView
          picos={soRecentes ? picos.filter((p) => ativos.has(p.id)) : picos}
          alertas={alertas}
          mutiroes={mutiroes}
          ativos={ativos}
          filtro={filtro}
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
                  <span className={`badge ${ativos.has(sel.id) ? 'b-success' : 'b-info'}`}>
                    {ativos.has(sel.id) ? 'Ativo' : 'Sem relato'}
                  </span>
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
