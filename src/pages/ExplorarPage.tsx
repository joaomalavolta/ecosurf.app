import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconChevronRight, IconArrowLeft, IconCamera, IconAlertTriangle, IconUsers } from '@tabler/icons-react'
import { Header } from '../components/Header'
import { carregarPicos, carregarAmeacas, carregarMutiroes } from '../services/picos'
import { carregarFeedGlobal } from '../services/feed'
import type { Pico, Alerta, Mutirao, Foto } from '../types/domain'

/**
 * Explorar (opção B da navegação territorial): o diretório do litoral.
 * Estados → cidades → picos, cada nível com o pulso da região (fotos hoje,
 * alertas ativos, mutirões). Nasce modesto — cresce junto com a rede.
 */
export function ExplorarPage() {
  const [picos, setPicos] = useState<Pico[]>([])
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [mutiroes, setMutiroes] = useState<Mutirao[]>([])
  const [fotos, setFotos] = useState<Foto[]>([])
  const [uf, setUf] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get('uf'))
  const [cidade, setCidade] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get('cidade'))

  useEffect(() => {
    let vivo = true
    carregarPicos().then((p) => vivo && setPicos(p))
    carregarAmeacas().then((a) => vivo && setAlertas(a))
    carregarMutiroes().then((m) => vivo && setMutiroes(m))
    carregarFeedGlobal(120).then((f) => vivo && setFotos(f))
    return () => { vivo = false }
  }, [])

  const hojeKey = new Date().toDateString()
  const fotosHoje = useMemo(() => fotos.filter((f) => new Date(f.capturadaEm).toDateString() === hojeKey), [fotos, hojeKey])

  // pulso por chave territorial (uf ou uf+cidade)
  const pulso = (filtro: (municipio: string, ufX: string) => boolean) => {
    const ps = picos.filter((p) => filtro(p.municipio, p.uf))
    const idsPicos = new Set(ps.map((p) => p.id))
    return {
      picos: ps.length,
      fotosHoje: fotosHoje.filter((f) => idsPicos.has(f.picoId)).length,
      alertas: alertas.filter((a) => filtro(a.municipio ?? '', a.uf ?? '')).length,
      mutiroes: mutiroes.filter((m) => filtro(m.municipio, m.uf)).length,
    }
  }

  const ufs = useMemo(() => {
    const s = new Set<string>()
    picos.forEach((p) => s.add(p.uf))
    alertas.forEach((a) => a.uf && s.add(a.uf))
    mutiroes.forEach((m) => s.add(m.uf))
    return [...s].sort()
  }, [picos, alertas, mutiroes])

  const cidades = useMemo(() => {
    if (!uf) return []
    const s = new Set<string>()
    picos.filter((p) => p.uf === uf).forEach((p) => s.add(p.municipio))
    alertas.filter((a) => a.uf === uf && a.municipio).forEach((a) => s.add(a.municipio!))
    mutiroes.filter((m) => m.uf === uf).forEach((m) => s.add(m.municipio))
    return [...s].sort()
  }, [uf, picos, alertas, mutiroes])

  const Contadores = ({ p }: { p: { picos: number; fotosHoje: number; alertas: number; mutiroes: number } }) => (
    <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <span className="dado" style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 3, alignItems: 'center' }}><IconCamera size={12} stroke={2} /> {p.fotosHoje}</span>
      <span className="dado" style={{ fontSize: 11, color: p.alertas ? '#E8734A' : 'var(--muted)', display: 'flex', gap: 3, alignItems: 'center' }}><IconAlertTriangle size={12} stroke={2} /> {p.alertas}</span>
      <span className="dado" style={{ fontSize: 11, color: p.mutiroes ? '#2E9B6B' : 'var(--muted)', display: 'flex', gap: 3, alignItems: 'center' }}><IconUsers size={12} stroke={2} /> {p.mutiroes}</span>
    </span>
  )

  const linha: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    padding: '13px 14px', textDecoration: 'none', color: 'inherit',
    borderBottom: '1px solid var(--line)', cursor: 'pointer',
    background: 'none', border: 'none', width: '100%', textAlign: 'left', fontSize: 15,
  }

  return (
    <div className="page">
      <Header
        title={cidade ?? (uf ?? 'Explorar')}
        sub={cidade ? `${uf} · picos e atividade da cidade` : uf ? 'Cidades com atividade' : 'O litoral por estados, cidades e picos'}
      />
      <div className="page-pad">
        {(uf || cidade) && (
          <button
            onClick={() => (cidade ? setCidade(null) : setUf(null))}
            className="btn outline"
            style={{ marginBottom: 12 }}
          >
            <IconArrowLeft size={16} stroke={2} /> {cidade ? uf : 'Estados'}
          </button>
        )}

        <div className="card" style={{ overflow: 'hidden' }}>
          {/* Nível 1: estados */}
          {!uf && ufs.map((u) => (
            <button key={u} style={linha} onClick={() => setUf(u)}>
              <span style={{ fontWeight: 600 }}>{u}</span>
              <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Contadores p={pulso((_, ufX) => ufX === u)} />
                <IconChevronRight size={16} stroke={2} style={{ color: 'var(--muted)' }} />
              </span>
            </button>
          ))}

          {/* Nível 2: cidades do estado */}
          {uf && !cidade && cidades.map((c) => (
            <button key={c} style={linha} onClick={() => setCidade(c)}>
              <span style={{ fontWeight: 600 }}>{c}</span>
              <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Contadores p={pulso((m, ufX) => ufX === uf && m === c)} />
                <IconChevronRight size={16} stroke={2} style={{ color: 'var(--muted)' }} />
              </span>
            </button>
          ))}

          {/* Nível 3: picos da cidade */}
          {uf && cidade && picos.filter((p) => p.uf === uf && p.municipio === cidade).map((p) => {
            const fotosDoPico = fotosHoje.filter((f) => f.picoId === p.id).length
            return (
              <Link key={p.id} to={`/pico/${p.id}`} style={linha}>
                <span>
                  <span style={{ fontWeight: 600, display: 'block' }}>{p.nome}</span>
                  {p.praia && <span className="muted" style={{ fontSize: 12 }}>{p.praia}</span>}
                </span>
                <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {fotosDoPico > 0 && <span className="badge b-good" style={{ fontSize: 10 }}>📷 {fotosDoPico} hoje</span>}
                  <IconChevronRight size={16} stroke={2} style={{ color: 'var(--muted)' }} />
                </span>
              </Link>
            )
          })}
        </div>

        {/* Alertas e mutirões da cidade selecionada */}
        {uf && cidade && (
          <>
            {alertas.filter((a) => a.uf === uf && a.municipio === cidade).length > 0 && (
              <div className="card pad" style={{ marginTop: 12 }}>
                <span className="eyebrow" style={{ color: '#E8734A' }}>⚠️ Alertas ativos</span>
                <div className="stack" style={{ marginTop: 8 }}>
                  {alertas.filter((a) => a.uf === uf && a.municipio === cidade).slice(0, 5).map((a) => (
                    <Link key={a.id} to={`/alerta/${a.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{a.titulo}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{a.gravidade ?? 'média'}</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {mutiroes.filter((m) => m.uf === uf && m.municipio === cidade).length > 0 && (
              <div className="card pad" style={{ marginTop: 12 }}>
                <span className="eyebrow" style={{ color: '#2E9B6B' }}>🤝 Mutirões</span>
                <div className="stack" style={{ marginTop: 8 }}>
                  {mutiroes.filter((m) => m.uf === uf && m.municipio === cidade).slice(0, 5).map((m) => (
                    <Link key={m.id} to={`/mutirao/${m.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{m.titulo}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{m.quando}{m.horario ? ` · ${m.horario}` : ''}</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <p className="muted" style={{ textAlign: 'center', padding: '14px 16px', fontSize: 12 }}>
          O diretório cresce com a comunidade: cada pico, alerta ou mutirão registrado acende sua cidade aqui.
        </p>
      </div>
    </div>
  )
}
