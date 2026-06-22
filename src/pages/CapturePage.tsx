import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconX,
  IconCamera,
  IconMapPin,
  IconRipple,
  IconAlertTriangle,
  IconTrash,
  IconFlask2,
  IconArrowUp,
} from '@tabler/icons-react'
import { enfileirar, definirTipo } from '../offline/uploadQueue'

type Etapa = 'inicio' | 'camera' | 'classificar'

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
      // sem câmera (ex.: desktop/preview) → segue o fluxo com placeholder
      setErro('Câmera indisponível neste dispositivo — seguindo em modo demonstração.')
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

    // Upload otimista: a foto entra na fila offline AGORA, sobe quando der.
    const id = crypto.randomUUID()
    uploadId.current = id
    await enfileirar({
      id,
      picoId: 'praia-do-sonho',
      capturadaEm: new Date().toISOString(),
      blob,
      capturaLat: pos.lat,
      capturaLng: pos.lng,
    })
    setEtapa('classificar')
  }

  async function classificar(tipo: 'report' | 'ameaca' | 'lixo' | 'ciencia') {
    if (uploadId.current) await definirTipo(uploadId.current, tipo)
    navigate('/pico/praia-do-sonho')
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
            Aponte e registre o mar agora. Você diz o que é (report, ameaça, lixo…) depois — enquanto a foto sobe.
          </p>
          <button className="btn acento full" style={{ marginTop: 20, maxWidth: 320 }} onClick={abrirCamera}>
            <IconCamera size={18} stroke={2} /> Abrir câmera
          </button>
        </div>
      )}

      {etapa === 'camera' && (
        <>
          <div style={{ flex: 1, position: 'relative', background: '#000' }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {erro && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24, color: 'rgba(255,255,255,.8)', background: 'linear-gradient(160deg,#0b3a53,#04141d)' }}>
                {erro}
              </div>
            )}
            <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
              <span className="tag" style={{ background: 'rgba(0,0,0,.5)', color: '#fff' }}><IconMapPin size={13} stroke={2.2} /> Praia do Sonho · dentro do pico</span>
            </div>
          </div>
          <div style={{ padding: '20px 0 calc(env(safe-area-inset-bottom,0px) + 24px)', display: 'flex', justifyContent: 'center' }}>
            <button onClick={disparar} aria-label="Tirar foto" style={{ width: 76, height: 76, borderRadius: 999, border: '5px solid rgba(255,255,255,.6)', background: '#fff', cursor: 'pointer' }} />
          </div>
        </>
      )}

      {etapa === 'classificar' && (
        <div style={{ flex: 1, padding: 20, overflow: 'auto' }}>
          <div style={{ height: 200, borderRadius: 18, background: 'linear-gradient(155deg,#9fc6e3,#3F8DC7)', marginBottom: 8 }} />
          <span className="tag ok"><IconArrowUp size={13} stroke={2.2} /> subindo em background</span>
          <h2 style={{ color: '#fff', marginTop: 16 }}>O que você registrou?</h2>
          <div className="stack" style={{ marginTop: 10 }}>
            {([
              ['report', IconRipple, 'Report do mar', 'Condição de surf agora'],
              ['ameaca', IconAlertTriangle, 'Ameaça costeira', 'Poluição, erosão, obra, esgoto'],
              ['lixo', IconTrash, 'Lixo na praia', 'Resíduo para mutirão/ciência'],
              ['ciencia', IconFlask2, 'Ciência cidadã', 'Água, fauna, microplástico'],
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
