import { IconArrowLeft } from '@tabler/icons-react'

interface BotaoVoltarOverlayProps {
  onClick: () => void
  label: string
  style?: React.CSSProperties
}

export function BotaoVoltarOverlay({ onClick, label, style }: BotaoVoltarOverlayProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'none',
        border: 'none',
        padding: '4px 8px 12px 0',
        color: 'rgba(255,255,255,.85)',
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'color 0.2s',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = '#fff'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'rgba(255,255,255,.85)'
      }}
    >
      <IconArrowLeft size={18} stroke={2.2} />
      {label}
    </button>
  )
}
