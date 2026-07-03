import { useState, useEffect, useCallback } from 'react'
import {
  IconBan, IconCheck, IconDownload, IconEdit, IconRefresh, IconUserX,
} from '@tabler/icons-react'
import * as admin from '../../services/admin'
import { type Permissoes, type Papel, type UsuarioAdmin } from '../../services/admin'
import { RoleBadge, ConfirmDialog, Estado } from '../ui'
import { Titulo, fmtData, type Eu } from '../shared'

const TODOS_PAPEIS: Papel[] = ['user', 'analyst', 'moderator', 'admin', 'super_admin']

export function ModuloUsuarios({ eu, perm }: { eu: Eu; perm: Permissoes }) {
  const [users, setUsers] = useState<UsuarioAdmin[] | null>(null)
  const [erro, setErro] = useState('')
  const [dlgBloquear, setDlgBloquear] = useState<{ user: UsuarioAdmin; motivo: string } | null>(null)
  const [dlgExcluir, setDlgExcluir] = useState<{ user: UsuarioAdmin; motivo: string } | null>(null)
  const [trabalhando, setTrabalhando] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ nome: string; cidade: string }>({ nome: '', cidade: '' })

  function iniciarEdicao(u: UsuarioAdmin) {
    setEditando(u.id)
    setEditForm({ nome: u.nome ?? '', cidade: u.cidade ?? '' })
  }

  async function salvarEdicao(u: UsuarioAdmin) {
    setTrabalhando(true)
    try {
      await admin.editarUsuario(u.id, { nome: editForm.nome.trim(), cidade: editForm.cidade.trim() })
      setUsers((xs) => xs?.map((x) => (x.id === u.id ? { ...x, nome: editForm.nome.trim(), cidade: editForm.cidade.trim() } : x)) ?? null)
      setEditando(null)
    } catch (e) {
      setErro(String((e as Error)?.message ?? e))
    } finally {
      setTrabalhando(false)
    }
  }

  const carregar = useCallback(() => {
    setErro('')
    admin.listarUsuarios().then(setUsers).catch((e) => setErro(String(e?.message ?? e)))
  }, [])
  useEffect(() => carregar(), [carregar])

  // admin não cria super_admin; só super_admin gere admins e super_admins.
  const base: Papel[] = eu.papel === 'super_admin' ? TODOS_PAPEIS : ['user', 'analyst', 'moderator']

  async function mudar(u: UsuarioAdmin, papel: Papel) {
    setUsers((xs) => xs?.map((x) => (x.id === u.id ? { ...x, papel } : x)) ?? null)
    try {
      await admin.definirPapel(u.id, papel)
    } catch (e) {
      setErro(String((e as Error)?.message ?? e))
      admin.listarUsuarios().then(setUsers)
    }
  }

  async function confirmarBloquear() {
    if (!dlgBloquear) return
    setTrabalhando(true)
    try {
      const bloquear = !dlgBloquear.user.bloqueado_em
      await admin.bloquearUsuario(dlgBloquear.user.id, bloquear, dlgBloquear.motivo.trim() || undefined)
      setUsers((xs) => xs?.map((x) => (x.id === dlgBloquear.user.id ? { ...x, bloqueado_em: bloquear ? new Date().toISOString() : null } : x)) ?? null)
      setDlgBloquear(null)
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
      await admin.excluirUsuario(dlgExcluir.user.id, dlgExcluir.motivo.trim() || 'sem motivo informado')
      setUsers((xs) => xs?.filter((x) => x.id !== dlgExcluir.user.id) ?? null)
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
        nome="Usuários"
        desc="Gestão de papéis, bloqueio e exclusão de contas. Dados sensíveis não são exibidos (LGPD)."
        acao={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn outline" style={{ minHeight: 40 }} onClick={carregar}><IconRefresh size={16} /> Atualizar</button>
            <button className="btn outline" style={{ minHeight: 40 }} disabled={!users?.length} onClick={() => users && admin.baixarCSV('usuarios', users.map((u) => ({ id: u.id, nome: u.nome ?? '', cidade: u.cidade ?? '', papel: u.papel, onboarded: u.onboarded, bloqueado: u.bloqueado_em ? 'sim' : 'não', criado_em: u.criado_em })))}><IconDownload size={16} /> CSV</button>
          </div>
        }
      />
      {erro && <Estado>Erro ao carregar usuários.</Estado>}
      {!users && !erro && <Estado>Carregando…</Estado>}
      {users && (
        <div style={{ overflowX: 'auto' }}>
          <table className="adt">
            <thead><tr><th>Nome</th><th>Cidade</th><th>Cadastro</th><th>Status</th><th>Papel</th><th>Alterar</th><th>Ações</th></tr></thead>
            <tbody>
              {users.map((u) => {
                const opcoes = base.includes(u.papel) ? base : [...base, u.papel]
                const proprio = u.id === eu.id
                const bloqueado = !!u.bloqueado_em
                return (
                  <tr key={u.id} style={{ opacity: bloqueado ? 0.55 : undefined }}>
                    <td>
                      {editando === u.id
                        ? <input className="input" value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} style={{ minWidth: 120, padding: '4px 8px', fontSize: 13 }} />
                        : <>
                            {u.nome || <span className="muted">sem nome</span>}
                            {!u.onboarded && <span className="muted" style={{ fontSize: 11 }}> · incompleto</span>}
                          </>
                      }
                    </td>
                    <td>
                      {editando === u.id
                        ? <input className="input" value={editForm.cidade} onChange={(e) => setEditForm({ ...editForm, cidade: e.target.value })} style={{ minWidth: 100, padding: '4px 8px', fontSize: 13 }} />
                        : u.cidade || '—'
                      }
                    </td>
                    <td>{fmtData(u.criado_em)}</td>
                    <td>
                      {bloqueado
                        ? <span className="tag alerta" style={{ fontSize: 11 }}><IconBan size={12} stroke={2.2} /> bloqueado</span>
                        : <span className="tag ok" style={{ fontSize: 11 }}>ativo</span>
                      }
                    </td>
                    <td><RoleBadge papel={u.papel} /></td>
                    <td>
                      <select className="sel" value={u.papel} disabled={proprio} title={proprio ? 'Você não pode alterar o próprio papel' : ''} onChange={(e) => mudar(u, e.target.value as Papel)}>
                        {opcoes.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </td>
                    <td>
                      {editando === u.id ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn" style={{ minHeight: 34, padding: '0 10px', fontSize: 12.5 }} disabled={trabalhando} onClick={() => salvarEdicao(u)}>
                            <IconCheck size={14} /> Salvar
                          </button>
                          <button className="btn outline" style={{ minHeight: 34, padding: '0 10px', fontSize: 12.5 }} onClick={() => setEditando(null)}>
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn outline"
                            style={{ minHeight: 34, padding: '0 10px', fontSize: 12.5 }}
                            title="Corrigir nome e cidade"
                            onClick={() => iniciarEdicao(u)}
                          >
                            <IconEdit size={14} /> Editar
                          </button>
                          {!proprio && (
                            <>
                          <button
                            className="btn outline"
                            style={{ minHeight: 34, padding: '0 10px', fontSize: 12.5, color: bloqueado ? 'var(--turq)' : '#d97706', borderColor: bloqueado ? 'rgba(30,203,195,.3)' : '#d9770630' }}
                            title={bloqueado ? 'Desbloquear usuário' : 'Bloquear atividades do usuário'}
                            onClick={() => setDlgBloquear({ user: u, motivo: '' })}
                          >
                            <IconBan size={14} /> {bloqueado ? 'Desbloquear' : 'Bloquear'}
                          </button>
                          {perm.excluiPermanente && (
                            <button
                              className="btn outline"
                              style={{ minHeight: 34, padding: '0 10px', fontSize: 12.5, color: 'var(--perigo)', borderColor: 'var(--perigo-bg)' }}
                              title="Excluir conta permanentemente"
                              onClick={() => setDlgExcluir({ user: u, motivo: '' })}
                            >
                              <IconUserX size={14} /> Excluir
                            </button>
                          )}
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog: Bloquear / Desbloquear */}
      {dlgBloquear && (
        <ConfirmDialog
          titulo={dlgBloquear.user.bloqueado_em ? `Desbloquear ${dlgBloquear.user.nome || 'usuário'}?` : `Bloquear ${dlgBloquear.user.nome || 'usuário'}?`}
          texto={dlgBloquear.user.bloqueado_em
            ? 'O usuário voltará a poder fazer login e contribuir com fotos, alertas e mutirões.'
            : 'O usuário será impedido de fazer login e contribuir. Fotos e alertas existentes permanecem. Você pode desbloquear a qualquer momento.'
          }
          confirmar={trabalhando ? 'Processando…' : dlgBloquear.user.bloqueado_em ? 'Desbloquear' : 'Bloquear'}
          perigo={!dlgBloquear.user.bloqueado_em}
          onConfirmar={confirmarBloquear}
          onCancelar={() => setDlgBloquear(null)}
        >
          <textarea
            className="input"
            placeholder="Motivo (registrado na auditoria)"
            value={dlgBloquear.motivo}
            onChange={(e) => setDlgBloquear({ ...dlgBloquear, motivo: e.target.value })}
            style={{ marginTop: 12, minHeight: 60, resize: 'vertical' }}
          />
        </ConfirmDialog>
      )}

      {/* Dialog: Excluir conta */}
      {dlgExcluir && (
        <ConfirmDialog
          titulo={`Excluir conta de ${dlgExcluir.user.nome || 'usuário'}?`}
          texto="Ação IRREVERSÍVEL. Todos os dados do usuário serão apagados: fotos, alertas, mutirões, rascunhos e perfil. Registre o motivo obrigatoriamente."
          confirmar={trabalhando ? 'Excluindo…' : 'Excluir conta definitivamente'}
          perigo
          onConfirmar={confirmarExcluir}
          onCancelar={() => setDlgExcluir(null)}
        >
          <textarea
            className="input"
            placeholder="Motivo obrigatório (registrado na auditoria)"
            value={dlgExcluir.motivo}
            onChange={(e) => setDlgExcluir({ ...dlgExcluir, motivo: e.target.value })}
            style={{ marginTop: 12, minHeight: 70, resize: 'vertical' }}
          />
          <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(220,38,38,.08)', border: '1px solid rgba(220,38,38,.2)', fontSize: 12, color: 'var(--perigo)', lineHeight: 1.4 }}>
            ⚠️ Esta ação exclui todas as fotos, alertas e mutirões criados por este usuário. Não é possível desfazer.
          </div>
        </ConfirmDialog>
      )}
    </section>
  )
}

// ───────────────────────────────────────────────────────────────── Ameaças ──

