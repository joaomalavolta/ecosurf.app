import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconX,
  IconCamera,
  IconMapPin,
  IconRipple,
  IconAlertTriangle,
  IconTrash,
  IconCheck,
  IconPhoto,
} from '@tabler/icons-react'
import { enfileirar, definirTipo } from '../offline/uploadQueue'
import { statusPerfil } from '../services/perfil'

type TipoRegistro = 'report' | 'alerta' | 'lixo'
type Etapa = 'tipo' | 'camera' | 'selecionar-pico' | 'concluido'

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
  const uploadId = useRef<string | null>(null)
  const navigate = useNavigate()
  const [carregando, setCarregando] = useState(true)
  const picoSelecionado = new URLSearchParams(window.location.search).get('pico')
  const [picosDisponiveis, setPicosDisponiveis] = useState<Array<{id: string, nome: string}>>([])
  const [blobCapturado, setBlobCapturado] = useState<Blob | undefined>()
  const [posCapturada, setPosCapturada] = useState<{lat?: number, lng?: number}>({})
  const [novoPicoNome, setNovoPicoNome] = useState('')
  const [buscaPico, setBuscaPico] = useState('')
  const [picoFinal, setPicoFinal] = useState<string | null>(null)

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

    const pos = await obterCoords()

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
    // Definir tipo imediatamente
    if (tipo) await definirTipo(id, tipo)
    setPicoFinal(picoId)
    setEtapa('concluido')
  }

  async function selecionarPicoExistente(picoId: string) {
    await finalizarUpload(picoId, blobCapturado, posCapturada)
  }

  async function criarNovoPico() {
    if (!novoPicoNome.trim()) return
    try {
      const { restInserirPico } = await import('../services/supabase/rest')
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
      background: 'linear-gradient(160deg,#0b3a53,#04141d)', color: '#fff',
    }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 0', zIndex: 10 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
          <IconX size={22} stroke={2} />
        </button>
        <b>Registrar</b>
        <span style={{ width: 24 }} />
      </div>

      {/* ETAPA 1: Escolher tipo */}
      {etapa === 'tipo' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 24 }}>
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
                  onClick={() => setTipo(t.id)}
                  style={{
                    textAlign: 'left',
                    background: selecionado ? `${t.cor}25` : 'rgba(255,255,255,.06)',
                    border: selecionado ? `2px solid ${t.cor}` : '2px solid rgba(255,255,255,.1)',
                    borderRadius: 16,
                    padding: 16,
                    color: '#fff',
                    display: 'flex',
                    gap: 14,
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'all .15s',
                  }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: `${t.cor}20`, color: t.cor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={24} stroke={2} />
                  </div>
                  <span>
                    <b style={{ fontSize: 15 }}>{t.titulo}</b>
                    <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 12, marginTop: 2 }}>{t.desc}</div>
                  </span>
                  {selecionado && (
                    <IconCheck size={20} stroke={2.5} color={t.cor} style={{ marginLeft: 'auto', flexShrink: 0 }} />
                  )}
                </button>
              )
            })}
          </div>
          <button
            className="btn acento full"
            style={{ marginTop: 20, minHeight: 50, fontSize: 15 }}
            disabled={!tipo}
            onClick={abrirCamera}
          >
            <IconCamera size={20} stroke={2} /> {tipo ? 'Abrir câmera' : 'Selecione o tipo acima'}
          </button>
        </div>
      )}

      {/* ETAPA 2: Câmera */}
      {etapa === 'camera' && (
        <>
          {/* Tipo selecionado badge */}
          {tipoInfo && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', justifyContent: 'center',
            }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: `${tipoInfo.cor}30`, color: tipoInfo.cor,
                borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 600,
              }}>
                <tipoInfo.icone size={14} stroke={2} /> {tipoInfo.titulo}
              </span>
            </div>
          )}

          <div style={{ flex: 1, position: 'relative', background: '#000', margin: '0 8px', borderRadius: 20, overflow: 'hidden' }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.45) 100%)', zIndex: 1 }} />
            {erro && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24, color: 'rgba(255,255,255,.8)', background: 'linear-gradient(160deg,#0b3a53,#04141d)', zIndex: 10 }}>
                <IconAlertTriangle size={48} stroke={1.5} style={{ marginBottom: 16, color: 'var(--perigo)' }} />
                <p>{erro}</p>
                <button onClick={() => setEtapa('tipo')} className="btn outline" style={{ marginTop: 24, borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}>Tentar novamente</button>
              </div>
            )}
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

          <div style={{ padding: '16px 0 calc(env(safe-area-inset-bottom,0px) + 20px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', opacity: 0.4 }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', letterSpacing: 1, textTransform: 'uppercase' }}>Tipo</span>
              <div style={{ width: 20, height: 1, background: 'rgba(255,255,255,.2)' }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
              <span style={{ fontSize: 11, color: '#fff', letterSpacing: 1, textTransform: 'uppercase' }}>Foto</span>
              <div style={{ width: 20, height: 1, background: 'rgba(255,255,255,.2)' }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,.3)' }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', letterSpacing: 1, textTransform: 'uppercase' }}>Enviar</span>
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
          </div>
        </>
      )}

      {/* ETAPA 3: Selecionar pico */}
      {etapa === 'selecionar-pico' && (
        <div style={{ flex: 1, padding: 20, overflow: 'auto' }}>
          <div className="stepper" style={{ marginBottom: 16 }}>
            <div className="step on"><span className="num">1</span> Tipo</div><span className="ln" />
            <div className="step on"><span className="num">2</span> Foto</div><span className="ln" />
            <div className="step on"><span className="num">3</span> Local</div>
          </div>

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
            Selecione o pico mais próximo ou cadastre um novo.
          </p>

          <input
            className="input"
            placeholder="Buscar pico..."
            value={buscaPico}
            onChange={(e) => setBuscaPico(e.target.value)}
            style={{ marginBottom: 10, background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', color: '#fff' }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto', marginBottom: 16 }}>
            {picosDisponiveis
              .filter((p) => !buscaPico || p.nome.toLowerCase().includes(buscaPico.toLowerCase()))
              .slice(0, 20)
              .map((p) => (
                <button
                  key={p.id}
                  onClick={() => selecionarPicoExistente(p.id)}
                  style={{ textAlign: 'left', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 12, padding: '10px 14px', color: '#fff', cursor: 'pointer', fontSize: 14 }}
                >
                  {p.nome}
                </button>
              ))}
          </div>

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

      {/* ETAPA 4: Concluído */}
      {etapa === 'concluido' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: 24 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(30,203,195,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
          }}>
            <IconCheck size={40} stroke={2} color="#1ECBC3" />
          </div>
          <h2 style={{ color: '#fff', marginBottom: 8 }}>Registro enviado!</h2>
          {tipoInfo && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: `${tipoInfo.cor}30`, color: tipoInfo.cor,
              borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 600,
              marginBottom: 12,
            }}>
              <tipoInfo.icone size={16} stroke={2} /> {tipoInfo.titulo}
            </span>
          )}
          <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 13, lineHeight: 1.5, maxWidth: 280 }}>
            Sua foto está sendo enviada em background. Obrigado por contribuir com o monitoramento!
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24, width: '100%', maxWidth: 320 }}>
            {picoFinal && (
              <button className="btn acento full" onClick={() => navigate(`/pico/${picoFinal}`)}>
                <IconPhoto size={18} /> Ver pico
              </button>
            )}
            <button className="btn outline full" style={{ borderColor: 'rgba(255,255,255,.3)', color: '#fff' }} onClick={() => {
              setTipo(null)
              setEtapa('tipo')
              setBlobCapturado(undefined)
              setPicoFinal(null)
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
