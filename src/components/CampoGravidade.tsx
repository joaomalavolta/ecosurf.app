import type { GravidadeAlerta } from '../types/domain'
import { IconAlertTriangle } from '@tabler/icons-react'

const NIVEIS: { id: GravidadeAlerta; label: string; desc: string; cor: string }[] = [
  { id: 'baixa', label: 'Baixa', desc: 'Pequena quantidade ou impacto pontual', cor: '#22C55E' },
  { id: 'media', label: 'Média', desc: 'Acúmulo visível ou impacto recorrente', cor: '#F59E0B' },
  { id: 'alta', label: 'Alta', desc: 'Grande volume, esgoto, óleo ou risco relevante', cor: '#EF4444' },
  { id: 'emergencial', label: 'Emergencial', desc: 'Risco à saúde pública ou animal em sofrimento', cor: '#9333EA' },
]

export function CampoGravidade({
  valor,
  onChange,
}: {
  valor?: GravidadeAlerta
  onChange: (g: GravidadeAlerta) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {NIVEIS.map((n) => {
        const ativo = valor === n.id
        return (
          <button
            key={n.id}
            type="button"
            onClick={() => onChange(n.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 12,
              border: ativo ? `2px solid ${n.cor}` : '2px solid var(--line)',
              background: ativo ? `${n.cor}12` : 'var(--card)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              textAlign: 'left',
              transition: 'all .15s',
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: ativo ? n.cor : 'var(--cinza)',
                color: ativo ? '#fff' : n.cor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: '0 0 auto',
                transition: 'all .15s',
              }}
            >
              <IconAlertTriangle size={18} stroke={2} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{n.label}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{n.desc}</div>
            </div>
          </button>
        )
      })}

      {valor === 'emergencial' && (
        <div style={{
          marginTop: 4,
          padding: '10px 12px',
          borderRadius: 10,
          background: '#9333EA15',
          border: '1px solid #9333EA40',
          fontSize: 12,
          color: 'var(--text)',
          lineHeight: 1.4,
        }}>
          <IconAlertTriangle size={13} stroke={2} style={{ verticalAlign: '-2px' }} /> Se a situação exige ação imediata, procure os órgãos públicos competentes (Ibama, ICMBio, Defesa Civil, Ministério Público).
          O Ecosurf.app publica o registro colaborativo, mas não encaminha providências oficiais.
        </div>
      )}
    </div>
  )
}
