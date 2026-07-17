import { useState, useEffect, useMemo } from 'react'
import { toast } from '../lib/toast'
import { carregarPicos } from '../services/picos'
import type { Pico } from '../types/domain'
import { Link, useNavigate } from 'react-router-dom'
import { IconAlertTriangle, IconRipple, IconChevronRight, IconCheck, IconMapPin, IconBeach } from '@tabler/icons-react'
import { Header } from '../components/Header'
import { MapaPickerLazy as MapaPicker } from '../components/MapasLazy'
import { statusPerfil } from '../services/perfil'

const FUNDOS = [
  { id: 'areia', label: 'Areia' },
  { id: 'pedra', label: 'Pedra / Laje' },
  { id: 'coral', label: 'Coral' },
  { id: 'misto', label: 'Misto' },
]

/** Distância em km entre dois pontos (mesma fórmula da captura). */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

function obterCoords(): Promise<{ lat?: number; lng?: number }> {
  return new Promise((res) => {
    if (!navigator.geolocation) return res({})
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => res({}),
      { enableHighAccuracy: true, timeout: 5000 },
    )
  })
}

export function FormularioPicoPage() {
  const navigate = useNavigate()
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [picoId, setPicoId] = useState('')

  // Campos
  const [nome, setNome] = useState('')
  const [municipio, setMunicipio] = useState('')
  const [uf, setUf] = useState('')
  const [lat, setLat] = useState<number | undefined>()
  const [lng, setLng] = useState<number | undefined>()
  const [fundo, setFundo] = useState('areia')
  const [descricao, setDescricao] = useState('')
  const [picos, setPicos] = useState<Pico[]>([])

  useEffect(() => {
    statusPerfil().then((s) => {
      if (!s.sessao) {
        toast('Faça login para cadastrar um pico.')
        navigate('/perfil', { replace: true })
      }
    })
  }, [navigate])

  useEffect(() => {
    if (!lat) {
      obterCoords().then((pos) => {
        if (pos.lat) setLat(pos.lat)
        if (pos.lng) setLng(pos.lng)
      })
    }
  }, [lat])

  useEffect(() => {
    carregarPicos().then(setPicos).catch(() => { /* sem lista: o banco ainda barra duplicata */ })
  }, [])

  // Picos a até 300 m do ponto escolhido. Esta é a SEGUNDA porta de criação de
  // pico (a primeira é a câmera) — sem este aviso, ela recriaria as duplicatas
  // que acabamos de mesclar, e o autor só veria um erro seco do servidor.
  const vizinhos = useMemo(() => {
    if (!lat || !lng) return []
    return picos
      .map((p) => ({ pico: p, metros: Math.round(haversineKm(lat, lng, p.lat, p.lng) * 1000) }))
      .filter((v) => v.metros <= 300)
      .sort((a, b) => a.metros - b.metros)
      .slice(0, 3)
  }, [lat, lng, picos])

  function podePublicar(): boolean {
    return nome.trim().length > 2 && municipio.trim().length > 0 && uf.trim().length === 2
  }

  async function publicar() {
    if (!lat || !lng) {
      toast('Selecione a localização no mapa.')
      return
    }
    setEnviando(true)
    try {
      const { restInserirPico } = await import('../services/supabase/rest')
      const id = await restInserirPico({
        nome: nome.trim(),
        lat,
        lng,
        municipio: municipio.trim(),
        uf: uf.toUpperCase(),
      })

      // Atualizar fundo se diferente do padrão
      if (fundo !== 'areia') {
        const { sb } = await import('../services/supabase/client')
        await sb().from('picos').update({ fundo }).eq('id', id)
      }

      setPicoId(id)
      setSucesso(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'desconhecido'
      // O servidor barra nome-eco a menos de 600 m. A mensagem já vem em
      // português dizendo qual pico usar — repassamos sem o prefixo técnico.
      if (msg.includes('PICO_DUPLICADO')) {
        toast(msg.replace(/^.*PICO_DUPLICADO:\s*/, ''))
      } else {
        toast(`Erro: ${msg}`)
      }
    } finally {
      setEnviando(false)
    }
  }

  if (sucesso) {
    return (
      <div className="page">
        <Header title="Pico cadastrado!" sub="O novo pico está disponível para todos." />
        <div className="page-pad stack" style={{ textAlign: 'center', paddingTop: 40 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(30,203,195,0.15)', color: '#1ECBC3', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
            <IconCheck size={36} stroke={2} />
          </div>
          <h2 style={{ fontSize: 20, marginTop: 16 }}>{nome.trim()}</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.5, marginTop: 8 }}>
            O pico foi adicionado ao mapa e já está disponível para a comunidade registrar fotos, reports e alertas.
          </p>
          <button className="btn acento full" style={{ marginTop: 24 }} onClick={() => navigate(`/pico/${picoId}`)}>
            Ver pico no app
          </button>
          <button className="btn outline full" style={{ marginTop: 8 }} onClick={() => navigate('/mapa')}>
            Ver no mapa
          </button>
          <button className="btn outline full" style={{ marginTop: 8 }} onClick={() => navigate('/acoes')}>
            Voltar às ações
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <Header title="Novo Pico de Surf" sub="Cadastre uma praia, costão ou área de surf que ainda não está no mapa." />

      <div className="page-pad stack" style={{ paddingTop: 16, paddingBottom: 100, gap: 16 }}>
        {/* Nome */}
        <div>
          <label className="form-label">Nome da praia / pico *</label>
          <input
            className="input"
            placeholder="Ex: Praia do Tombo, Pico da Laje..."
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>

        {/* Local */}
        <fieldset style={{ border: '1px solid var(--line)', borderRadius: 14, padding: 14, margin: 0 }}>
          <legend style={{ fontSize: 14, fontWeight: 700, padding: '0 8px' }}><IconMapPin size={14} stroke={2} style={{ verticalAlign: '-2px' }} /> Localização</legend>

          <MapaPicker
            lat={lat}
            lng={lng}
            height={200}
            onChange={(newLat, newLng) => {
              setLat(newLat)
              setLng(newLng)
              // Geocodificação reversa para preencher cidade/UF
              fetch(`https://nominatim.openstreetmap.org/reverse?email=ecosurf%40ecosurf.org.br&lat=${newLat}&lon=${newLng}&format=json&zoom=10`, {
                headers: { 'Accept-Language': 'pt-BR' },
              })
                .then((r) => r.json())
                .then((geo) => {
                  const city = geo.address?.city || geo.address?.town || geo.address?.village || geo.address?.municipality || ''
                  const state = geo.address?.state_code?.toUpperCase() || geo.address?.['ISO3166-2-lvl4']?.split('-')[1] || ''
                  if (city && !municipio) setMunicipio(city)
                  if (state && !uf) setUf(state)
                })
                .catch(() => {})
            }}
          />
          {lat && lng && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
              <IconMapPin size={12} stroke={2} style={{ verticalAlign: -2, marginRight: 4 }} />
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </div>
          )}

          {/* Já existe pico aqui? Mostrar ANTES de cadastrar outro. */}
          {vizinhos.length > 0 && (
            <div style={{
              marginTop: 10, padding: '11px 12px', borderRadius: 12,
              background: 'color-mix(in srgb, #E8734A 10%, transparent)',
              border: '1px solid color-mix(in srgb, #E8734A 32%, transparent)',
            }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                <IconAlertTriangle size={16} stroke={2} style={{ color: '#C75A35', flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12.5, lineHeight: 1.45 }}>
                  {vizinhos.length === 1
                    ? 'Já existe um pico cadastrado bem aqui. Confira se não é o mesmo:'
                    : 'Já existem picos cadastrados bem aqui. Confira se não é um destes:'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {vizinhos.map(({ pico, metros }) => (
                  <Link
                    key={pico.id}
                    to={`/pico/${pico.id}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 10px', borderRadius: 9,
                      background: 'var(--card)', border: '1px solid var(--line)',
                      textDecoration: 'none', color: 'inherit',
                    }}
                  >
                    <IconRipple size={15} stroke={2} style={{ color: 'var(--turq)', flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 600, fontSize: 13.5, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {pico.nome}
                      </span>
                      <span className="muted" style={{ fontSize: 10.5 }}>a {metros} m — abrir este pico</span>
                    </span>
                    <IconChevronRight size={15} stroke={2} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <div style={{ flex: 2 }}>
              <label className="form-label">Cidade *</label>
              <input className="input" placeholder="Guarujá" value={municipio} onChange={(e) => setMunicipio(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">UF *</label>
              <input className="input" placeholder="SP" maxLength={2} value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} />
            </div>
          </div>
        </fieldset>

        {/* Tipo de fundo */}
        <fieldset style={{ border: '1px solid var(--line)', borderRadius: 14, padding: 14, margin: 0 }}>
          <legend style={{ fontSize: 14, fontWeight: 700, padding: '0 8px' }}>🏄 Características</legend>
          <div>
            <label className="form-label">Tipo de fundo</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {FUNDOS.map((f) => (
                <button
                  key={f.id}
                  className={`pill ${fundo === f.id ? 'active' : ''}`}
                  onClick={() => setFundo(f.id)}
                  type="button"
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label className="form-label">Descrição do pico (opcional)</label>
            <textarea
              className="input"
              placeholder="Ondas consistentes, costão direito, funciona no sul..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              style={{ minHeight: 70, resize: 'vertical' }}
            />
          </div>
        </fieldset>
      </div>

      {/* Barra fixa */}
      <div style={{
        position: 'fixed',
        bottom: 'calc(var(--altura-nav) + env(safe-area-inset-bottom, 0px))',
        left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 'var(--largura-app)',
        padding: '12px 18px',
        background: 'var(--bg)',
        borderTop: '1px solid var(--line)',
        display: 'flex',
        gap: 10,
        zIndex: 40,
      }}>
        <button className="btn acento full" disabled={!podePublicar() || enviando} onClick={publicar}>
          {enviando ? 'Cadastrando...' : <><IconBeach size={16} stroke={2} /> Cadastrar Pico</>}
        </button>
      </div>
    </div>
  )
}
