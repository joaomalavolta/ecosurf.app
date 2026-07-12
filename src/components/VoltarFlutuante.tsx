import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconArrowLeft } from '@tabler/icons-react'

/**
 * Voltar flutuante — aparece quando o conteúdo já rolou o bastante para o
 * voltar do topo ficar longe, e some ao retornar ao topo.
 *
 * Detalhe que custou uma tentativa: quem rola NÃO é a janela, e sim o
 * `.app-shell` (o app define `html, body { height:100%; overflow-x:hidden }`,
 * e com um eixo escondido o outro vira `auto` — `window.scrollY` fica em 0
 * para sempre). O Header usa exatamente o mesmo alvo para encolher; seguimos
 * a mesma fonte de verdade, com a janela como reserva.
 */
export function VoltarFlutuante({ para }: { para?: string }) {
  const navigate = useNavigate()
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const LIMIAR = 260
    const shell = document.querySelector('.app-shell') as HTMLElement | null

    // Não assumimos QUEM rola: lemos todos os candidatos e usamos o maior.
    // Assim o botão funciona com o shell rolando, com o body rolando, ou se
    // esse detalhe de layout mudar amanhã.
    const posicao = () => Math.max(
      shell?.scrollTop ?? 0,
      window.scrollY,
      document.documentElement.scrollTop,
      document.body.scrollTop,
    )

    let pendente = false
    const aoRolar = () => {
      if (pendente) return
      pendente = true
      requestAnimationFrame(() => {
        setVisivel(posicao() > LIMIAR)
        pendente = false
      })
    }

    aoRolar()
    shell?.addEventListener('scroll', aoRolar, { passive: true })
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => {
      shell?.removeEventListener('scroll', aoRolar)
      window.removeEventListener('scroll', aoRolar)
    }
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
