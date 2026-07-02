import { useState, useEffect, useCallback } from 'react'
import {
  IconCheck, IconDownload, IconEdit, IconRefresh, IconTrash,
} from '@tabler/icons-react'
import * as admin from '../../services/admin'
import { type Permissoes } from '../../services/admin'
import { ConfirmDialog, Estado } from '../ui'
import { Titulo, type PicoAdm } from '../shared'

const FUNDOS: Array<'areia' | 'pedra' | 'misto'> = ['areia', 'pedra', 'misto']

export function ModuloPicos({ perm }: { perm: Permissoes }) {
  const [picos, setPicos] = useState<PicoAdm[] | null>(null)
  const [erro, setErro] = useState('')
  const [editando, setEditando] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ nome: string; praia: string; municipio: string; uf: string; fundo: string }>({ nome: '', praia: '', municipio: '', uf: '', fundo: 'areia' })
  const [dlgExcluir, setDlgExcluir] = useState<{ pico: PicoAdm; motivo: string } | null>(null)
  const [trabalhando, setTrabalhando] = useState(false)

  const carregar = useCallback(() => {
    setErro('')
    admin.listarPicosAdmin().then(setPicos).catch((e) => setErro(String(e?.message ?? e)))
  }, [])
  useEffect(() => carregar(), [carregar])

  function iniciarEdicao(p: PicoAdm) {
    setEditando(p.id)
    setEditForm({ nome: p.nome, praia: p.praia, municipio: p.municipio ?? '', uf: p.uf ?? '', fundo: p.fundo })
  }

  async function salvarEdicao(p: PicoAdm) {
    setTrabalhando(true)
    try {
      await admin.editarPico(p.id, editForm)
      setPicos((xs) => xs?.map((x) => (x.id === p.id ? { ...x, ...editForm } : x)) ?? null)
      setEditando(null)
    } catch (e) {
      setErro(String((e as Error)?.message ?? e))
    } finally {
      setTrabalhando(false)
    }
  }

  async function confirmarExcluir() {
    if (!dlgExcluir) return
    setTrabalhando(true)
    try {
      await admin.excluirPico(dlgExcluir.pico.id, dlgExcluir.motivo.trim() || 'sem motivo informado')
      setPicos((xs) => xs?.filter((x) => x.id !== dlgExcluir.pico.id) ?? null)
      setDlgExcluir(null)
    } catch (e) {
      setErro(String((e as Error)?.message ?? e))
    } finally {
      setTrabalhando(false)
    }
  }

  return (
    <section className="admin-content">
      <Titulo
        nome="Picos"
        desc="Catálogo de picos. Todo pico é público — edite ou exclua."
        acao={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn outline" style={{ minHeight: 40 }} onClick={carregar}><IconRefresh size={16} /> Atualizar</button>
            <button className="btn outline" style={{ minHeight: 40 }} disabled={!picos?.length} onClick={() => picos && admin.baixarCSV('picos', picos as unknown as Record<string, unknown>[])}><IconDownload size={16} /> CSV</button>
          </div>
        }
      />
      {erro && <Estado>Erro ao carregar picos.</Estado>}
      {!picos && !erro && <Estado>Carregando…</Estado>}
      {picos && (
        <div style={{ overflowX: 'auto' }}>
          <table className="adt">
            <thead><tr><th>Nome</th><th>Praia</th><th>Local</th><th>Fundo</th><th>Ações</th></tr></thead>
            <tbody>
              {picos.map((p) => {
                const isEditing = editando === p.id
                return (
                  <tr key={p.id}>
                    <td>
                      {isEditing
                        ? <input className="input" value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} style={{ minWidth: 120, padding: '4px 8px', fontSize: 13 }} />
                        : p.nome
                      }
                    </td>
                    <td>
                      {isEditing
                        ? <input className="input" value={editForm.praia} onChange={(e) => setEditForm({ ...editForm, praia: e.target.value })} style={{ minWidth: 100, padding: '4px 8px', fontSize: 13 }} />
                        : p.praia
                      }
                    </td>
                    <td>
                      {isEditing
                        ? <div style={{ display: 'flex', gap: 4 }}>
                            <input className="input" placeholder="Cidade" value={editForm.municipio} onChange={(e) => setEditForm({ ...editForm, municipio: e.target.value })} style={{ width: 100, padding: '4px 8px', fontSize: 13 }} />
                            <input className="input" placeholder="UF" maxLength={2} value={editForm.uf} onChange={(e) => setEditForm({ ...editForm, uf: e.target.value.toUpperCase() })} style={{ width: 46, padding: '4px 8px', fontSize: 13 }} />
                          </div>
                        : [p.municipio, p.uf].filter(Boolean).join(' / ') || '—'
                      }
                    </td>
                    <td>
                      {isEditing
                        ? <select className="sel" value={editForm.fundo} onChange={(e) => setEditForm({ ...editForm, fundo: e.target.value })}>
                            {FUNDOS.map((f) => <option key={f} value={f}>{f}</option>)}
                          </select>
                        : p.fundo
                      }
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {isEditing ? (
                          <>
                            <button className="btn" style={{ minHeight: 34, padding: '0 10px', fontSize: 12.5 }} disabled={trabalhando} onClick={() => salvarEdicao(p)}>
                              <IconCheck size={14} /> Salvar
                            </button>
                            <button className="btn outline" style={{ minHeight: 34, padding: '0 10px', fontSize: 12.5 }} onClick={() => setEditando(null)}>
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button className="btn outline" style={{ minHeight: 34, padding: '0 10px', fontSize: 12.5 }} onClick={() => iniciarEdicao(p)}>
                              <IconEdit size={14} /> Editar
                            </button>
                            {perm.excluiPermanente && (
                              <button className="btn outline" style={{ minHeight: 34, padding: '0 10px', fontSize: 12.5, color: 'var(--perigo)', borderColor: 'var(--perigo-bg)' }} onClick={() => setDlgExcluir({ pico: p, motivo: '' })}>
                                <IconTrash size={14} /> Excluir
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {dlgExcluir && (
        <ConfirmDialog
          titulo={`Excluir pico "${dlgExcluir.pico.nome}"?`}
          texto="Ação IRREVERSÍVEL. Todas as fotos e alertas associados a este pico também serão excluídos."
          confirmar={trabalhando ? 'Excluindo…' : 'Excluir pico'}
          perigo
          onConfirmar={confirmarExcluir}
          onCancelar={() => setDlgExcluir(null)}
        >
          <textarea className="input" placeholder="Motivo obrigatório (registrado na auditoria)" value={dlgExcluir.motivo} onChange={(e) => setDlgExcluir({ ...dlgExcluir, motivo: e.target.value })} style={{ marginTop: 12, minHeight: 60, resize: 'vertical' }} />
          <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(220,38,38,.08)', border: '1px solid rgba(220,38,38,.2)', fontSize: 12, color: 'var(--perigo)', lineHeight: 1.4 }}>
            ⚠️ Isto exclui o pico + todas as fotos e alertas vinculados. Não é possível desfazer.
          </div>
        </ConfirmDialog>
      )}
    </section>
  )
}

// ───────────────────────────────────────────────────────────────────── Logs ──
