import { Link } from 'react-router-dom'
import { IconUsersGroup } from '@tabler/icons-react'

/**
 * Badge de autoria comunitária — mostra que a publicação foi assinada por uma
 * comunidade, não só por uma pessoa. Sem ele, quem abria um alerta publicado
 * por um coletivo via apenas o nome de quem apertou o botão: o crédito do
 * grupo se perdia, e com ele o incentivo de publicar em nome da comunidade.
 */
export function CreditoComunidade({
  id,
  nome,
  avatar,
}: {
  id?: string
  nome?: string
  avatar?: string
}) {
  if (!id || !nome) return null

  return (
    <Link
      to={`/comunidade/${id}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '6px 12px 6px 6px', borderRadius: 999,
        background: 'color-mix(in srgb, var(--turq) 10%, transparent)',
        border: '1px solid color-mix(in srgb, var(--turq) 28%, transparent)',
        textDecoration: 'none', color: 'inherit',
        maxWidth: '100%',
      }}
    >
      <span style={{
        width: 24, height: 24, borderRadius: 8, flexShrink: 0,
        display: 'grid', placeItems: 'center',
        background: avatar
          ? `url('${avatar}') center/cover no-repeat`
          : 'linear-gradient(135deg, #0D6EA8, #2E9BD6)',
      }}>
        {!avatar && <IconUsersGroup size={13} stroke={2} color="#fff" />}
      </span>
      <span style={{ minWidth: 0, overflow: 'hidden' }}>
        <span className="muted" style={{ fontSize: 9.5, display: 'block', lineHeight: 1.1, textTransform: 'uppercase', letterSpacing: '.04em' }}>
          Publicado pela comunidade
        </span>
        <span style={{
          fontSize: 13, fontWeight: 700, color: 'var(--turq)', display: 'block',
          lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {nome}
        </span>
      </span>
    </Link>
  )
}
