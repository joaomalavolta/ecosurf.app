import {
  IconCheck, IconEdit, IconEyeOff, IconTrash,
} from '@tabler/icons-react'
import { IconArrowBackUp as IconRestaurar } from '@tabler/icons-react'
import { type Permissoes, type FotoAdmin } from '../../services/admin'
import { StatusBadge } from '../ui'
import { fmtDataHora } from '../shared'

export function CartaoFoto({
  f, perm, nomePico, onModerar, onEditar, onExcluir, onRestaurar,
}: {
  f: FotoAdmin
  perm: Permissoes
  nomePico?: string
  onModerar: (f: FotoAdmin, status: 'aprovada' | 'ocultada' | 'rejeitada') => void
  onEditar: (f: FotoAdmin) => void
  onExcluir: (f: FotoAdmin) => void
  onRestaurar: (f: FotoAdmin) => void
}) {
  const removida = !!f.deleted_at || f.status === 'removida'
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 150, background: 'var(--cinza)', position: 'relative' }}>
        {f.videoUrl ? (
          // Moderador precisa ASSISTIR para julgar — controles nativos, sem autoplay.
          <video
            src={f.videoUrl}
            poster={f.url}
            controls
            muted
            playsInline
            preload="none"
            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: removida ? 'grayscale(1) opacity(.5)' : undefined }}
          />
        ) : f.url ? (
          <img src={f.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: removida ? 'grayscale(1) opacity(.5)' : undefined }} />
        ) : (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--muted)', fontSize: 12 }}>sem imagem</div>
        )}
        <div style={{ position: 'absolute', top: 8, left: 8 }}><StatusBadge status={f.status} /></div>
        {f.tipo === 'video' && (
          <span
            className="badge"
            style={{
              position: 'absolute', top: 8, right: 8, fontSize: 10,
              background: 'rgba(4,20,27,.72)', color: '#fff', pointerEvents: 'none',
            }}
          >
            vídeo · {Math.round(f.duracao_s ?? 5)}s
          </span>
        )}
      </div>
      <div className="pad" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          {nomePico ?? f.pico_id}
        </div>
        <div className="muted" style={{ fontSize: 12 }}>
          {fmtDataHora(f.capturada_em)}
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
              <button className="btn outline" style={{ minHeight: 36, padding: '0 12px', fontSize: 13 }} onClick={() => onEditar(f)}>
                <IconEdit size={15} /> Editar
              </button>
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
