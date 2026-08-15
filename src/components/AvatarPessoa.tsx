/**
 * Avatar redondo com inicial de reserva — usado nas telas de mensagens.
 * Quem não subiu foto ainda aparece como gente, não como buraco na lista.
 */
export function AvatarPessoa({
  nome,
  fotoUrl,
  tamanho = 48,
}: {
  nome: string | null
  fotoUrl: string | null
  tamanho?: number
}) {
  const comum = {
    width: tamanho,
    height: tamanho,
    borderRadius: 99,
    flex: '0 0 auto' as const,
  }
  if (fotoUrl) {
    return <img src={fotoUrl} alt="" loading="lazy" style={{ ...comum, objectFit: 'cover' }} />
  }
  return (
    <span
      style={{
        ...comum,
        background: 'color-mix(in srgb, var(--turq) 18%, transparent)',
        display: 'grid',
        placeItems: 'center',
        fontWeight: 700,
        fontSize: Math.round(tamanho * 0.4),
        color: 'var(--turq)',
      }}
    >
      {(nome ?? '?')[0]?.toUpperCase() ?? '?'}
    </span>
  )
}
