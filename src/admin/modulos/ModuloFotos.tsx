import { useState, useEffect, useCallback } from 'react'
import {
  IconRefresh,
} from '@tabler/icons-react'
import * as admin from '../../services/admin'
import { type Permissoes, type FotoAdmin } from '../../services/admin'
import { ConfirmDialog, Estado } from '../ui'
import { Titulo } from '../shared'
import { CartaoFoto } from './CartaoFoto'

export function ModuloFotos({ perm }: { perm: Permissoes }) {
  const [fotos, setFotos] = useState<FotoAdmin[] | null>(null)
  const [erro, setErro] = useState('')
  const [dlg, setDlg] = useState<{ foto: FotoAdmin; motivo: string; hard: boolean } | null>(null)
  const [trabalhando, setTrabalhando] = useState(false)

  const carregar = useCallback(() => {
    setErro('')
    admin.listarFotos().then(setFotos).catch((e) => setErro(String(e?.message ?? e)))
  }, [])
  useEffect(() => carregar(), [carregar])

  async function moderar(f: FotoAdmin, status: 'aprovada' | 'ocultada' | 'rejeitada') {
    await admin.moderarFoto(f.id, status)
    setFotos((xs) => xs?.map((x) => (x.id === f.id ? { ...x, status } : x)) ?? null)
  }
  async function confirmarExcluir() {
    if (!dlg) return
    setTrabalhando(true)
    try {
      await admin.excluirFoto(dlg.foto.id, dlg.motivo.trim() || 'sem motivo informado', { hard: dlg.hard, path: dlg.foto.storage_path })
      if (dlg.hard) {
        setFotos((xs) => xs?.filter((x) => x.id !== dlg.foto.id) ?? null)
      } else {
        setFotos((xs) => xs?.map((x) => (x.id === dlg.foto.id ? { ...x, status: 'removida', deleted_at: new Date().toISOString() } : x)) ?? null)
      }
      setDlg(null)
    } catch (e) {
      setErro(String((e as Error)?.message ?? e))
    } finally {
      setTrabalhando(false)
    }
  }
  async function restaurar(f: FotoAdmin) {
    await admin.restaurarFoto(f.id)
    setFotos((xs) => xs?.map((x) => (x.id === f.id ? { ...x, status: 'aprovada', deleted_at: null } : x)) ?? null)
  }

  return (
    <section className="admin-content">
      <Titulo
        nome="Fotos"
        desc="Modere o conteúdo enviado pela comunidade. Verifique rostos e dados sensíveis antes de aprovar."
        acao={<button className="btn outline" style={{ minHeight: 40 }} onClick={carregar}><IconRefresh size={16} /> Atualizar</button>}
      />
      {erro && <Estado>Erro ao carregar fotos.</Estado>}
      {!fotos && !erro && <Estado>Carregando…</Estado>}
      {fotos && fotos.length === 0 && <Estado>Nenhuma foto enviada ainda.</Estado>}
      {fotos && fotos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {fotos.map((f) => (
            <CartaoFoto key={f.id} f={f} perm={perm} onModerar={moderar} onExcluir={(x) => setDlg({ foto: x, motivo: '', hard: false })} onRestaurar={restaurar} />
          ))}
        </div>
      )}
      {dlg && (
        <ConfirmDialog
          titulo={dlg.hard ? 'Excluir foto definitivamente?' : 'Remover foto?'}
          texto={dlg.hard ? 'Esta ação não pode ser desfeita e apaga o arquivo do armazenamento.' : 'A foto sai do ar, mas pode ser restaurada. Registre o motivo.'}
          confirmar={trabalhando ? 'Processando…' : dlg.hard ? 'Excluir de vez' : 'Remover'}
          perigo
          onConfirmar={confirmarExcluir}
          onCancelar={() => setDlg(null)}
        >
          <textarea
            className="input"
            placeholder="Motivo (registrado na auditoria)"
            value={dlg.motivo}
            onChange={(e) => setDlg({ ...dlg, motivo: e.target.value })}
            style={{ marginTop: 12, minHeight: 70, resize: 'vertical' }}
          />
          {perm.excluiPermanente && (
            <label className="row" style={{ marginTop: 10, fontSize: 13 }}>
              <input type="checkbox" checked={dlg.hard} onChange={(e) => setDlg({ ...dlg, hard: e.target.checked })} />
              Excluir definitivamente (não recuperável)
            </label>
          )}
        </ConfirmDialog>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────── Registros ──
