import { useEffect, useRef, useState, type RefObject } from 'react'

/**
 * Pinch-to-zoom na câmera.
 *
 * Dois problemas resolvidos:
 *  1. Sem tratamento, o navegador entende o pinça como "dar zoom na página" —
 *     a tela inteira anda. Aqui a gente intercepta o gesto na área da câmera
 *     (touch-action:none + preventDefault) para o app não se mexer.
 *  2. Onde o dispositivo permite, o pinça controla o ZOOM REAL da lente via
 *     MediaStream (constraint `zoom`). Onde não permite (iOS Safari e vários
 *     Androids não expõem), o gesto simplesmente não faz zoom — mas também
 *     não bagunça a página. Degradação graciosa.
 *
 * Retorna se o zoom de lente está disponível (para a UI decidir se mostra
 * algum indicador), mas funciona mesmo quando não está.
 */
/**
 * Suavidade da pinça. Expoente < 1 faz o zoom avançar mais devagar que os
 * dedos: com 0.45, abrir os dedos ao dobro (fator 2) leva o zoom a ~1.37×,
 * não a 2×. Isso dá controle fino para parar no enquadramento desejado —
 * a queixa era que o zoom "corria" e passava do ponto.
 */
const SUAVIDADE = 0.45

export function usePinchZoom(
  alvoRef: RefObject<HTMLElement | null>,
  streamRef: RefObject<MediaStream | null>,
  ativo: boolean,
): { zoomDisponivel: boolean; zoomAtual: number } {
  const [zoomDisponivel, setZoomDisponivel] = useState(false)
  const [zoomAtual, setZoomAtual] = useState(1)
  const distInicial = useRef<number | null>(null)
  const zoomInicial = useRef(1)
  const capsRef = useRef<{ min: number; max: number; step: number } | null>(null)

  useEffect(() => {
    if (!ativo) return
    const alvo = alvoRef.current
    if (!alvo) return

    const track = streamRef.current?.getVideoTracks?.()[0]
    // Descobre se a lente suporta zoom (nem todo device/browser expõe).
    const caps = track?.getCapabilities?.() as (MediaTrackCapabilities & { zoom?: { min: number; max: number; step: number } }) | undefined
    if (track && caps && caps.zoom) {
      capsRef.current = { min: caps.zoom.min, max: caps.zoom.max, step: caps.zoom.step || 0.1 }
      setZoomDisponivel(true)
      const settings = track.getSettings?.() as (MediaTrackSettings & { zoom?: number }) | undefined
      if (settings?.zoom) {
        zoomInicial.current = settings.zoom
        setZoomAtual(settings.zoom)
      }
    }

    function distancia(t: TouchList): number {
      const dx = t[0].clientX - t[1].clientX
      const dy = t[0].clientY - t[1].clientY
      return Math.hypot(dx, dy)
    }

    function onStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        e.preventDefault()
        distInicial.current = distancia(e.touches)
        zoomInicial.current = zoomAtual
      }
    }

    async function onMove(e: TouchEvent) {
      if (e.touches.length !== 2 || distInicial.current == null) return
      // Bloqueia o zoom-de-página SEMPRE que houver pinça na câmera.
      e.preventDefault()

      const caps = capsRef.current
      const track = streamRef.current?.getVideoTracks?.()[0]
      if (!caps || !track) return // sem zoom de lente: só bloqueia a página

      const fator = distancia(e.touches) / (distInicial.current || 1)
      let novo = zoomInicial.current * Math.pow(fator, SUAVIDADE)
      novo = Math.min(caps.max, Math.max(caps.min, novo))
      try {
        await track.applyConstraints({ advanced: [{ zoom: novo } as unknown as MediaTrackConstraintSet] })
        setZoomAtual(novo)
      } catch {
        /* aplicar zoom falhou — ignora, sem quebrar a captura */
      }
    }

    function onEnd(e: TouchEvent) {
      if (e.touches.length < 2) distInicial.current = null
    }

    // ── iOS Safari: usa eventos PRÓPRIOS da Apple (gesture*) para o pinça,
    // independentes de touch-action e dos touchevents. Sem bloquear estes,
    // o Safari dá zoom na página inteira (a tela "foge"). ──
    function onGestureStart(e: Event) {
      e.preventDefault()
      zoomInicial.current = zoomAtual
    }
    async function onGestureChange(e: Event) {
      e.preventDefault() // impede o zoom-de-página do Safari, sempre
      const caps = capsRef.current
      const track = streamRef.current?.getVideoTracks?.()[0]
      // `scale` é a razão do pinça desde o início do gesto (propriedade iOS).
      const scale = (e as unknown as { scale?: number }).scale
      if (!caps || !track || !scale) return // sem zoom de lente: só bloqueia
      let novo = zoomInicial.current * Math.pow(scale, SUAVIDADE)
      novo = Math.min(caps.max, Math.max(caps.min, novo))
      try {
        await track.applyConstraints({ advanced: [{ zoom: novo } as unknown as MediaTrackConstraintSet] })
        setZoomAtual(novo)
      } catch {
        /* aplicar zoom falhou — ignora, sem quebrar a captura */
      }
    }
    function onGestureEnd(e: Event) {
      e.preventDefault()
    }

    // passive:false é essencial para o preventDefault valer no gesto de zoom.
    alvo.addEventListener('touchstart', onStart, { passive: false })
    alvo.addEventListener('touchmove', onMove, { passive: false })
    alvo.addEventListener('touchend', onEnd)
    alvo.addEventListener('touchcancel', onEnd)
    // Os eventos gesture* do iOS precisam ser bloqueados no documento para o
    // Safari respeitar o preventDefault de forma confiável. A tela da câmera é
    // um takeover de tela cheia, então bloquear durante ela é seguro.
    document.addEventListener('gesturestart', onGestureStart, { passive: false })
    document.addEventListener('gesturechange', onGestureChange, { passive: false })
    document.addEventListener('gestureend', onGestureEnd, { passive: false })
    return () => {
      alvo.removeEventListener('touchstart', onStart)
      alvo.removeEventListener('touchmove', onMove)
      alvo.removeEventListener('touchend', onEnd)
      alvo.removeEventListener('touchcancel', onEnd)
      document.removeEventListener('gesturestart', onGestureStart)
      document.removeEventListener('gesturechange', onGestureChange)
      document.removeEventListener('gestureend', onGestureEnd)
    }
  }, [ativo, alvoRef, streamRef, zoomAtual])

  return { zoomDisponivel, zoomAtual }
}
