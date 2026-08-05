import { useEffect, useState, type CSSProperties } from 'react'
import { IconEye } from '@tabler/icons-react'
import { registrarAcesso } from '../services/contador'

/**
 * Selo discreto com o total de acessos. Registra o acesso ao montar e some
 * (renderiza nada) se o contador não carregar — nunca quebra a tela.
 */
export function ContadorAcessos({ style }: { style?: CSSProperties }) {
  const [n, setN] = useState<number | null>(null)
  useEffect(() => {
    let vivo = true
    registrarAcesso().then((c) => vivo && setN(c))
    return () => {
      vivo = false
    }
  }, [])
  if (n == null) return null
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...style }}>
      <IconEye size={15} stroke={2} />
      {n.toLocaleString('pt-BR')} acessos
    </span>
  )
}
