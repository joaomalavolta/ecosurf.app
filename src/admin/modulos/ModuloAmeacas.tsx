import { Fragment, useState, useEffect, useCallback } from 'react'
import {
  IconCheck, IconDownload, IconEdit, IconRefresh, IconTrash,
} from '@tabler/icons-react'
import * as admin from '../../services/admin'
import { type Permissoes } from '../../services/admin'
import { ConfirmDialog, Estado } from '../ui'
import { CATEGORIAS, categoriaPorId } from '../../components/SeletorCategoria'
import { Titulo, type Ameaca } from '../shared'

const AMEACA_STATUS = ['publicado', 'em-revisao', 'validado', 'sinalizado', 'ocultado', 'removido', 'identificado', 'em-observacao', 'recorrente', 'resolvido']
// Sai do catálogo em vez de repetir a lista: era exatamente essa cópia que
// deixaria a moderação sem as categorias novas depois da 0063.
const AMEACA_CATEGORIAS = CATEGORIAS.map((c) => c.id)
const AMEACA_GRAVIDADE = ['baixa', 'media', 'alta', 'critica']

export function ModuloAmeacas({ perm: _perm }: { perm: Permissoes }) {
  const [itens, setItens] = useState<Ameaca[] | null>(null)
  const [erro, setErro] = useState('')
  const [dlg, setDlg] = useState<{ a: Ameaca; motivo: string } | null>(null)
  const [trabalhando, setTrabalhando] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ titulo: string; categoria: string; gravidade: string; municipio: string; uf: string; descricao: string; local_nome: string }>({ titulo: '', categoria: '', gravidade: '', municipio: '', uf: '', descricao: '', local_nome: '' })

  const carregar = useCallback(() => {
    setErro('')
    admin.listarAmeacasAdmin().then(setItens).catch((e) => setErro(String(e?.message ?? e)))
  }, [])
  useEffect(() => carregar(), [carregar])

  async function mudarStatus(a: Ameaca, status: string) {
    setItens((xs) => xs?.map((x) => (x.id === a.id ? { ...x, status } : x)) ?? null)
    await admin.atualizarStatusAmeaca(a.id, status)
  }

  function iniciarEdicao(a: Ameaca) {
    setEditando(a.id)
    setEditForm({
      titulo: a.titulo,
      categoria: a.categoria,
      gravidade: (a as any).gravidade ?? 'media',
      municipio: a.municipio ?? '',
      uf: a.uf ?? '',
      descricao: (a as any).descricao ?? '',
      local_nome: (a as any).local_nome ?? '',
    })
  }

  async function salvarEdicao(a: Ameaca) {
    setTrabalhando(true)
    try {
      await admin.editarAmeaca(a.id, editForm)
      setItens((xs) => xs?.map((x) => (x.id === a.id ? { ...x, ...editForm } : x)) ?? null)
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
      await admin.excluirAmeaca(dlg.a.id, dlg.motivo.trim() || 'sem motivo informado')
      setItens((xs) => xs?.filter((x) => x.id !== dlg.a.id) ?? null)
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
        nome="Registros do mapa"
        desc="Alertas ambientais e registros positivos. Edite, altere status, exclua ou exporte."
        acao={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn outline" style={{ minHeight: 40 }} onClick={carregar}><IconRefresh size={16} /> Atualizar</button>
            <button className="btn outline" style={{ minHeight: 40 }} disabled={!itens?.length} onClick={() => itens && admin.baixarCSV('alertas', itens as unknown as Record<string, unknown>[])}><IconDownload size={16} /> CSV</button>
          </div>
        }
      />
      {erro && <Estado>Erro ao carregar registros.</Estado>}
      {!itens && !erro && <Estado>Carregando…</Estado>}
      {itens && itens.length === 0 && <Estado>Nenhum registro publicado.</Estado>}
      {itens && itens.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="adt">
            <thead><tr><th>Título</th><th>Tipo</th><th>Categoria</th><th>Gravidade</th><th>Local</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {itens.map((a) => {
                const isEditing = editando === a.id
                const cat = categoriaPorId(a.categoria)
                const ehPositivo = ((a as { tipo_registro?: string | null }).tipo_registro ?? cat.tipo) === 'positivo'
                return (
                  <Fragment key={a.id}>
                  <tr>
                    <td>
                      {isEditing
                        ? <input className="input" value={editForm.titulo} onChange={(e) => setEditForm({ ...editForm, titulo: e.target.value })} style={{ minWidth: 140, padding: '4px 8px', fontSize: 13 }} />
                        : a.titulo
                      }
                    </td>
                    {/* Coluna própria: sem ela, a moderação teria de decorar
                        quais categorias são positivas para ler a tabela. */}
                    <td>
                      <span style={{
                        fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap',
                        padding: '2px 8px', borderRadius: 999,
                        background: ehPositivo ? '#2E9B6B22' : '#E8485522',
                        color: ehPositivo ? '#2E9B6B' : '#E84855',
                      }}>
                        {ehPositivo ? 'positivo' : 'alerta'}
                      </span>
                    </td>
                    <td>
                      {isEditing
                        ? <select className="sel" value={editForm.categoria} onChange={(e) => setEditForm({ ...editForm, categoria: e.target.value })}>
                            {AMEACA_CATEGORIAS.map((c) => <option key={c} value={c}>{categoriaPorId(c).label}</option>)}
                          </select>
                        : cat.label
                      }
                    </td>
                    <td>
                      {isEditing && !ehPositivo
                        ? <select className="sel" value={editForm.gravidade} onChange={(e) => setEditForm({ ...editForm, gravidade: e.target.value })}>
                            {AMEACA_GRAVIDADE.map((g) => <option key={g} value={g}>{g}</option>)}
                          </select>
                        : ehPositivo ? '—' : (a as any).gravidade ?? '—'
                      }
                    </td>
                    <td>
                      {isEditing
                        ? <div style={{ display: 'flex', gap: 4 }}>
                            <input className="input" placeholder="Cidade" value={editForm.municipio} onChange={(e) => setEditForm({ ...editForm, municipio: e.target.value })} style={{ width: 100, padding: '4px 8px', fontSize: 13 }} />
                            <input className="input" placeholder="UF" maxLength={2} value={editForm.uf} onChange={(e) => setEditForm({ ...editForm, uf: e.target.value.toUpperCase() })} style={{ width: 46, padding: '4px 8px', fontSize: 13 }} />
                          </div>
                        : [a.municipio, a.uf].filter(Boolean).join(' / ') || '—'
                      }
                    </td>
                    <td>
                      <select className="sel" value={a.status} onChange={(e) => mudarStatus(a, e.target.value)}>
                        {AMEACA_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {isEditing ? (
                          <>
                            <button className="btn" style={{ minHeight: 34, padding: '0 10px', fontSize: 12.5 }} disabled={trabalhando} onClick={() => salvarEdicao(a)}>
                              <IconCheck size={14} /> Salvar
                            </button>
                            <button className="btn outline" style={{ minHeight: 34, padding: '0 10px', fontSize: 12.5 }} onClick={() => setEditando(null)}>
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button className="btn outline" style={{ minHeight: 34, padding: '0 10px', fontSize: 12.5 }} onClick={() => iniciarEdicao(a)}>
                              <IconEdit size={14} /> Editar
                            </button>
                            <button className="btn outline" style={{ minHeight: 34, padding: '0 10px', fontSize: 12.5, color: 'var(--perigo)', borderColor: 'var(--perigo-bg)' }} onClick={() => setDlg({ a, motivo: '' })}>
                              <IconTrash size={14} /> Excluir
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isEditing && (
                    <tr>
                      <td colSpan={7} style={{ background: 'var(--cinza, rgba(0,0,0,.03))' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 4px' }}>
                          <label style={{ fontSize: 12, fontWeight: 600 }}>
                            Nome do local
                            <input className="input" placeholder="Ex.: Foz do Rio Itanhaém" value={editForm.local_nome} onChange={(e) => setEditForm({ ...editForm, local_nome: e.target.value })} style={{ width: '100%', marginTop: 4, padding: '6px 8px', fontSize: 13 }} />
                          </label>
                          <label style={{ fontSize: 12, fontWeight: 600 }}>
                            Descrição
                            <textarea className="input" placeholder="Descrição do problema" value={editForm.descricao} onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })} style={{ width: '100%', marginTop: 4, minHeight: 70, resize: 'vertical', padding: '6px 8px', fontSize: 13 }} />
                          </label>
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {dlg && (
        <ConfirmDialog titulo="Excluir alerta?" texto="Ação definitiva. Registre o motivo." confirmar={trabalhando ? 'Excluindo…' : 'Excluir'} perigo onConfirmar={confirmarExcluir} onCancelar={() => setDlg(null)}>
          <textarea className="input" placeholder="Motivo" value={dlg.motivo} onChange={(e) => setDlg({ ...dlg, motivo: e.target.value })} style={{ marginTop: 12, minHeight: 60 }} />
        </ConfirmDialog>
      )}
    </section>
  )
}

// ──────────────────────────────────────────────────────────────────── Picos ──

