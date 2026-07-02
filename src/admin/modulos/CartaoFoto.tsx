import {
  IconCheck, IconEyeOff, IconTrash,
} from '@tabler/icons-react'
import { IconArrowBackUp as IconRestaurar } from '@tabler/icons-react'
import { type Permissoes, type FotoAdmin } from '../../services/admin'
import { StatusBadge } from '../ui'
import { fmtData } from '../shared'

export function CartaoFoto({
  f, perm, onModerar, onExcluir, onRestaurar,
}: {
  f: FotoAdmin
  perm: Permissoes
  onModerar: (f: FotoAdmin, status: 'aprovada' | 'ocultada' | 'rejeitada') => void
  onExcluir: (f: FotoAdmin) => void
  onRestaurar: (f: FotoAdmin) => void
}) {
  const removida = !!f.deleted_at || f.status === 'removida'
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 150, background: 'var(--cinza)', position: 'relative' }}>
        {f.url ? (
          <img src={f.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: removida ? 'grayscale(1) opacity(.5)' : undefined }} />
        ) : (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--muted)', fontSize: 12 }}>sem imagem</div>
        )}
        <div style={{ position: 'absolute', top: 8, left: 8 }}><StatusBadge status={f.status} /></div>
      </div>
      <div className="pad" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <div className="muted" style={{ fontSize: 12 }}>
          {f.pico_id} · {fmtData(f.capturada_em)}
        </div>
        <div className="muted" style={{ fontSize: 11.5 }}>
          procedência: {f.procedencia} · geofence: {f.geofence_ok ? 'ok' : 'não'}
        </div>
        {f.suspeita_motivo && (
          <div style={{ fontSize: 11.5, color: 'var(--perigo)', fontWeight: 600, marginTop: 4 }}>
            ⚠ {f.suspeita_motivo}
          </div>
        )}
        {f.observacao && <div style={{ fontSize: 12.5 }}>{f.observacao}</div>}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {removida ? (
            perm.modera && (
              <button className="btn outline" style={{ minHeight: 36, padding: '0 12px', fontSize: 13 }} onClick={() => onRestaurar(f)}>
                <IconRestaurar size={15} /> Restaurar
              </button>
            )
          ) : (
            <>
              {f.status !== 'aprovada' && (
                <button className="btn" style={{ minHeight: 36, padding: '0 12px', fontSize: 13 }} onClick={() => onModerar(f, 'aprovada')}>
                  <IconCheck size={15} /> Aprovar
                </button>
              )}
              {f.status !== 'ocultada' && (
                <button className="btn outline" style={{ minHeight: 36, padding: '0 12px', fontSize: 13 }} onClick={() => onModerar(f, 'ocultada')}>
                  <IconEyeOff size={15} /> Ocultar
                </button>
              )}
              <button className="btn outline" style={{ minHeight: 36, padding: '0 12px', fontSize: 13, color: 'var(--perigo)', borderColor: 'var(--perigo-bg)' }} onClick={() => onExcluir(f)}>
                <IconTrash size={15} /> Excluir
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

