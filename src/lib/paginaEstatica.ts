/**
 * Página estática: impede o ZOOM DE PÁGINA em todo o app (comportamento
 * de app nativo). O Safari do iOS ignora tanto o viewport quanto o
 * touch-action no navegador comum — ele usa eventos próprios (gesture*)
 * para a pinça. Bloqueá-los no documento é a única camada que ele respeita.
 *
 * Importante: isso NÃO afeta gestos internos de elementos — o mapa
 * (MapLibre) e a câmera tratam a pinça nos próprios eventos de toque e
 * continuam com zoom interno normal. Só o zoom da página inteira morre.
 */
export function iniciarPaginaEstatica(): void {
  const bloquear = (e: Event) => e.preventDefault()
  document.addEventListener('gesturestart', bloquear, { passive: false })
  document.addEventListener('gesturechange', bloquear, { passive: false })
  document.addEventListener('gestureend', bloquear, { passive: false })

  // Duplo-toque para zoom (iOS): dois toques rápidos no mesmo lugar.
  let ultimoToque = 0
  document.addEventListener('touchend', (e) => {
    const agora = Date.now()
    if (agora - ultimoToque < 300 && e.touches.length === 0 && e.changedTouches.length === 1) {
      const alvo = e.target as HTMLElement | null
      // não interfere em elementos interativos (o clique precisa acontecer)
      if (!alvo?.closest('button, a, input, select, textarea, [role="button"], .maplibregl-canvas-container')) {
        e.preventDefault()
      }
    }
    ultimoToque = agora
  }, { passive: false })
}
