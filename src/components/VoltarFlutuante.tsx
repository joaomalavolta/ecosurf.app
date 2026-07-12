import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconArrowLeft } from '@tabler/icons-react'

/**
 * Voltar flutuante — aparece quando o usuário já rolou o suficiente para o
 * botão do topo sair de vista, e some quando ele volta ao topo (lá o Header
 * já resolve). Fica acima da barra inferior, à esquerda, longe do botão
 * central de captura: é um atalho discreto, não um elemento que compete com
 * o conteúdo. Vidro fosco para pousar sobre qualquer foto sem sujar a tela.
 */
export function VoltarFlutuante({ para }: { para?: string }) {
  const navigate = useNavigate()
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    // Só aparece depois que o topo saiu de cena — antes disso seria ruído.
    const LIMIAR = 260
    let ticking = false

    function aoRolar() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        setVisivel(window.scrollY > LIMIAR)
        ticking = false
      })
    }

    aoRolar()
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
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
