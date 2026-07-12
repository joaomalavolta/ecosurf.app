import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconArrowLeft } from '@tabler/icons-react'

/**
 * Voltar flutuante — aparece quando o conteúdo já rolou o bastante para o
 * voltar do topo ficar longe, e some ao retornar ao topo.
 *
 * A lição (comprovada com reprodução real no Chromium): com
 * `html, body, #root { height: 100%; overflow-x: hidden }`, cada um desses
 * elementos vira `overflow-y: auto`, e quem de fato rola é o `#root` — não a
 * janela, não o body, não o .app-shell. E como eventos de scroll de elemento
 * NÃO fazem bubble, um listener na janela nunca dispara. A única estratégia
 * à prova desse layout (e de mudanças futuras nele) é escutar no `document`
 * em fase de CAPTURA — que intercepta o scroll de qualquer elemento — e ler
 * a posição do próprio alvo do evento.
 */
export function VoltarFlutuante({ para }: { para?: string }) {
  const navigate = useNavigate()
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const LIMIAR = 260
    let pendente = false

    const aoRolar = (e: Event) => {
      if (pendente) return
      pendente = true
      requestAnimationFrame(() => {
        const t = e.target
        const y = t instanceof Element
          ? t.scrollTop
          : Math.max(
              window.scrollY,
              document.documentElement.scrollTop,
              document.body.scrollTop,
            )
        setVisivel(y > LIMIAR)
        pendente = false
      })
    }

    document.addEventListener('scroll', aoRolar, { passive: true, capture: true })
    return () => document.removeEventListener('scroll', aoRolar, { capture: true })
  }, [])

  return (
    <button
      type="button"
      aria-label="Voltar"
      aria-hidden={!visivel}
      tabIndex={visivel ? 0 : -1}
      onClick={() => (para ? navigate(para) : navigate(-1))}
      className="voltar-flutuante"
      data-visivel={visivel ? '1' : undefined}
    >
      <IconArrowLeft size={20} stroke={2.2} />
    </button>
  )
}
