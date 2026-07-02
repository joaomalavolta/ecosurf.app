import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePinchZoom } from '../hooks/usePinchZoom'
import {
  IconX,
  IconCamera,
  IconMapPin,
  IconRipple,
  IconAlertTriangle,
  IconTrash,
  IconCheck,
  IconPhoto,
  IconCurrentLocation,
  IconMap2,
} from '@tabler/icons-react'
import { enfileirar, definirTipo } from '../offline/uploadQueue'
import { statusPerfil } from '../services/perfil'

type TipoRegistro = 'report' | 'alerta' | 'lixo'
type Etapa = 'tipo' | 'localizacao' | 'camera' | 'selecionar-pico' | 'concluido'

function obterCoords(): Promise<{ lat?: number; lng?: number }> {
  return new Promise((res) => {
    if (!navigator.geolocation) return res({})
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => res({}),
      { enableHighAccuracy: true, timeout: 6000 },
    )
  })
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const TIPOS: { id: TipoRegistro; icone: typeof IconRipple; titulo: string; desc: string; cor: string }[] = [
  { id: 'report', icone: IconRipple, titulo: 'Report do mar', desc: 'Registro das condições de surf agora', cor: '#1ECBC3' },
  { id: 'alerta', icone: IconAlertTriangle, titulo: 'Alerta ambiental', desc: 'Esgoto, erosão, obra, poluição, óleo', cor: '#E84855' },
  { id: 'lixo', icone: IconTrash, titulo: 'Lixo na praia', desc: 'Resíduo na praia ou no mar', cor: '#FF8C42' },
]

