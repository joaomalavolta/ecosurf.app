import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { IconCamera, IconAlertTriangle, IconShare } from '@tabler/icons-react'
import { Header } from '../components/Header'
import { ForecastStrip } from '../components/ForecastStrip'
import { TideScrubTimeline, compartilharPico } from '../components/TideScrubTimeline'
import { carregarPico, carregarAmeacas } from '../services/picos'
import { carregarFeed } from '../services/feed'
import { buscarForecast } from '../services/forecast'
import { rotuloFase } from '../lib/tide'
import { tideProvider } from '../services/tide/provider'
import { rotularCondicao } from '../lib/surf'
import type { Ameaca, FeedDia, Forecast, Foto, Pico, PontoMare } from '../types/domain'

export function PicoPage() {
  const { picoId = '' } = useParams()
  const [pico, setPico] = useState<Pico | null | undefined>(undefined) // undefined = carregando
  const [fc, setFc] = useState<Forecast | null>(null)
  const [curva, setCurva] = useState<PontoMare[]>([])
  const [curvasMultiDia, setCurvasMultiDia] = useState<Record<string, PontoMare[]>>({})
  const [ameacas, setAmeacas] = useState<Ameaca[]>([])
  const [feed, setFeed] = useState<FeedDia | null>(null)
  const [fotosOtimistas, setFotosOtimistas] = useState<Foto[]>([])

  useEffect(() => {
    let vivo = true
    const loadAll = async () => {
      const p = await carregarPico(picoId)
      if (vivo) setPico(p ?? null)
      const a = await carregarAmeacas()
      if (vivo) setAmeacas(a.filter((x) => x.picoId === picoId))
      const f = await carregarFeed(picoId)
      if (vivo) setFeed(f)
    }
    loadAll()

    let lastFilaCount = -1
    const checkFila = async () => {
      const { pendentes } = await import('../offline/uploadQueue')
      const p = await pendentes()
      
      if (vivo) {
        const filaDoPico = p.filter(x => x.picoId === picoId && x.tipo !== 'ameaca')
        const otimistas = await Promise.all(filaDoPico.map(async x => {
          let url = undefined
          if (x.blob) {
            url = URL.createObjectURL(x.blob)
          }
          return {
            id: x.id,
            picoId: x.picoId,
            autorId: 'eu',
            autorNome: 'Você',
            capturadaEm: x.capturadaEm,
            url,
            observacao: x.observacao || 'Enviando...',
            procedencia: 'no-local',
            rostosBorrados: false,
          } as Foto
        }))
        setFotosOtimistas(otimistas)
      }

      if (lastFilaCount !== -1 && p.length === 0 && p.length < lastFilaCount) {
        // queue emptied (uploads finished), refresh feed!
        const f = await carregarFeed(picoId)
        if (vivo) setFeed(f)
      }
      lastFilaCount = p.length
    }
    checkFila()
    
    import('../offline/uploadQueue').then(({ onMudanca }) => {
      const unsub = onMudanca(checkFila)
      if (!vivo) unsub()
      else {
        // hook unsub function
        // hacky way:
        (window as any)._unsubFila = unsub
      }
    })

    return () => {
      vivo = false
      if ((window as any)._unsubFila) (window as any)._unsubFila()
    }
  }, [picoId])

  useEffect(() => {
    if (!pico) return
    let vivo = true
    buscarForecast(pico).then((f) => vivo && setFc(f))
    // Buscar curvas de maré para 7 dias (-3 a +3)
    const hoje = new Date()
    tideProvider.curvaDoDia(pico, hoje).then((c) => vivo && setCurva(c))
    const fetchMultiDia = async () => {
      const resultado: Record<string, PontoMare[]> = {}
      for (let i = -3; i <= 3; i++) {
        const d = new Date(hoje)
        d.setDate(d.getDate() + i)
        const key = d.toISOString().slice(0, 10)
        resultado[key] = await tideProvider.curvaDoDia(pico, d)
      }
      if (vivo) setCurvasMultiDia(resultado)
    }
    fetchMultiDia()
    return () => {
      vivo = false
    }
  }, [pico])

  if (pico === undefined) {
    return (
      <div className="page">
        <Header title="Carregando…" sub="Buscando o pico." />
      </div>
    )
  }
  if (pico === null) {
    return (
      <div className="page">
        <Header title="Pico não encontrado" />
        <div className="page-pad">
          <Link to="/" className="btn">Voltar ao radar</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <Header title={pico.nome} sub={`${pico.praia} · ${pico.municipio}/${pico.uf}`}>
        {fc && (
          <div className="tag" style={{ marginTop: 10, background: 'rgba(255,255,255,.18)', color: '#fff' }}>
            {rotularCondicao(fc.ondaM, fc.vento.tipo)} · {rotuloFase(fc.mare.fase)}
          </div>
        )}
      </Header>

      <div className="page-pad stack">
        <div className="card pad">
          <span className="eyebrow">Condição agora</span>
          {fc ? <ForecastStrip f={fc} /> : <p className="muted">Carregando previsão…</p>}
          {fc && (
            <p className="muted" style={{ marginTop: 10 }}>
              Fonte: {fc.fonte === 'open-meteo' ? 'Open-Meteo (ao vivo)' : 'modelo local (offline)'}.
            </p>
          )}
        </div>

        <div>
          <div className="between" style={{ margin: '4px 2px 10px' }}>
            <h2 style={{ fontSize: 19 }}>Timeline do dia</h2>
            <span className="muted">{(feed?.fotos.length ?? 0) + fotosOtimistas.filter(o => !(feed?.fotos ?? []).some(ff => ff.id === o.id)).length} fotos</span>
          </div>
          {/* eventos de vento ficam vazios até derivarem do forecast real (não simular) */}
          <TideScrubTimeline picoId={pico.id} picoNome={pico.nome} fotos={[...(feed?.fotos ?? []), ...fotosOtimistas.filter(o => !(feed?.fotos ?? []).some(ff => ff.id === o.id))]} curva={curva} curvasMultiDia={curvasMultiDia} eventos={[]} />
        </div>

        <div className="card pad">
          <span className="eyebrow">Contexto do oceano</span>
          <div className="stack" style={{ marginTop: 10 }}>
            {ameacas.length === 0 && <p className="muted">Sem alertas ativos neste pico.</p>}
            {ameacas.map((a) => (
              <div key={a.id} className="row">
                <span className="tag alerta"><IconAlertTriangle size={13} stroke={2.2} /> {a.status}</span>
                <span style={{ fontSize: 14 }}>{a.titulo}</span>
              </div>
            ))}
          </div>
        </div>

        {pico.visibilidade !== 'publico' && (
          <div className="card pad" style={{ borderLeft: '4px solid var(--perigo)' }}>
            <b>Pico em abafamento</b>
            <p className="muted">A comunidade local optou por não broadcastar a atividade deste pico.</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <Link to={`/capturar?pico=${pico.id}`} className="btn full" style={{ flex: 1 }}><IconCamera size={18} stroke={2} /> Registrar</Link>
          <button
            onClick={() => compartilharPico(pico.id, pico.nome, fc ? rotularCondicao(fc.ondaM, fc.vento.tipo) : undefined)}
            className="btn outline"
            style={{ flex: 0, minWidth: 56 }}
          >
            <IconShare size={18} stroke={2} />
          </button>
        </div>
      </div>
    </div>
  )
}
