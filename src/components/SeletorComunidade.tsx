import { useEffect, useState } from 'react'
import { IconUser, IconUsersGroup } from '@tabler/icons-react'
import { comunidadesQuePublico, type Comunidade } from '../services/comunidades'

/**
 * Seletor "publicar como" — pessoa ou comunidade (admin/autor).
 * Invisível para quem não participa de nenhuma comunidade com papel de
 * publicação: o formulário fica idêntico ao de sempre. Para quem participa,
 * uma linha de chips define a assinatura do registro.
 */
export function SeletorComunidade({
  valor,
  onChange,
}: {
  valor: string | null
  onChange: (comunidadeId: string | null) => void
}) {
  const [comunidades, setComunidades] = useState<Comunidade[]>([])

  useEffect(() => {
    let vivo = true
    comunidadesQuePublico()
      .then((cs) => { if (vivo) setComunidades(cs) })
      .catch(() => {})
    return () => { vivo = false }
  }, [])

  if (comunidades.length === 0) return null

  const chip = (ativo: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 12px', borderRadius: 999, cursor: 'pointer',
    border: ativo ? '1.5px solid var(--turq)' : '1px solid var(--line)',
    background: ativo ? 'color-mix(in srgb, var(--turq) 10%, transparent)' : 'var(--card)',
    color: ativo ? 'var(--turq)' : 'var(--muted)',
    fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit',
    whiteSpace: 'nowrap', flexShrink: 0,
  })

  return (
    <div style={{ marginBottom: 14 }}>
      <label className="form-label">Publicar como</label>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
        <button type="button" style={chip(valor === null)} onClick={() => onChange(null)}>
          <IconUser size={14} stroke={2} /> Você
        </button>
        {comunidades.map((c) => (
          <button key={c.id} type="button" style={chip(valor === c.id)} onClick={() => onChange(c.id)}>
            {c.avatarUrl
              ? <img src={c.avatarUrl} alt="" style={{ width: 18, height: 18, borderRadius: 6, objectFit: 'cover' }} />
              : <IconUsersGroup size={14} stroke={2} />}
            {c.nome}
          </button>
        ))}
      </div>
    </div>
  )
}
