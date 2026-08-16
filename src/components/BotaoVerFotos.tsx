import { IconPhoto, IconPhotoOff } from '@tabler/icons-react'

/**
 * Recolhe a grade de fotos para o mapa ganhar o palco.
 *
 * É um controle de VISUALIZAÇÃO, e a etiqueta precisa deixar isso claro:
 * quem toca aqui não escondeu nada de ninguém, só arrumou a própria tela. A
 * privacidade — o que os outros veem — é outro lugar, no seu perfil.
 *
 * Fica ao lado do título da seção, no tamanho de um controle secundário: se
 * parecesse um botão de ação, competiria com "Registrar" e companhia.
 */
export function BotaoVerFotos({
  visiveis,
  quantas,
  onAlternar,
}: {
  visiveis: boolean
  quantas: number
  onAlternar: () => void
}) {
  const Icone = visiveis ? IconPhotoOff : IconPhoto
  return (
    <button
      onClick={onAlternar}
      aria-pressed={!visiveis}
      title={visiveis
        ? 'Recolher as fotos e destacar o mapa'
        : `Mostrar as ${quantas} fotos de novo`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: 'none', border: '1px solid var(--line)', borderRadius: 999,
        padding: '4px 10px', cursor: 'pointer', flex: '0 0 auto',
        font: 'inherit', fontSize: 11.5, fontWeight: 600, color: 'var(--muted)',
      }}
    >
      <Icone size={14} stroke={2} />
      {visiveis ? 'Ocultar fotos' : `Ver fotos (${quantas})`}
    </button>
  )
}
