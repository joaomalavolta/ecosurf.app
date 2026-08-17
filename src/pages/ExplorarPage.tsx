import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconChevronRight, IconArrowLeft, IconCamera, IconAlertTriangle, IconUsers, IconRipple, IconSearch, IconX, IconPhoto, IconPaw } from '@tabler/icons-react'
import { Header } from '../components/Header'
import { carregarPicos, carregarAmeacas, carregarMutiroes } from '../services/picos'
import { carregarFeedGlobal } from '../services/feed'
import { restPicosStats } from '../services/supabase/rest'
import { categoriaPorId } from '../components/SeletorCategoria'
import { NovosSurfistas } from '../components/NovosSurfistas'
import type { Pico, Alerta, Mutirao, Foto } from '../types/domain'

/**
 * Explorar (opção B da navegação territorial): o diretório do litoral.
 * Estados → cidades → picos, cada nível com o pulso da região (fotos hoje,
 * alertas ativos, mutirões). Nasce modesto — cresce junto com a rede.
 */
export function ExplorarPage() {
  const [picos, setPicos] = useState<Pico[]>([])
  const [registros, setRegistros] = useState<Alerta[]>([])
  const [mutiroes, setMutiroes] = useState<Mutirao[]>([])
  const [fotos, setFotos] = useState<Foto[]>([])
  const [uf, setUf] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get('uf'))
  const [cidade, setCidade] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get('cidade'))
  const [busca, setBusca] = useState('')
  const [statsPicos, setStatsPicos] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    let vivo = true
    carregarPicos().then((p) => vivo && setPicos(p))
    carregarAmeacas().then((a) => vivo && setRegistros(a))
    carregarMutiroes().then((m) => vivo && setMutiroes(m))
    carregarFeedGlobal(120).then((f) => vivo && setFotos(f))
    restPicosStats().then((s) => vivo && setStatsPicos(s))
    return () => { vivo = false }
  }, [])

  // `registros` é a lista inteira e serve para DESCOBRIR território: uma
  // cidade que só tem registros positivos precisa aparecer na busca e na
  // lista de cidades igual a qualquer outra. Já contar e listar usa a
  // separação — "3 alertas" numa cidade que tem 3 tartarugas seria falso.
  const alertas = useMemo(() => registros.filter((r) => r.tipoRegistro !== 'positivo'), [registros])
  const positivos = useMemo(() => registros.filter((r) => r.tipoRegistro === 'positivo'), [registros])

  const hojeKey = new Date().toDateString()
  const fotosHoje = useMemo(() => fotos.filter((f) => new Date(f.capturadaEm).toDateString() === hojeKey), [fotos, hojeKey])

  // Busca por texto: acha picos e cidades pelo nome (sem acento-sensível
  // demais: normaliza os dois lados). É o refinamento que faltava — antes o
  // diretório só navegava por níveis.
  const norm = (s: string) =>
    [...s.normalize('NFD')].filter((c) => c.charCodeAt(0) < 0x300 || c.charCodeAt(0) > 0x36f).join('').toLowerCase()

  // Cidade/UF entram aqui como texto livre dos formulários. Um espaço
  // sobrando fazia "Itanhaém " virar uma cidade separada de "Itanhaém" na
  // lista — então tudo que agrupa ou compara território passa por aqui.
  const terr = (s?: string | null) => (s ?? '').trim()

  const resultados = useMemo(() => {
    const q = norm(busca.trim())
    if (q.length < 2) return null
    const picosHit = picos
      .filter((p) => norm(p.nome).includes(q) || norm(p.praia ?? '').includes(q))
      .slice(0, 8)
    const cidadesSet = new Map<string, string>() // cidade -> uf
    picos.forEach((p) => { if (norm(p.municipio).includes(q)) cidadesSet.set(terr(p.municipio), terr(p.uf)) })
    registros.forEach((a) => { if (a.municipio && norm(a.municipio).includes(q)) cidadesSet.set(terr(a.municipio), terr(a.uf)) })
    return { picos: picosHit, cidades: [...cidadesSet.entries()].slice(0, 6) }
  }, [busca, picos, registros])

  // Alertas por tipo (categoria) dentro de um filtro territorial
  const alertasPorTipo = (filtro: (m: string, u: string) => boolean) => {
    const mapa = new Map<Alerta['categoria'], number>()
    alertas.filter((a) => filtro(terr(a.municipio), terr(a.uf))).forEach((a) => {
      mapa.set(a.categoria, (mapa.get(a.categoria) ?? 0) + 1)
    })
    return [...mapa.entries()].sort((a, b) => b[1] - a[1])
  }

  // pulso por chave territorial (uf ou uf+cidade)
  const pulso = (filtro: (municipio: string, ufX: string) => boolean) => {
    const ps = picos.filter((p) => filtro(terr(p.municipio), terr(p.uf)))
    const idsPicos = new Set(ps.map((p) => p.id))
    return {
      picos: ps.length,
      fotosHoje: fotosHoje.filter((f) => idsPicos.has(f.picoId)).length,
      alertas: alertas.filter((a) => filtro(terr(a.municipio), terr(a.uf))).length,
      positivos: positivos.filter((a) => filtro(terr(a.municipio), terr(a.uf))).length,
      mutiroes: mutiroes.filter((m) => filtro(terr(m.municipio), terr(m.uf))).length,
    }
  }

  const ufs = useMemo(() => {
    const s = new Set<string>()
    picos.forEach((p) => s.add(terr(p.uf)))
    registros.forEach((a) => a.uf && s.add(terr(a.uf)))
    mutiroes.forEach((m) => s.add(terr(m.uf)))
    return [...s].filter(Boolean).sort()
  }, [picos, registros, mutiroes])

  const cidades = useMemo(() => {
    if (!uf) return []
    const s = new Set<string>()
    picos.filter((p) => terr(p.uf) === uf).forEach((p) => s.add(terr(p.municipio)))
    registros.filter((a) => terr(a.uf) === uf && terr(a.municipio)).forEach((a) => s.add(terr(a.municipio)))
    mutiroes.filter((m) => terr(m.uf) === uf).forEach((m) => s.add(terr(m.municipio)))
    return [...s].filter(Boolean).sort()
  }, [uf, picos, registros, mutiroes])

  const Contadores = ({ p }: { p: { picos: number; fotosHoje: number; alertas: number; positivos: number; mutiroes: number } }) => (
    <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <span className="dado" title="Picos registrados" style={{ fontSize: 11, color: p.picos ? 'var(--turq)' : 'var(--muted)', display: 'flex', gap: 3, alignItems: 'center' }}><IconRipple size={12} stroke={2} /> {p.picos}</span>
      <span className="dado" style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 3, alignItems: 'center' }}><IconCamera size={12} stroke={2} /> {p.fotosHoje}</span>
      <span className="dado" style={{ fontSize: 11, color: p.alertas ? '#E8734A' : 'var(--muted)', display: 'flex', gap: 3, alignItems: 'center' }}><IconAlertTriangle size={12} stroke={2} /> {p.alertas}</span>
      <span className="dado" title="Registros positivos" style={{ fontSize: 11, color: p.positivos ? '#2E9B6B' : 'var(--muted)', display: 'flex', gap: 3, alignItems: 'center' }}><IconPaw size={12} stroke={2} /> {p.positivos}</span>
      <span className="dado" style={{ fontSize: 11, color: p.mutiroes ? '#FF8C42' : 'var(--muted)', display: 'flex', gap: 3, alignItems: 'center' }}><IconUsers size={12} stroke={2} /> {p.mutiroes}</span>
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

        {/* Busca por pico ou cidade */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <IconSearch size={17} stroke={2} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
          <input
            className="input"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar pico ou cidade…"
            style={{ paddingLeft: 40, paddingRight: busca ? 40 : 14 }}
            aria-label="Buscar pico ou cidade"
          />
          {busca && (
            <button
              onClick={() => setBusca('')}
              aria-label="Limpar busca"
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 6 }}
            >
              <IconX size={16} stroke={2} />
            </button>
          )}
        </div>

        {!uf && !cidade && !resultados && <NovosSurfistas />}

        {resultados && (
          <div className="card" style={{ overflow: 'hidden', marginBottom: 12 }}>
            {resultados.cidades.length === 0 && resultados.picos.length === 0 && (
              <p className="muted" style={{ padding: '14px 16px', fontSize: 13.5, margin: 0 }}>
                Nada encontrado para “{busca.trim()}”. Tente outro nome — ou registre esse pico você mesmo!
              </p>
            )}
            {resultados.cidades.map(([c, u]) => (
              <button key={`c-${c}`} style={linha} onClick={() => { setUf(u); setCidade(c); setBusca('') }}>
                <span>
                  <span style={{ fontWeight: 600, display: 'block' }}>{c}</span>
                  <span className="muted" style={{ fontSize: 12 }}>Cidade · {u}</span>
                </span>
                <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <Contadores p={pulso((m, ufX) => ufX === u && m === c)} />
                  <IconChevronRight size={16} stroke={2} style={{ color: 'var(--muted)' }} />
                </span>
              </button>
            ))}
            {resultados.picos.map((p) => (
              <Link key={`p-${p.id}`} to={`/pico/${p.id}`} style={linha}>
                <span>
                  <span style={{ fontWeight: 600, display: 'block' }}>{p.nome}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{p.municipio}/{p.uf}{p.praia ? ` · ${p.praia}` : ''}</span>
                </span>
                <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="dado" style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 3, alignItems: 'center' }}>
                    <IconPhoto size={12} stroke={2} /> {statsPicos.get(p.id) ?? 0}
                  </span>
                  <IconChevronRight size={16} stroke={2} style={{ color: 'var(--muted)' }} />
                </span>
              </Link>
            ))}
          </div>
        )}

        <div className="card" style={{ overflow: 'hidden', display: resultados ? 'none' : undefined }}>
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
          {uf && cidade && picos.filter((p) => terr(p.uf) === uf && terr(p.municipio) === cidade).map((p) => {
            const fotosDoPico = fotosHoje.filter((f) => f.picoId === p.id).length
            return (
              <Link key={p.id} to={`/pico/${p.id}`} style={linha}>
                <span>
                  <span style={{ fontWeight: 600, display: 'block' }}>{p.nome}</span>
                  {p.praia && <span className="muted" style={{ fontSize: 12 }}>{p.praia}</span>}
                </span>
                <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {fotosDoPico > 0 && <span className="badge b-good" style={{ fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconCamera size={11} stroke={2} /> {fotosDoPico} hoje</span>}
                  <span className="dado" title="Fotos no acervo" style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 3, alignItems: 'center' }}>
                    <IconPhoto size={12} stroke={2} /> {statsPicos.get(p.id) ?? 0}
                  </span>
                  <IconChevronRight size={16} stroke={2} style={{ color: 'var(--muted)' }} />
                </span>
              </Link>
            )
          })}
        </div>

        {/* Alertas, registros positivos e mutirões da cidade selecionada */}
        {uf && cidade && (
          <>
            {alertas.filter((a) => terr(a.uf) === uf && terr(a.municipio) === cidade).length > 0 && (
              <div className="card pad" style={{ marginTop: 12 }}>
                <span className="eyebrow" style={{ color: '#E8734A', display: 'inline-flex', alignItems: 'center', gap: 5 }}><IconAlertTriangle size={12} stroke={2} /> Alertas ativos</span>
                {/* Refinamento: a cidade contada por TIPO de ocorrência */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {alertasPorTipo((m, u) => u === uf && m === cidade).map(([cat, n]) => {
                    const info = categoriaPorId(cat)
                    const Icone = info.icone
                    return (
                      <span key={cat} className="badge" style={{ fontSize: 10.5, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'color-mix(in srgb, #E8734A 12%, transparent)', color: '#C75A35', fontWeight: 600 }}>
                        <Icone size={11} stroke={2} /> {info.label} · {n}
                      </span>
                    )
                  })}
                </div>
                <div className="stack" style={{ marginTop: 8 }}>
                  {alertas.filter((a) => terr(a.uf) === uf && terr(a.municipio) === cidade).slice(0, 5).map((a) => (
                    <Link key={a.id} to={`/alerta/${a.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{a.titulo}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{a.gravidade ?? 'média'}</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {/* Card próprio, com a cor da família. Junto dos alertas, um
                "Fauna avistada" na moldura laranja de ocorrência seria lido
                como mais um problema da cidade. */}
            {positivos.filter((a) => terr(a.uf) === uf && terr(a.municipio) === cidade).length > 0 && (
              <div className="card pad" style={{ marginTop: 12 }}>
                <span className="eyebrow" style={{ color: '#2E9B6B', display: 'inline-flex', alignItems: 'center', gap: 5 }}><IconPaw size={12} stroke={2} /> Registros positivos</span>
                <div className="stack" style={{ marginTop: 8 }}>
                  {positivos.filter((a) => terr(a.uf) === uf && terr(a.municipio) === cidade).slice(0, 5).map((a) => {
                    const info = categoriaPorId(a.categoria)
                    return (
                      <Link key={a.id} to={`/alerta/${a.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{a.titulo}</div>
                        <div className="muted" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <info.icone size={12} stroke={2} color={info.cor} /> {info.label}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
            {mutiroes.filter((m) => terr(m.uf) === uf && terr(m.municipio) === cidade).length > 0 && (
              <div className="card pad" style={{ marginTop: 12 }}>
                <span className="eyebrow" style={{ color: '#FF8C42', display: 'inline-flex', alignItems: 'center', gap: 5 }}><IconUsers size={12} stroke={2} /> Mutirões</span>
                <div className="stack" style={{ marginTop: 8 }}>
                  {mutiroes.filter((m) => terr(m.uf) === uf && terr(m.municipio) === cidade).slice(0, 5).map((m) => (
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
