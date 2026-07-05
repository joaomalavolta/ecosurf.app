import { useState, useEffect } from 'react'
import { toast } from '../lib/toast'
import { useNavigate } from 'react-router-dom'
import { IconCheck, IconMapPin, IconBeach, IconWaveSine } from '@tabler/icons-react'
import { Header } from '../components/Header'
import { MapaPicker } from '../components/MapaPicker'
import { statusPerfil } from '../services/perfil'

const FUNDOS = [
  { id: 'areia', label: 'Areia' },
  { id: 'pedra', label: 'Pedra / Laje' },
  { id: 'coral', label: 'Coral' },
  { id: 'misto', label: 'Misto' },
]

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
      toast(`Erro: ${e instanceof Error ? e.message : 'desconhecido'}`)
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
              fetch(`https://nominatim.openstreetmap.org/reverse?lat=${newLat}&lon=${newLng}&format=json&zoom=10`, {
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
