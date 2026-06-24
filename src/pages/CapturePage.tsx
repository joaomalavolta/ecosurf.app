import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconX,
  IconCamera,
  IconMapPin,
  IconRipple,
  IconAlertTriangle,
  IconTrash,
  IconArrowUp,
} from '@tabler/icons-react'
import { enfileirar, definirTipo } from '../offline/uploadQueue'
import { statusPerfil } from '../services/perfil'

type Etapa = 'inicio' | 'camera' | 'selecionar-pico' | 'classificar'

function obterCoords(): Promise<{ lat?: number; lng?: number }> {
  return new Promise((res) => {
    if (!navigator.geolocation) return res({})
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => res({}),
      { enableHighAccuracy: true, timeout: 4000 },
    )
  })
}

/** Distância em km entre dois pontos (lat/lng) usando fórmula Haversine. */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // raio da terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Registrar em 2 toques: o botão central já trouxe o usuário aqui (toque 1).
 * "Abrir câmera" → disparo (toque 2). A CLASSIFICAÇÃO vem DEPOIS da captura,
 * enquanto a foto subiria em background (upload otimista, fila offline).
 * Nunca um menu antes da foto: na praia, com a série entrando, o momento se perde.
 */
export function CapturePage() {
  const [etapa, setEtapa] = useState<Etapa>('inicio')
  const [erro, setErro] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const uploadId = useRef<string | null>(null)
  const navigate = useNavigate()
  const [carregando, setCarregando] = useState(true)
  const picoSelecionado = new URLSearchParams(window.location.search).get('pico')
  // Estado para seleção/criação de pico
  const [picosDisponiveis, setPicosDisponiveis] = useState<Array<{id: string, nome: string}>>([])
  const [blobCapturado, setBlobCapturado] = useState<Blob | undefined>()
  const [posCapturada, setPosCapturada] = useState<{lat?: number, lng?: number}>({})
  const [novoPicoNome, setNovoPicoNome] = useState('')
  const [buscaPico, setBuscaPico] = useState('')

  useEffect(() => {
    let vivo = true
    statusPerfil().then((s) => {
      if (!vivo) return
      if (!s.sessao) {
        window.alert('Faça login para poder registrar as condições do mar e ameaças.')
        navigate('/perfil', { replace: true })
      } else {
        setCarregando(false)
      }
    })
    return () => {
      vivo = false
    }
  }, [navigate])

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

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  async function disparar() {
    const v = videoRef.current
    let blob: Blob | undefined
    if (v && v.videoWidth > 0) {
      // resize client-side: cap em 1600px, WebP — economiza dados no 3G da praia
      const maxDim = 1600
      const escala = Math.min(1, maxDim / Math.max(v.videoWidth, v.videoHeight))
      const w = Math.round(v.videoWidth * escala)
      const h = Math.round(v.videoHeight * escala)
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      c.getContext('2d')?.drawImage(v, 0, 0, w, h)
      blob = await new Promise<Blob | undefined>((res) => c.toBlob((b) => res(b ?? undefined), 'image/webp', 0.8))
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())

    const pos = await obterCoords() // GPS para o geofence (servidor valida)

    let finalPicoId = picoSelecionado
    if (!finalPicoId && pos.lat && pos.lng) {
      const { carregarPicos } = await import('../services/picos')
      const picos = await carregarPicos()
      let minD = Infinity
      let melhorPico: string | null = null
      for (const p of picos) {
        const d = haversineKm(pos.lat, pos.lng, p.lat, p.lng)
        if (d < minD) { minD = d; melhorPico = p.id }
      }
      if (melhorPico && minD < 2) {
        finalPicoId = melhorPico
      } else {
        // Longe de picos — mostrar seletor
        setBlobCapturado(blob)
        setPosCapturada(pos)
        setPicosDisponiveis(picos.map(p => ({ id: p.id, nome: p.nome })))
        setEtapa('selecionar-pico')
        return
      }
    }
    if (!finalPicoId) {
      const { carregarPicos } = await import('../services/picos')
      const picos = await carregarPicos()
      setBlobCapturado(blob)
      setPosCapturada(pos)
      setPicosDisponiveis(picos.map(p => ({ id: p.id, nome: p.nome })))
      setEtapa('selecionar-pico')
      return
    }
    await finalizarUpload(finalPicoId, blob, pos)
  }

  async function finalizarUpload(picoId: string, blob?: Blob, pos?: {lat?: number, lng?: number}) {
    const id = crypto.randomUUID()
    uploadId.current = id
    await enfileirar({
      id,
      picoId,
      capturadaEm: new Date().toISOString(),
      blob,
      capturaLat: pos?.lat,
      capturaLng: pos?.lng,
    })
    setEtapa('classificar')
  }

  async function selecionarPicoExistente(picoId: string) {
    await finalizarUpload(picoId, blobCapturado, posCapturada)
  }

  async function criarNovoPico() {
    if (!novoPicoNome.trim()) return
    try {
      const { restInserirPico } = await import('../services/supabase/rest')
      // Geocodificação reversa para preencher município/UF
      let municipio = ''
      let uf = 'SP'
      if (posCapturada.lat && posCapturada.lng) {
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${posCapturada.lat}&lon=${posCapturada.lng}&format=json&zoom=10`)
          const geo = await geoRes.json()
          municipio = geo.address?.city || geo.address?.town || geo.address?.village || geo.address?.municipality || ''
          uf = geo.address?.state_code?.toUpperCase() || geo.address?.['ISO3166-2-lvl4']?.split('-')[1] || 'SP'
        } catch { /* fallback silencioso */ }
      }
      const picoId = await restInserirPico({
        nome: novoPicoNome.trim(),
        lat: posCapturada.lat ?? 0,
        lng: posCapturada.lng ?? 0,
        municipio,
        uf,
      })
      await finalizarUpload(picoId, blobCapturado, posCapturada)
    } catch (e: any) {
      alert('Erro ao criar pico: ' + (e?.message || 'tente novamente'))
    }
  }

  async function classificar(tipo: 'report' | 'alerta' | 'lixo') {
    if (uploadId.current) await definirTipo(uploadId.current, tipo)
    
    // navigate to the same pico we just sent the photo to
    const finalPicoId = uploadId.current ? await getPicoIdFromFila(uploadId.current) : (picoSelecionado || 'praia-do-sonho')
    navigate(`/pico/${finalPicoId}`)
  }
  
  async function getPicoIdFromFila(id: string): Promise<string> {
    const { pendentes } = await import('../offline/uploadQueue')
    const fila = await pendentes()
    const f = fila.find(x => x.id === id)
    return f ? f.picoId : (picoSelecionado || 'praia-do-sonho')
  }

  if (carregando) {
    return <div style={{ position: 'fixed', inset: 0, background: '#04141d', zIndex: 100 }} />
  }

  return (
    <div style={{ position: 'fixed', inset: 0, maxWidth: 'var(--largura-app)', margin: '0 auto', background: '#04141d', color: '#fff', display: 'flex', flexDirection: 'column', zIndex: 100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'calc(env(safe-area-inset-top,0px) + 14px) 16px 12px' }}>
        <button onClick={() => navigate(-1)} aria-label="Fechar" style={{ background: 'none', border: 0, color: '#fff', display: 'flex', cursor: 'pointer' }}><IconX size={24} stroke={2} /></button>
        <b>Registrar</b>
        <span style={{ width: 24 }} />
      </div>

      {etapa === 'inicio' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: 24 }}>
          <IconCamera size={56} stroke={1.5} />
          <h2 style={{ color: '#fff', marginTop: 12 }}>A foto primeiro</h2>
          <p style={{ color: 'rgba(255,255,255,.75)', maxWidth: 280 }}>
            Aponte e registre o mar agora. Você diz o que é (report, alerta, lixo…) depois — enquanto a foto sobe.
          </p>
          <button className="btn acento full" style={{ marginTop: 20, maxWidth: 320 }} onClick={abrirCamera}>
            <IconCamera size={18} stroke={2} /> Abrir câmera
          </button>
        </div>
      )}

      {etapa === 'camera' && (
        <>
          {/* Viewfinder fullscreen com cantos arredondados e vinheta */}
          <div style={{ flex: 1, position: 'relative', background: '#000', margin: '0 8px', borderRadius: 20, overflow: 'hidden' }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {/* Vinheta sutil */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.45) 100%)', zIndex: 1 }} />
            {erro && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24, color: 'rgba(255,255,255,.8)', background: 'linear-gradient(160deg,#0b3a53,#04141d)', zIndex: 10 }}>
                <IconAlertTriangle size={48} stroke={1.5} style={{ marginBottom: 16, color: 'var(--perigo)' }} />
                <p>{erro}</p>
                <button onClick={() => setEtapa('inicio')} className="btn outline" style={{ marginTop: 24, borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}>Tentar novamente</button>
              </div>
            )}
            {/* GPS indicator — pulsa enquanto detecta */}
            <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 2 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,.9)',
                animation: 'pulse 2s ease-in-out infinite',
              }}>
                <IconMapPin size={13} stroke={2.2} style={{ color: 'var(--turq)' }} /> Detectando localização…
              </span>
            </div>
          </div>

          {/* Bottom bar — shutter + dots */}
          <div style={{ padding: '16px 0 calc(env(safe-area-inset-bottom,0px) + 20px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            {/* Dot stepper */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', letterSpacing: 1, textTransform: 'uppercase' }}>Foto</span>
              <div style={{ width: 20, height: 1, background: 'rgba(255,255,255,.2)' }} />
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,.25)' }} />
              <div style={{ width: 20, height: 1, background: 'rgba(255,255,255,.2)' }} />
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,.25)' }} />
            </div>

            {/* Shutter button — estilo câmera nativa */}
            <button
              onClick={disparar}
              aria-label="Tirar foto"
              className="shutter-btn"
              style={{
                width: 72, height: 72, borderRadius: '50%',
                border: '4px solid rgba(255,255,255,.9)',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 0,
                boxShadow: '0 0 0 2px rgba(255,255,255,.15), 0 8px 24px rgba(0,0,0,.4)',
                transition: 'transform .1s',
              }}
            >
              <div style={{
                width: 58, height: 58, borderRadius: '50%',
                background: '#fff',
                transition: 'transform .15s ease',
              }} />
            </button>
          </div>
        </>
      )}

      {etapa === 'selecionar-pico' && (
        <div style={{ flex: 1, padding: 20, overflow: 'auto' }}>
          <div className="stepper" style={{ marginBottom: 24 }}>
            <div className="step on"><span className="num">1</span> Foto</div><span className="ln"></span>
            <div className="step on"><span className="num">2</span> Local/Pico</div><span className="ln"></span>
            <div className="step"><span className="num">3</span> Enviar</div>
          </div>
          <IconMapPin size={40} stroke={1.5} style={{ margin: '0 auto', display: 'block', color: 'var(--turq)' }} />
          <h2 style={{ color: '#fff', marginTop: 12, textAlign: 'center' }}>Qual é o pico?</h2>
          <p style={{ color: 'rgba(255,255,255,.65)', textAlign: 'center', fontSize: 13 }}>
            Não encontramos um pico próximo. Selecione um existente ou cadastre um novo.
          </p>

          {/* Busca */}
          <input
            className="input"
            placeholder="Buscar pico..."
            value={buscaPico}
            onChange={(e) => setBuscaPico(e.target.value)}
            style={{ marginTop: 16, background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', color: '#fff' }}
          />

          {/* Lista filtrada */}
          <div style={{ maxHeight: 200, overflow: 'auto', marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {picosDisponiveis
              .filter(p => !buscaPico || p.nome.toLowerCase().includes(buscaPico.toLowerCase()))
              .map(p => (
                <button
                  key={p.id}
                  onClick={() => selecionarPicoExistente(p.id)}
                  style={{ textAlign: 'left', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 12, padding: '10px 14px', color: '#fff', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}
                >
                  <IconMapPin size={14} stroke={2} style={{ marginRight: 6, verticalAlign: -2 }} />
                  {p.nome}
                </button>
              ))}
          </div>

          {/* Cadastrar novo pico */}
          <div style={{ marginTop: 20, padding: 16, background: 'rgba(30,203,195,.1)', borderRadius: 16, border: '1px solid rgba(30,203,195,.25)' }}>
            <b style={{ fontSize: 14 }}>🏖️ Novo pico</b>
            <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 12, marginTop: 4 }}>Não encontrou? Cadastre a praia e ela fica disponível para todos.</p>
            <input
              className="input"
              placeholder="Nome da praia (ex: Praia do Tombo)"
              value={novoPicoNome}
              onChange={(e) => setNovoPicoNome(e.target.value)}
              style={{ marginTop: 10, background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', color: '#fff' }}
            />
            <button
              className="btn acento full"
              onClick={criarNovoPico}
              disabled={!novoPicoNome.trim()}
              style={{ marginTop: 10 }}
            >
              Criar pico e enviar foto
            </button>
          </div>
        </div>
      )}

      {etapa === 'classificar' && (
        <div style={{ flex: 1, padding: 20, overflow: 'auto' }}>
          <div className="stepper" style={{ marginBottom: 24 }}>
            <div className="step on"><span className="num">1</span> Foto</div><span className="ln"></span>
            <div className="step on"><span className="num">2</span> Local/Pico</div><span className="ln"></span>
            <div className="step on"><span className="num">3</span> Enviar</div>
          </div>
          <div style={{ height: 200, borderRadius: 18, background: 'linear-gradient(155deg,#9fc6e3,#3F8DC7)', marginBottom: 8 }} />
          <span className="tag ok"><IconArrowUp size={13} stroke={2.2} /> subindo em background</span>
          <h2 style={{ color: '#fff', marginTop: 16 }}>O que você registrou?</h2>
          <div className="stack" style={{ marginTop: 10 }}>
            {([
              ['report', IconRipple, 'Report do mar', 'Condição de surf agora'],
              ['alerta', IconAlertTriangle, 'Alerta ambiental', 'Esgoto, erosão, obra, poluição'],
              ['lixo', IconTrash, 'Lixo na praia', 'Resíduo na praia ou no mar'],
            ] as const).map(([tipo, Icon, t, s]) => (
              <button
                key={t}
                onClick={() => classificar(tipo)}
                style={{ textAlign: 'left', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 16, padding: 14, color: '#fff', display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer' }}
              >
                <Icon size={24} stroke={2} />
                <span>
                  <b>{t}</b>
                  <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 13 }}>{s}</div>
                </span>
              </button>
            ))}
          </div>
          <p style={{ color: 'rgba(255,255,255,.55)', fontSize: 12, marginTop: 16 }}>
            A classificação não bloqueia o envio. Se você sair, a foto sobe mesmo assim.
          </p>
        </div>
      )}
    </div>
  )
}
