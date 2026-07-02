import { useState, useEffect, useCallback } from 'react'
import {
  IconCheck, IconDownload, IconEdit, IconRefresh, IconTrash,
} from '@tabler/icons-react'
import * as admin from '../../services/admin'
import { type Permissoes, type MutiraoAdmin } from '../../services/admin'
import { ConfirmDialog, Estado } from '../ui'
import { Titulo } from '../shared'

const MUTIRAO_STATUS = ['rascunho', 'agendado', 'realizado', 'cancelado']
const MUTIRAO_TIPOS = ['limpeza', 'monitoramento', 'plantio', 'educacao']

export function ModuloMutiroes({ perm: _perm }: { perm: Permissoes }) {
  const [itens, setItens] = useState<MutiraoAdmin[] | null>(null)
  const [erro, setErro] = useState('')
  const [dlg, setDlg] = useState<{ m: MutiraoAdmin; motivo: string } | null>(null)
  const [trabalhando, setTrabalhando] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Record<string, string | number | null>>({})

  const carregar = useCallback(() => {
    setErro('')
    admin.listarMutiroesAdmin().then(setItens).catch((e) => setErro(String(e?.message ?? e)))
  }, [])
  useEffect(() => carregar(), [carregar])

  async function mudarStatus(m: MutiraoAdmin, status: string) {
    setItens((xs) => xs?.map((x) => (x.id === m.id ? { ...x, status } : x)) ?? null)
    await admin.atualizarStatusMutirao(m.id, status)
  }

  function iniciarEdicao(m: MutiraoAdmin) {
    setEditando(m.id)
    setEditForm({
      titulo: m.titulo,
      tipo_acao: m.tipo_acao ?? 'limpeza',
      municipio: m.municipio ?? '',
      uf: m.uf ?? '',
      quando: m.quando ?? '',
      horario: m.horario ?? '',
      vagas: m.vagas ?? '',
      organizador: m.organizador ?? '',
      instituicao: m.instituicao ?? '',
      contato: m.contato ?? '',
      ponto_encontro: m.ponto_encontro ?? '',
      descricao: m.descricao ?? '',
      info_voluntarios: m.info_voluntarios ?? '',
    })
  }

  async function salvarEdicao(m: MutiraoAdmin) {
    setTrabalhando(true)
    try {
      const campos = {
        ...editForm,
        vagas: editForm.vagas ? Number(editForm.vagas) : null,
      }
      await admin.editarMutirao(m.id, campos)
      setItens((xs) => xs?.map((x) => (x.id === m.id ? { ...x, ...campos } : x)) ?? null)
      setEditando(null)
    } catch (e) {
      setErro(String((e as Error)?.message ?? e))
    } finally {
      setTrabalhando(false)
    }
  }

  async function confirmarExcluir() {
    if (!dlg) return
    setTrabalhando(true)
    try {
      await admin.excluirMutirao(dlg.m.id, dlg.motivo.trim() || 'sem motivo informado')
      setItens((xs) => xs?.filter((x) => x.id !== dlg.m.id) ?? null)
      setDlg(null)
    } catch (e) {
      setErro(String((e as Error)?.message ?? e))
    } finally {
      setTrabalhando(false)
    }
  }

  return (
    <section className="admin-content">
      <Titulo
        nome="Mutirões"
        desc="Gestão de mutirões criados pela comunidade. Edite, altere status ou exclua."
        acao={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn outline" style={{ minHeight: 40 }} onClick={carregar}><IconRefresh size={16} /> Atualizar</button>
            <button className="btn outline" style={{ minHeight: 40 }} disabled={!itens?.length} onClick={() => itens && admin.baixarCSV('mutiroes', itens as unknown as Record<string, unknown>[])}><IconDownload size={16} /> CSV</button>
          </div>
        }
      />
      {erro && <Estado>Erro ao carregar mutirões.</Estado>}
      {!itens && !erro && <Estado>Carregando…</Estado>}
      {itens && itens.length === 0 && <Estado>Nenhum mutirão registrado.</Estado>}
      {itens && itens.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="adt">
            <thead><tr><th>Título</th><th>Tipo</th><th>Local</th><th>Data</th><th>Vagas</th><th>Organizador</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {itens.map((m) => {
                const isEditing = editando === m.id
                return (
                  <tr key={m.id}>
                    <td>
                      {isEditing
                        ? <input className="input" value={String(editForm.titulo ?? '')} onChange={(e) => setEditForm({ ...editForm, titulo: e.target.value })} style={{ minWidth: 140, padding: '4px 8px', fontSize: 13 }} />
                        : m.titulo
                      }
                    </td>
                    <td>
                      {isEditing
                        ? <select className="sel" value={String(editForm.tipo_acao ?? 'limpeza')} onChange={(e) => setEditForm({ ...editForm, tipo_acao: e.target.value })}>
                            {MUTIRAO_TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        : m.tipo_acao ?? '—'
                      }
                    </td>
                    <td>
                      {isEditing
                        ? <div style={{ display: 'flex', gap: 4 }}>
                            <input className="input" placeholder="Cidade" value={String(editForm.municipio ?? '')} onChange={(e) => setEditForm({ ...editForm, municipio: e.target.value })} style={{ width: 100, padding: '4px 8px', fontSize: 13 }} />
                            <input className="input" placeholder="UF" maxLength={2} value={String(editForm.uf ?? '')} onChange={(e) => setEditForm({ ...editForm, uf: e.target.value.toUpperCase() })} style={{ width: 46, padding: '4px 8px', fontSize: 13 }} />
                          </div>
                        : [m.municipio, m.uf].filter(Boolean).join(' / ') || '—'
                      }
                    </td>
                    <td>
                      {isEditing
                        ? <input className="input" type="date" value={String(editForm.quando ?? '').slice(0, 10)} onChange={(e) => setEditForm({ ...editForm, quando: e.target.value })} style={{ padding: '4px 8px', fontSize: 13 }} />
                        : m.quando ? new Date(m.quando).toLocaleDateString('pt-BR') : '—'
                      }
                    </td>
                    <td>
                      {isEditing
                        ? <input className="input" type="number" min={0} value={String(editForm.vagas ?? '')} onChange={(e) => setEditForm({ ...editForm, vagas: e.target.value })} style={{ width: 60, padding: '4px 8px', fontSize: 13 }} />
                        : m.vagas != null ? `${m.inscritos ?? 0}/${m.vagas}` : '—'
                      }
                    </td>
                    <td>
                      {isEditing
                        ? <input className="input" value={String(editForm.organizador ?? '')} onChange={(e) => setEditForm({ ...editForm, organizador: e.target.value })} style={{ minWidth: 100, padding: '4px 8px', fontSize: 13 }} />
                        : m.organizador ?? '—'
                      }
                    </td>
                    <td>
                      <select className="sel" value={m.status} onChange={(e) => mudarStatus(m, e.target.value)}>
                        {MUTIRAO_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {isEditing ? (
                          <>
                            <button className="btn" style={{ minHeight: 34, padding: '0 10px', fontSize: 12.5 }} disabled={trabalhando} onClick={() => salvarEdicao(m)}>
                              <IconCheck size={14} /> Salvar
                            </button>
                            <button className="btn outline" style={{ minHeight: 34, padding: '0 10px', fontSize: 12.5 }} onClick={() => setEditando(null)}>
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button className="btn outline" style={{ minHeight: 34, padding: '0 10px', fontSize: 12.5 }} onClick={() => iniciarEdicao(m)}>
                              <IconEdit size={14} /> Editar
                            </button>
                            <button className="btn outline" style={{ minHeight: 34, padding: '0 10px', fontSize: 12.5, color: 'var(--perigo)', borderColor: 'var(--perigo-bg)' }} onClick={() => setDlg({ m, motivo: '' })}>
                              <IconTrash size={14} /> Excluir
                            </button>
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

      {/* Campos extras de edição (quando editando, mostrar abaixo da tabela) */}
      {editando && (
        <div className="card pad" style={{ marginTop: 16 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--azul-abissal)' }}>📝 Campos adicionais do mutirão</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="muted" style={{ fontSize: 11.5 }}>Horário</label>
              <input className="input" value={String(editForm.horario ?? '')} onChange={(e) => setEditForm({ ...editForm, horario: e.target.value })} placeholder="07:00 às 12:00" style={{ fontSize: 13 }} />
            </div>
            <div>
              <label className="muted" style={{ fontSize: 11.5 }}>Instituição</label>
              <input className="input" value={String(editForm.instituicao ?? '')} onChange={(e) => setEditForm({ ...editForm, instituicao: e.target.value })} style={{ fontSize: 13 }} />
            </div>
            <div>
              <label className="muted" style={{ fontSize: 11.5 }}>Contato</label>
              <input className="input" value={String(editForm.contato ?? '')} onChange={(e) => setEditForm({ ...editForm, contato: e.target.value })} style={{ fontSize: 13 }} />
            </div>
            <div>
              <label className="muted" style={{ fontSize: 11.5 }}>Ponto de encontro</label>
              <input className="input" value={String(editForm.ponto_encontro ?? '')} onChange={(e) => setEditForm({ ...editForm, ponto_encontro: e.target.value })} style={{ fontSize: 13 }} />
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <label className="muted" style={{ fontSize: 11.5 }}>Descrição</label>
            <textarea className="input" value={String(editForm.descricao ?? '')} onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })} style={{ minHeight: 60, resize: 'vertical', fontSize: 13 }} />
          </div>
          <div style={{ marginTop: 10 }}>
            <label className="muted" style={{ fontSize: 11.5 }}>Informações para voluntários</label>
            <textarea className="input" value={String(editForm.info_voluntarios ?? '')} onChange={(e) => setEditForm({ ...editForm, info_voluntarios: e.target.value })} style={{ minHeight: 50, resize: 'vertical', fontSize: 13 }} />
          </div>
        </div>
      )}

      {dlg && (
        <ConfirmDialog
          titulo={`Excluir mutirão "${dlg.m.titulo}"?`}
          texto="Ação definitiva. O mutirão será removido do mapa e da lista de ações."
          confirmar={trabalhando ? 'Excluindo…' : 'Excluir mutirão'}
          perigo
          onConfirmar={confirmarExcluir}
          onCancelar={() => setDlg(null)}
        >
          <textarea className="input" placeholder="Motivo (registrado na auditoria)" value={dlg.motivo} onChange={(e) => setDlg({ ...dlg, motivo: e.target.value })} style={{ marginTop: 12, minHeight: 60, resize: 'vertical' }} />
        </ConfirmDialog>
      )}
    </section>
  )
}