export function CapturePage() {
  const [etapa, setEtapa] = useState<Etapa>('tipo')
  const [tipo, setTipo] = useState<TipoRegistro | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const cameraBoxRef = useRef<HTMLDivElement>(null)
  const uploadId = useRef<string | null>(null)
  const navigate = useNavigate()
  const [carregando, setCarregando] = useState(true)
  const [picoSelecionado] = useState<string | null>(new URLSearchParams(window.location.search).get('pico'))
  const [blobCapturado, setBlobCapturado] = useState<Blob | undefined>()
  const [thumbCapturado, setThumbCapturado] = useState<Blob | undefined>()
  const [posCapturada, setPosCapturada] = useState<{lat?: number, lng?: number}>({})
  const [novaPraiaNome, setNovaPraiaNome] = useState('')
  const [novoPicoNome, setNovoPicoNome] = useState('')
  const [novaOndaNome, setNovaOndaNome] = useState('')
  
  const [picosExistentes, setPicosExistentes] = useState<import('../types/domain').Pico[]>([])
  const [modoNovoPico, setModoNovoPico] = useState(false)
  const [picoFinal, setPicoFinal] = useState<string | null>(null)
  const [picoAutoNome, setPicoAutoNome] = useState<string | null>(null)
  const [noLocal, setNoLocal] = useState<boolean | null>(null)
  const [detectandoGps, setDetectandoGps] = useState(false)

  useEffect(() => {
    import('../services/picos').then(({ carregarPicos }) =>
      carregarPicos().then(setPicosExistentes)
    ).catch(() => { /* sem lista: o formulário de novo local cobre */ })
  }, [])

  useEffect(() => {
    let vivo = true
    statusPerfil().then((s) => {
      if (!vivo) return
      if (!s.sessao) {
        window.alert('Faça login para poder registrar.')
        navigate('/perfil', { replace: true })
      } else {
        setCarregando(false)
      }
    })
    return () => { vivo = false }
  }, [navigate])

  // Quando o user diz "sim, estou no local", detectar GPS e achar pico
  async function detectarLocalEAbrir() {
    setDetectandoGps(true)
    const pos = await obterCoords()
    setPosCapturada(pos)

    if (pos.lat && pos.lng) {
      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.lat}&lon=${pos.lng}&format=json&zoom=14`)
        const geo = await geoRes.json()
        const praiaSugerida = geo.address?.suburb || geo.address?.village || geo.address?.neighbourhood || geo.address?.city || ''
        if (praiaSugerida) setNovaPraiaNome(praiaSugerida)
      } catch { /* ignorar */ }
    }
    setDetectandoGps(false)
    abrirCamera()
  }

  async function abrirCamera() {
    setErro(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      setEtapa('camera')
    } catch {
      setErro('Câmera indisponível neste dispositivo ou permissão negada.')
      setEtapa('camera')
    }
  }

  useEffect(() => {
    if (etapa === 'camera' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [etapa])

  // Pinça para zoom na câmera (e impede o zoom-de-página que movia a tela).
  const { zoomDisponivel, zoomAtual } = usePinchZoom(cameraBoxRef, streamRef, etapa === 'camera')

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  async function disparar() {
    const v = videoRef.current
    let blob: Blob | undefined
    let thumb: Blob | undefined
    if (v && v.videoWidth > 0) {
      const { versoesDeVideo } = await import('../lib/imagem')
      const versoes = await versoesDeVideo(v)
      blob = versoes.full
      thumb = versoes.thumb
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())

    setThumbCapturado(thumb)
    setBlobCapturado(blob)

    let pos: { lat?: number; lng?: number } = {}
    if (!noLocal) {
      pos = await obterCoords()
      setPosCapturada(pos)
      if (pos.lat && pos.lng) {
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.lat}&lon=${pos.lng}&format=json&zoom=14`)
          const geo = await geoRes.json()
          const praiaSugerida = geo.address?.suburb || geo.address?.village || geo.address?.neighbourhood || geo.address?.city || ''
          if (praiaSugerida) setNovaPraiaNome(praiaSugerida)
        } catch { /* ignorar */ }
      }
    }

    // Registro iniciado na página de um pico já nasce vinculado a ele —
    // sem formulário nenhum (o parâmetro existia mas nunca era usado).
    if (picoSelecionado) {
      await finalizarUpload(picoSelecionado, blob, pos, thumb)
      return
    }
    setEtapa('selecionar-pico')
  }

  async function finalizarUpload(picoId: string, blob?: Blob, pos?: {lat?: number, lng?: number}, thumb?: Blob, picoNovo?: import('../services/api').PicoNovo) {
    const id = crypto.randomUUID()
    uploadId.current = id
    await enfileirar({
      id,
      picoId,
      capturadaEm: new Date().toISOString(),
      blob,
      thumbBlob: thumb,
      capturaLat: pos?.lat,
      capturaLng: pos?.lng,
      picoNovo,
    })
    if (tipo) await definirTipo(id, tipo)
    setPicoFinal(picoId)
    setEtapa('concluido')
  }

  async function criarNovoPico() {
    if (!novoPicoNome.trim()) return
    try {
      let municipio = ''
      let uf = 'SP'
      if (posCapturada.lat && posCapturada.lng) {
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${posCapturada.lat}&lon=${posCapturada.lng}&format=json&zoom=10`)
          const geo = await geoRes.json()
          municipio = geo.address?.city || geo.address?.town || geo.address?.village || geo.address?.municipality || ''
          uf = geo.address?.state_code?.toUpperCase() || geo.address?.['ISO3166-2-lvl4']?.split('-')[1] || 'SP'
        } catch { /* sem geocode: segue sem município, resolve no envio */ }
      }
      const nomePicoCompleto = novaOndaNome.trim()
        ? `${novoPicoNome.trim()} - ${novaOndaNome.trim()}`
        : novoPicoNome.trim()

      // Não cria o pico aqui: enfileira o registro com os dados do pico. O
      // envio (que roda pela fila offline, com retry e sync) cria o pico e sobe
      // a foto como uma unidade. Resultado: registrar funciona 100% offline.
      const { slug } = await import('../services/supabase/rest')
      const picoIdPrevisto = slug(nomePicoCompleto)
      await finalizarUpload(picoIdPrevisto, blobCapturado, posCapturada, thumbCapturado, {
        nome: nomePicoCompleto,
        lat: posCapturada.lat ?? 0,
        lng: posCapturada.lng ?? 0,
        municipio,
        uf,
        praia: novaPraiaNome.trim(),
      })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      alert('Não foi possível preparar o registro: ' + msg)
    }
  }

  if (carregando) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: 'linear-gradient(160deg,#0b3a53,#04141d)', color: '#fff' }}>
        <div className="spinner" />
      </div>
    )
  }

  const tipoInfo = tipo ? TIPOS.find(t => t.id === tipo) : null

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100dvh',
      color: '#fff', position: 'relative', overflow: 'hidden',
    }}>
      {/* Background — mesmo da Landing Page */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: "url('/wave-header.png')",
        backgroundSize: 'cover', backgroundPosition: 'center',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(4,28,48,.45) 0%, rgba(4,28,48,.62) 35%, rgba(4,28,48,.88) 100%)',
        }} />
      </div>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 0', zIndex: 10, position: 'relative' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
          <IconX size={22} stroke={2} />
        </button>
        <b>Registrar</b>
        <span style={{ width: 24 }} />
      </div>

      {/* ETAPA 1: Escolher tipo */}
      {etapa === 'tipo' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 24, position: 'relative', zIndex: 1 }}>
          <h2 style={{ color: '#fff', textAlign: 'center', marginBottom: 4 }}>O que você vai registrar?</h2>
          <p style={{ color: 'rgba(255,255,255,.6)', textAlign: 'center', fontSize: 13, marginBottom: 20 }}>
            Escolha o tipo para organizar melhor o registro.
          </p>
          <div className="stack" style={{ gap: 12 }}>
            {TIPOS.map((t) => {
              const Icon = t.icone
              const selecionado = tipo === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTipo(t.id)
                    setNoLocal(null) // reset
                  }}
                  style={{
                    textAlign: 'left', width: '100%',
                    background: selecionado ? `${t.cor}25` : 'rgba(255,255,255,.06)',
                    border: selecionado ? `2px solid ${t.cor}` : '2px solid rgba(255,255,255,.1)',
                    borderRadius: 16, padding: 16, color: '#fff',
                    display: 'flex', gap: 14, alignItems: 'center', cursor: 'pointer',
                    transition: 'all .15s',
                  }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: `${t.cor}20`, color: t.cor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon size={24} stroke={2} />
                  </div>
                  <span style={{ flex: 1 }}>
                    <b style={{ fontSize: 15 }}>{t.titulo}</b>
                    <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 12, marginTop: 2 }}>{t.desc}</div>
                  </span>
                  {selecionado && <IconCheck size={20} stroke={2.5} color={t.cor} style={{ flexShrink: 0 }} />}
                </button>
              )
            })}
          </div>
          <button
            className="btn acento full"
            style={{ marginTop: 20, minHeight: 50, fontSize: 15 }}
            disabled={!tipo}
            onClick={() => setEtapa('localizacao')}
          >
            {tipo ? 'Próximo →' : 'Selecione o tipo acima'}
          </button>
        </div>
      )}

      {/* ETAPA 2: Localização */}
      {etapa === 'localizacao' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 24, position: 'relative', zIndex: 1 }}>
          {/* Tipo selecionado badge */}
          {tipoInfo && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: `${tipoInfo.cor}30`, color: tipoInfo.cor,
                borderRadius: 20, padding: '5px 16px', fontSize: 12, fontWeight: 600,
              }}>
                <tipoInfo.icone size={14} stroke={2} /> {tipoInfo.titulo}
              </span>
            </div>
          )}

          <h2 style={{ color: '#fff', textAlign: 'center', marginBottom: 6 }}>
            <IconMapPin size={24} stroke={2} style={{ verticalAlign: -4, marginRight: 6, color: '#1ECBC3' }} />
            Você está no local agora?
          </h2>
          <p style={{ color: 'rgba(255,255,255,.55)', textAlign: 'center', fontSize: 13, lineHeight: 1.5, marginBottom: 24 }}>
            Se você está na praia ou no pico, o app detecta sua posição automaticamente e já associa ao pico mais próximo.
          </p>

          {detectandoGps && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 20 }}>
              <div className="spinner" />
              <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 13, animation: 'pulse 2s ease-in-out infinite' }}>
                📍 Detectando sua localização...
              </p>
            </div>
          )}

          {!detectandoGps && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Sim — estou no local */}
              <button
                onClick={() => {
                  setNoLocal(true)
                  detectarLocalEAbrir()
                }}
                style={{
                  textAlign: 'left',
                  background: 'rgba(30,203,195,.1)',
                  border: '2px solid rgba(30,203,195,.4)',
                  borderRadius: 16, padding: 18, color: '#fff',
                  display: 'flex', gap: 14, alignItems: 'center', cursor: 'pointer',
                  transition: 'all .15s',
                }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: 'rgba(30,203,195,.2)', color: '#1ECBC3',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <IconCurrentLocation size={26} stroke={2} />
                </div>
                <span>
                  <b style={{ fontSize: 15 }}>Sim, estou no local</b>
                  <div style={{ color: 'rgba(255,255,255,.55)', fontSize: 12, marginTop: 3, lineHeight: 1.4 }}>
                    O app detecta o GPS e associa automaticamente ao pico mais próximo. Mais rápido!
                  </div>
                </span>
              </button>

              {/* Não — enviar de outro lugar */}
              <button
                onClick={() => {
                  setNoLocal(false)
                  abrirCamera()
                }}
                style={{
                  textAlign: 'left',
                  background: 'rgba(255,255,255,.05)',
                  border: '2px solid rgba(255,255,255,.15)',
                  borderRadius: 16, padding: 18, color: '#fff',
                  display: 'flex', gap: 14, alignItems: 'center', cursor: 'pointer',
                  transition: 'all .15s',
                }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <IconMap2 size={26} stroke={2} />
                </div>
                <span>
                  <b style={{ fontSize: 15 }}>Não, vou escolher o local</b>
                  <div style={{ color: 'rgba(255,255,255,.45)', fontSize: 12, marginTop: 3, lineHeight: 1.4 }}>
                    Estou em casa ou em outro lugar. Vou selecionar o pico manualmente depois.
                  </div>
                </span>
              </button>

              <button
                onClick={() => setEtapa('tipo')}
                style={{
                  background: 'none', border: 'none', color: 'rgba(255,255,255,.4)',
                  cursor: 'pointer', fontSize: 13, marginTop: 8, textAlign: 'center',
                }}
              >
                ← Voltar
              </button>
            </div>
          )}
        </div>
      )}

      {/* ETAPA 3: Câmera */}
      {etapa === 'camera' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
          {/* Badge tipo + local */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {tipoInfo && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: `${tipoInfo.cor}30`, color: tipoInfo.cor,
                borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 600,
              }}>
                <tipoInfo.icone size={13} stroke={2} /> {tipoInfo.titulo}
              </span>
            )}
            {noLocal && picoAutoNome && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'rgba(30,203,195,.2)', color: '#1ECBC3',
                borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 600,
              }}>
                <IconMapPin size={13} stroke={2} /> {picoAutoNome}
              </span>
            )}
          </div>

          <div ref={cameraBoxRef} style={{ flex: 1, position: 'relative', background: '#000', margin: '0 8px', borderRadius: 20, overflow: 'hidden', touchAction: 'none' }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {zoomDisponivel && zoomAtual > 1.05 && (
              <div className="dado" style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 3, background: 'rgba(4,20,27,.6)', color: '#fff', padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, pointerEvents: 'none' }}>
                {zoomAtual.toFixed(1)}×
              </div>
            )}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.45) 100%)', zIndex: 1 }} />
            {erro && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24, color: 'rgba(255,255,255,.8)', background: 'linear-gradient(160deg,#0b3a53,#04141d)', zIndex: 10 }}>
                <IconAlertTriangle size={48} stroke={1.5} style={{ marginBottom: 16, color: 'var(--perigo)' }} />
                <p>{erro}</p>
                <button onClick={() => setEtapa('tipo')} className="btn outline" style={{ marginTop: 24, borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}>Tentar novamente</button>
              </div>
            )}
            {noLocal && (
              <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 2 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                  borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 500, color: '#1ECBC3',
                }}>
                  <IconCurrentLocation size={14} stroke={2} /> 📍 Localização detectada
                </span>
              </div>
            )}
          </div>

          <div style={{ padding: '16px 0 calc(env(safe-area-inset-bottom,0px) + 20px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            {/* Stepper */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {['Tipo', 'Local', 'Foto'].map((label, i) => (
                <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {i > 0 && <span style={{ width: 16, height: 1, background: 'rgba(255,255,255,.2)' }} />}
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: i < 2 ? 'rgba(255,255,255,.4)' : '#fff',
                  }} />
                  <span style={{
                    fontSize: 10, letterSpacing: 1, textTransform: 'uppercase',
                    color: i < 2 ? 'rgba(255,255,255,.4)' : '#fff',
                  }}>{label}</span>
                </span>
              ))}
            </div>

            <button
              onClick={disparar}
              disabled={!!erro}
              aria-label="Disparar"
              style={{
                width: 72, height: 72, borderRadius: '50%', cursor: 'pointer',
                background: 'radial-gradient(circle at 40% 35%, #29e0d5, #0D6EA8)',
                border: '4px solid rgba(255,255,255,.85)',
                boxShadow: '0 4px 20px rgba(30,203,195,.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'transform .1s',
              }}
              onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(.9)')}
              onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <IconCamera size={28} stroke={2.2} color="#fff" />
            </button>

            {noLocal && picoAutoNome && (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', textAlign: 'center' }}>
                A foto será enviada direto para <b style={{ color: '#1ECBC3' }}>{picoAutoNome}</b>
              </p>
            )}
          </div>
        </div>
      )}

      {/* ETAPA 4: Informar localização (orgânico) */}
      {etapa === 'selecionar-pico' && (
        <div style={{ flex: 1, padding: 20, overflow: 'auto', position: 'relative', zIndex: 1 }}>
          {tipoInfo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, justifyContent: 'center' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: `${tipoInfo.cor}30`, color: tipoInfo.cor,
                borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 600,
              }}>
                <tipoInfo.icone size={14} stroke={2} /> {tipoInfo.titulo}
              </span>
            </div>
          )}

          <h2 style={{ color: '#fff', marginBottom: 6 }}>Onde foi feito o registro?</h2>
          <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 13, marginBottom: 16 }}>
            {modoNovoPico || picosExistentes.length === 0
              ? 'Adicione o local exato para que outras pessoas saibam.'
              : 'Escolha um pico já cadastrado — ou reporte um local novo.'}
          </p>

          {/* Picos já cadastrados primeiro: evita locais duplicados no mapa */}
          {!modoNovoPico && picosExistentes.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {[...picosExistentes]
                .map((p) => ({
                  p,
                  dist: posCapturada.lat && posCapturada.lng
                    ? haversineKm(posCapturada.lat, posCapturada.lng, p.lat, p.lng)
                    : null,
                }))
                .sort((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity) || a.p.nome.localeCompare(b.p.nome))
                .slice(0, 8)
                .map(({ p, dist }) => (
                  <button
                    key={p.id}
                    onClick={() => finalizarUpload(p.id, blobCapturado, posCapturada, thumbCapturado)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                      background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.18)',
                      borderRadius: 14, padding: '13px 14px', cursor: 'pointer', textAlign: 'left', color: '#fff',
                    }}
                  >
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontWeight: 600, fontSize: 14.5 }}>{p.nome}</span>
                      <span style={{ display: 'block', fontSize: 11.5, opacity: .65 }}>{p.municipio}/{p.uf}</span>
                    </span>
                    {dist != null && (
                      <span className="dado" style={{ fontSize: 11.5, color: dist <= 0.6 ? '#1ECBC3' : 'rgba(255,255,255,.6)', flexShrink: 0, fontWeight: 700 }}>
                        {dist <= 0.6 ? '📍 aqui' : dist < 10 ? `${dist.toFixed(1)} km` : `${Math.round(dist)} km`}
                      </span>
                    )}
                  </button>
                ))}
              <button
                onClick={() => setModoNovoPico(true)}
                className="btn outline full"
                style={{ marginTop: 4, color: '#fff', borderColor: 'rgba(255,255,255,.35)' }}
              >
                ➕ Reportar um local novo
              </button>
            </div>
          )}

          {(modoNovoPico || picosExistentes.length === 0) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', color: 'rgba(255,255,255,.8)', fontSize: 12, marginBottom: 4, paddingLeft: 4 }}>
                Praia (ou Cidade)
              </label>
              <input
                className="input"
                placeholder="Ex: Praia das Pitangueiras"
                value={novaPraiaNome}
                onChange={(e) => setNovaPraiaNome(e.target.value)}
                style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', color: '#fff' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: 'rgba(255,255,255,.8)', fontSize: 12, marginBottom: 4, paddingLeft: 4 }}>
                Nome do Pico / Canto
              </label>
              <input
                className="input"
                placeholder="Ex: Canto do Maluf"
                value={novoPicoNome}
                onChange={(e) => setNovoPicoNome(e.target.value)}
                style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', color: '#fff' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: 'rgba(255,255,255,.8)', fontSize: 12, marginBottom: 4, paddingLeft: 4 }}>
                Onda (opcional)
              </label>
              <input
                className="input"
                placeholder="Ex: Direitas do canal"
                value={novaOndaNome}
                onChange={(e) => setNovaOndaNome(e.target.value)}
                style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', color: '#fff' }}
              />
            </div>

            <button className="btn acento full" onClick={criarNovoPico} disabled={!novoPicoNome.trim()} style={{ marginTop: 10 }}>
              Enviar Foto
            </button>
            {picosExistentes.length > 0 && (
              <button onClick={() => setModoNovoPico(false)} style={{ background: 'none', border: 0, color: 'rgba(255,255,255,.6)', fontSize: 13, cursor: 'pointer', marginTop: 2 }}>
                ← Voltar aos picos cadastrados
              </button>
            )}
          </div>
          )}
        </div>
      )}

      {/* ETAPA 5: Concluído */}
      {etapa === 'concluido' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: 24, position: 'relative', zIndex: 1 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(30,203,195,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <IconCheck size={40} stroke={2} color="#1ECBC3" />
          </div>
          <h2 style={{ color: '#fff', marginBottom: 8 }}>Registro enviado!</h2>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
            {tipoInfo && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: `${tipoInfo.cor}30`, color: tipoInfo.cor,
                borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 600,
              }}>
                <tipoInfo.icone size={14} stroke={2} /> {tipoInfo.titulo}
              </span>
            )}
            {picoAutoNome && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'rgba(30,203,195,.2)', color: '#1ECBC3',
                borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 600,
              }}>
                <IconMapPin size={14} stroke={2} /> {picoAutoNome}
              </span>
            )}
          </div>
          <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 13, lineHeight: 1.5, maxWidth: 280 }}>
            Sua foto está sendo enviada em background. Obrigado por contribuir!
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24, width: '100%', maxWidth: 320 }}>
            {(tipo === 'lixo' || tipo === 'alerta') && (
              <button
                className="btn full"
                style={{ background: '#2E9B6B', color: '#fff', fontWeight: 700 }}
                onClick={() => {
                  const nomePico = picosExistentes.find((p) => p.id === picoFinal)?.nome
                    ?? picoAutoNome ?? novoPicoNome ?? ''
                  const titulo = tipo === 'lixo'
                    ? `Mutirão de limpeza${nomePico ? ` — ${nomePico}` : ''}`
                    : `Mutirão${nomePico ? ` — ${nomePico}` : ''}`
                  const qs = new URLSearchParams({ titulo })
                  const p = picosExistentes.find((x) => x.id === picoFinal)
                  if (p) {
                    qs.set('municipio', p.municipio); qs.set('uf', p.uf)
                    qs.set('local', p.nome)
                    qs.set('lat', String(p.lat)); qs.set('lng', String(p.lng))
                  } else if (posCapturada.lat && posCapturada.lng) {
                    qs.set('lat', String(posCapturada.lat)); qs.set('lng', String(posCapturada.lng))
                  }
                  navigate(`/nova-acao/mutirao?${qs.toString()}`)
                }}
              >
                🤝 Criar mutirão e convidar a comunidade
              </button>
            )}
            {picoFinal && (
              <button className="btn acento full" onClick={() => navigate(`/pico/${picoFinal}`)}>
                <IconPhoto size={18} /> Ver pico
              </button>
            )}
            <button className="btn outline full" style={{ borderColor: 'rgba(255,255,255,.3)', color: '#fff' }} onClick={() => {
              setTipo(null)
              setNoLocal(null)
              setEtapa('tipo')
              setBlobCapturado(undefined)
              setPicoFinal(null)
              setPicoAutoNome(null)
            }}>
              <IconCamera size={18} /> Novo registro
            </button>
            <button className="btn outline full" style={{ borderColor: 'rgba(255,255,255,.2)', color: 'rgba(255,255,255,.7)' }} onClick={() => navigate('/')}>
              Voltar ao Radar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
