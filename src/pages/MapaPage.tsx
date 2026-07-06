import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconRipple, IconAlertTriangle, IconUsers, IconCamera, IconCompass } from '@tabler/icons-react'
import { MapView } from '../map/MapView'
import { Header } from '../components/Header'
import { PainelComunidade } from '../components/PainelComunidade'
import { carregarPicos, carregarAmeacas, carregarMutiroes, carregarPicosComRelato } from '../services/picos'
import { carregarFeedGlobal } from '../services/feed'
import { useOnboarding } from '../onboarding/OnboardingContext'
import type { Alerta, Mutirao, Pico, Foto } from '../types/domain'

type Filtro = 'tudo' | 'picos' | 'alertas' | 'mutiroes'

export function MapaPage() {
  const [picos, setPicos] = useState<Pico[]>([])
  const [ativos, setAtivos] = useState<Set<string>>(new Set())
  const [fotosFeed, setFotosFeed] = useState<Foto[]>([])
  const [atividade, setAtividade] = useState<{ picoId: string; em: string }[]>([])
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [mutiroes, setMutiroes] = useState<Mutirao[]>([])
  const [filtro, setFiltro] = useState<Filtro>('tudo')
  const [soRecentes, setSoRecentes] = useState(false)
  const [sel, setSel] = useState<Pico | null>(null)
  const navigate = useNavigate()
  const { onboarded, abrir } = useOnboarding()

  useEffect(() => {
    document.body.dataset.paginaMapa = '1'
    return () => { delete document.body.dataset.paginaMapa }
  }, [])

  useEffect(() => {
    let vivo = true
    carregarPicos().then((p) => vivo && setPicos(p))
    carregarAmeacas().then((a) => vivo && setAlertas(a))
    carregarMutiroes().then((m) => vivo && setMutiroes(m))
    carregarPicosComRelato().then((ids) => vivo && setAtivos(new Set(ids)))
    carregarFeedGlobal(120).then((fs) => {
      if (!vivo) return
      setAtividade(fs.map((f) => ({ picoId: f.picoId, em: f.capturadaEm })))
      setFotosFeed(fs)
    })
    return () => {
      vivo = false
    }
  }, [])


  // Quando toggle "Só com foto recente" está ON, mostra só os picos ativos

  const numAlertas = sel ? alertas.filter((a) => a.picoId === sel.id).length : 0

  return (
    <div className="page mapa-dashboard" style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      {/* Header padrão — mesmo tamanho de todas as páginas */}
      <Header title="Mapa" sub="Explore praias, alertas e mutirões." />

      <div className="mapa-corpo">
      {/* Mapa ocupa todo espaço restante */}
      <div className="mapa-painel" style={{ flex: 1, position: 'relative', minHeight: 0, margin: '12px 12px 0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,.12)' }}>
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
          atividade={atividade}
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

      {/* Painel de inteligência — só no desktop (o mobile não muda) */}
      <aside className="mapa-intel so-desktop">
        <div className="card pad">
          <span className="eyebrow">Resumo da costa</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginTop: 10 }}>
            <ResumoItem n={picos.length} rotulo="picos" cor="var(--turq)" Icone={IconRipple} />
            <ResumoItem n={alertas.length} rotulo="alertas" cor="#E8734A" Icone={IconAlertTriangle} />
            <ResumoItem n={mutiroes.length} rotulo="mutirões" cor="#2E9B6B" Icone={IconUsers} />
            <ResumoItem n={ativos.size} rotulo="picos ativos hoje" cor="var(--turq)" Icone={IconCamera} />
          </div>
        </div>

        <PainelComunidade fotos={fotosFeed} alertas={alertas} mutiroes={mutiroes} />

        {alertas.length > 0 && (
          <div className="card pad">
            <span className="eyebrow" style={{ color: '#E8734A', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <IconAlertTriangle size={12} stroke={2} /> Alertas ativos
            </span>
            <div className="stack" style={{ marginTop: 8 }}>
              {alertas.slice(0, 4).map((a) => (
                <Link key={a.id} to={`/alerta/${a.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{a.titulo}</div>
                  <div className="muted" style={{ fontSize: 11.5 }}>{a.municipio ?? ''}{a.uf ? `/${a.uf}` : ''} · {a.gravidade ?? 'média'}</div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="card pad">
          <span className="eyebrow">Ações rápidas</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            <button className="btn acento full" onClick={() => (onboarded ? navigate('/capturar') : abrir())}>
              <IconCamera size={17} stroke={2} /> Registrar foto ou alerta
            </button>
            <Link to="/nova-acao/mutirao" className="btn outline full">
              <IconUsers size={17} stroke={2} /> Criar mutirão
            </Link>
            <Link to="/explorar" className="btn outline full">
              <IconCompass size={17} stroke={2} /> Explorar por cidade
            </Link>
          </div>
        </div>
      </aside>
      </div>
    </div>
  )
}

function ResumoItem({ n, rotulo, cor, Icone }: { n: number; rotulo: string; cor: string; Icone: typeof IconRipple }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 12 }}>
      <Icone size={18} stroke={2} color={cor} style={{ flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <div className="dado" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}>{n}</div>
        <div className="muted" style={{ fontSize: 10.5 }}>{rotulo}</div>
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
