import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { IconCamera, IconAlertTriangle, IconShare, IconStar } from '@tabler/icons-react'
import { Header } from '../components/Header'
import { ForecastStrip } from '../components/ForecastStrip'
import { TideScrubTimeline, compartilharPico } from '../components/TideScrubTimeline'
import { carregarPico, carregarAmeacas } from '../services/picos'
import { carregarFavoritos, toggleFavorito } from '../services/favoritos'
import { carregarFeed } from '../services/feed'
import { buscarForecast } from '../services/forecast'
import { rotuloFase } from '../lib/tide'
import { tideProvider } from '../services/tide/provider'
import { rotularCondicao } from '../lib/surf'
import type { Alerta, FeedDia, Forecast, Foto, Pico, PontoMare } from '../types/domain'

export function PicoPage() {
  const { picoId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const initialFotoId = searchParams.get('foto') ?? undefined
  const [pico, setPico] = useState<Pico | null | undefined>(undefined) // undefined = carregando
  const [fav, setFav] = useState(false)

  useEffect(() => {
    if (!pico) return
    void carregarFavoritos().then((f) => setFav(f.has(pico.id)))
  }, [pico])
  const [fc, setFc] = useState<Forecast | null>(null)
  const [curva, setCurva] = useState<PontoMare[]>([])
  const [curvasMultiDia, setCurvasMultiDia] = useState<Record<string, PontoMare[]>>({})
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [feed, setFeed] = useState<FeedDia | null>(null)
  const [fotosOtimistas, setFotosOtimistas] = useState<Foto[]>([])
  const [fotosHistorico, setFotosHistorico] = useState<Foto[]>([])
  const [diasComFoto, setDiasComFoto] = useState<Set<string>>(new Set())
  const diasCarregados = useRef<Set<string>>(new Set())

  useEffect(() => {
    let vivo = true
    const loadAll = async () => {
      const p = await carregarPico(picoId)
      if (vivo) setPico(p ?? null)
      const a = await carregarAmeacas()
      if (vivo) setAlertas(a.filter((x) => x.picoId === picoId))
      const f = await carregarFeed(picoId)
      if (vivo) setFeed(f)
    }
    loadAll()

    let lastFilaCount = -1
    const checkFila = async () => {
      const { pendentes } = await import('../offline/uploadQueue')
      const p = await pendentes()
      
      if (vivo) {
        const filaDoPico = p.filter(x => x.picoId === picoId && x.tipo !== 'alerta')
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
        (window as any)._unsubFila = unsub
      }
    })

    // Refresh feed when user returns to this tab (e.g. after deleting photos in admin)
    const onVisChange = () => {
      if (document.visibilityState === 'visible' && vivo) {
        carregarFeed(picoId).then(f => { if (vivo) setFeed(f) })
      }
    }
    document.addEventListener('visibilitychange', onVisChange)

    return () => {
      vivo = false
      if ((window as any)._unsubFila) (window as any)._unsubFila()
      document.removeEventListener('visibilitychange', onVisChange)
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
      // ±30 dias: maré vem da tábua oficial (cálculo local, sem rede).
      // Primeiro a janela próxima (resposta imediata), depois o resto.
      const resultado: Record<string, PontoMare[]> = {}
      const calcular = async (de: number, ate: number) => {
        for (let i = de; i <= ate; i++) {
          const d = new Date(hoje)
          d.setDate(d.getDate() + i)
          const key = d.toISOString().slice(0, 10)
          resultado[key] = await tideProvider.curvaDoDia(pico, d)
        }
        if (vivo) setCurvasMultiDia({ ...resultado })
      }
      await calcular(-3, 3)
      await calcular(-30, -4)
      await calcular(4, 30)
    }
    fetchMultiDia()
    // Quais dias dos últimos 30 têm foto? (para os pontinhos e o calendário)
    import('../services/supabase/rest').then(({ restDiasComFoto }) => {
      const de = new Date(hoje); de.setDate(de.getDate() - 30); de.setHours(0, 0, 0, 0)
      restDiasComFoto(pico.id, de, new Date()).then((ds) => vivo && setDiasComFoto(new Set(ds)))
    }).catch(() => { /* histórico é bônus: sem rede, segue só com hoje */ })
    return () => {
      vivo = false
    }
  }, [pico])

  const navigate = useNavigate()
  const [meuId, setMeuId] = useState<string | null>(null)
  useEffect(() => {
    import('../services/supabase/client').then(({ sb }) =>
      sb().auth.getSession().then(({ data }) => setMeuId(data.session?.user?.id ?? null))
    ).catch(() => {})
  }, [])

  const aoMudarDia = useCallback((diaKey: string) => {
    if (!pico) return
    const dh = new Date()
    const hojeKey = `${dh.getFullYear()}-${String(dh.getMonth() + 1).padStart(2, '0')}-${String(dh.getDate()).padStart(2, '0')}`
    if (diaKey === hojeKey || diasCarregados.current.has(diaKey)) return
    diasCarregados.current.add(diaKey)
    const [y, m, dd] = diaKey.split('-').map(Number)
    void carregarFeed(pico.id, new Date(y, m - 1, dd)).then((f) => {
      setFotosHistorico((prev) => {
        const ids = new Set(prev.map((x) => x.id))
        return [...prev, ...f.fotos.filter((x) => !ids.has(x.id))]
      })
    })
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
          <TideScrubTimeline picoId={pico.id} picoNome={pico.nome} fotos={[...(feed?.fotos ?? []), ...fotosHistorico.filter(h => !(feed?.fotos ?? []).some(ff => ff.id === h.id)), ...fotosOtimistas.filter(o => !(feed?.fotos ?? []).some(ff => ff.id === o.id))]} curva={curva} curvasMultiDia={curvasMultiDia} eventos={[]} initialFotoId={initialFotoId} diasComFoto={diasComFoto} onDiaChange={aoMudarDia} />
        </div>

        <div className="card pad">
          <span className="eyebrow">Contexto do oceano</span>
          <div className="stack" style={{ marginTop: 10 }}>
            {alertas.length === 0 && <p className="muted">Sem alertas ativos neste pico.</p>}
            {alertas.map((a) => (
              <div key={a.id} className="row">
                <span className="tag alerta"><IconAlertTriangle size={13} stroke={2.2} /> {a.status}</span>
                <span style={{ fontSize: 14 }}>{a.titulo}</span>
              </div>
            ))}
          </div>
        </div>

        {meuId && pico.criadoPor === meuId && (
          <p style={{ textAlign: 'center', margin: '2px 0 0' }}>
            <button
              onClick={async () => {
                if (!confirm(`Apagar o pico "${pico.nome}"? Ele sai do radar e do mapa, junto com as SUAS fotos dele. Se houver fotos de outras pessoas, a exclusão será bloqueada. Esta ação não pode ser desfeita.`)) return
                const { excluirPicoProprio } = await import('../services/excluirProprio')
                const ok = await excluirPicoProprio(pico.id)
                if (ok) { alert('Pico apagado.'); navigate('/') }
                else alert('Não foi possível apagar: este pico já tem fotos de outras pessoas (patrimônio da comunidade) ou houve falha de conexão. Fale com a moderação se necessário.')
              }}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12, textDecoration: 'underline', cursor: 'pointer' }}
            >
              Você reportou este pico · excluir
            </button>
          </p>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to={`/capturar?pico=${pico.id}`} className="btn full" style={{ flex: 1 }}><IconCamera size={18} stroke={2} /> Registrar</Link>
          <button
            onClick={() => setFav(toggleFavorito(pico.id))}
            className="btn outline"
            aria-label={fav ? 'Remover dos favoritos' : 'Favoritar pico'}
            style={{ flex: 0, minWidth: 56, color: fav ? '#E0A800' : undefined }}
          >
            <IconStar size={18} stroke={2} fill={fav ? '#FFD34D' : 'none'} />
          </button>
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
