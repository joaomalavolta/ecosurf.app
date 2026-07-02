import { useState, useEffect, useCallback } from 'react'
import {
  IconDownload, IconRefresh, IconTrash,
} from '@tabler/icons-react'
import * as admin from '../../services/admin'
import { type Permissoes } from '../../services/admin'
import { ConfirmDialog, Estado } from '../ui'
import { Titulo, fmtDataHora, type LogItem } from '../shared'

export function ModuloLogs({ perm }: { perm: Permissoes }) {
  const [logs, setLogs] = useState<LogItem[] | null>(null)
  const [erro, setErro] = useState('')
  const [dlgLimpar, setDlgLimpar] = useState(false)
  const [trabalhando, setTrabalhando] = useState(false)

  const carregar = useCallback(() => {
    setErro('')
    admin.listarLogs().then(setLogs).catch((e) => setErro(String(e?.message ?? e)))
  }, [])
  useEffect(() => carregar(), [carregar])

  async function excluirUm(id: string) {
    try {
      await admin.excluirLog(id)
      setLogs((xs) => xs?.filter((x) => x.id !== id) ?? null)
    } catch (e) {
      setErro(String((e as Error)?.message ?? e))
    }
  }

  async function confirmarLimpar() {
    setTrabalhando(true)
    try {
      await admin.limparLogs()
      setLogs([])
      setDlgLimpar(false)
    } catch (e) {
      setErro(String((e as Error)?.message ?? e))
    } finally {
      setTrabalhando(false)
    }
  }

  return (
    <section className="admin-content">
      <Titulo
        nome="Logs de auditoria"
        desc="Toda ação administrativa é registrada (quem, o quê, quando)."
        acao={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn outline" style={{ minHeight: 40 }} onClick={carregar}><IconRefresh size={16} /> Atualizar</button>
            <button className="btn outline" style={{ minHeight: 40 }} disabled={!logs?.length} onClick={() => logs && admin.baixarCSV('logs', logs)}><IconDownload size={16} /> CSV</button>
            {perm.excluiPermanente && (
              <button className="btn outline" style={{ minHeight: 40, color: 'var(--perigo)', borderColor: 'var(--perigo-bg)' }} disabled={!logs?.length} onClick={() => setDlgLimpar(true)}>
                <IconTrash size={16} /> Limpar tudo
              </button>
            )}
          </div>
        }
      />
      {erro && <Estado>Erro ao carregar logs.</Estado>}
      {!logs && !erro && <Estado>Carregando…</Estado>}
      {logs && logs.length === 0 && <Estado>Sem registros de auditoria ainda.</Estado>}
      {logs && logs.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="adt">
            <thead><tr><th>Quando</th><th>Papel</th><th>Ação</th><th>Item</th><th>Motivo</th>{perm.excluiPermanente && <th></th>}</tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{fmtDataHora(l.criado_em)}</td>
                  <td>{l.papel}</td>
                  <td>{l.acao}</td>
                  <td>{l.item_tipo} {l.item_id?.slice(0, 8)}</td>
                  <td>{l.motivo || '—'}</td>
                  {perm.excluiPermanente && (
                    <td>
                      <button className="btn outline" style={{ minHeight: 30, padding: '0 8px', fontSize: 12, color: 'var(--perigo)' }} onClick={() => excluirUm(l.id)} title="Excluir log">
                        <IconTrash size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {dlgLimpar && (
        <ConfirmDialog
          titulo="Limpar todos os logs?"
          texto="Ação IRREVERSÍVEL. Todos os registros de auditoria serão apagados. Considere exportar o CSV antes."
          confirmar={trabalhando ? 'Limpando…' : 'Limpar todos os logs'}
          perigo
          onConfirmar={confirmarLimpar}
          onCancelar={() => setDlgLimpar(false)}
        />
      )}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────── Relatórios ──
