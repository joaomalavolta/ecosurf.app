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

      <div style={{ position: 'absolute', left: 12, right: 12, bottom: 'calc(var(--altura-nav) + 14px)' }}>
        {sel ? (
          <div className="card pad row">
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--azul-claro)', color: 'var(--turq)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
              <IconRipple size={26} stroke={2} />
            </div>
            <div style={{ flex: 1 }}>
              <b>{sel.nome}</b>
              <div className="muted">
                {sel.municipio}/{sel.uf} · radar ativo{alertas > 0 ? ` · ${alertas} alerta${alertas > 1 ? 's' : ''}` : ''}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <Link to={`/pico/${sel.id}`} className="btn" style={{ minHeight: 42 }}>Abrir</Link>
                <button className="btn outline" style={{ minHeight: 42 }} onClick={() => (onboarded ? navigate('/capturar') : abrir())}>
                  Registrar
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="card pad row">
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--azul-claro)', color: 'var(--turq)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
              <IconRipple size={26} stroke={2} />
            </div>
            <div style={{ flex: 1 }}>
              <b>Explore o litoral</b>
              <div className="muted">Toque num pico para ver detalhes e registrar a condição do dia.</div>
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
