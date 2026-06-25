import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  IconLayoutDashboard, IconPhoto, IconClipboardList, IconUsers, IconAlertTriangle,
  IconMapPin, IconReportAnalytics, IconHistory, IconSettings, IconMenu2, IconLogout,
  IconShieldLock, IconArrowBackUp, IconTrash, IconCheck, IconEyeOff, IconRefresh,
  IconDownload, IconArrowBackUp as IconRestaurar, IconBan, IconUserX, IconArrowLeft,
  IconEdit, IconHeartHandshake,
} from '@tabler/icons-react'
import { temBackend } from '../services/api'
import { enviarCodigo, confirmarCodigo } from '../services/perfil'
import * as admin from '../services/admin'
import { permissoes, meuStatus, type Papel, type Permissoes, type Indicadores, type FotoAdmin, type UsuarioAdmin, type MutiraoAdmin } from '../services/admin'
import { StatCard, StatusBadge, RoleBadge, ConfirmDialog, Estado } from '../admin/ui'

type Ameaca = Awaited<ReturnType<typeof admin.listarAmeacasAdmin>>[number]
type PicoAdm = Awaited<ReturnType<typeof admin.listarPicosAdmin>>[number]
type LogItem = Awaited<ReturnType<typeof admin.listarLogs>>[number]
type Eu = { id?: string; papel: Papel; email?: string }

type ModId = 'dashboard' | 'fotos' | 'registros' | 'usuarios' | 'ameacas' | 'picos' | 'relatorios' | 'logs' | 'mutiroes' | 'config'

const MODULOS: { id: ModId; rotulo: string; Icone: typeof IconPhoto; pode: (p: Permissoes) => boolean }[] = [
  { id: 'dashboard', rotulo: 'Painel', Icone: IconLayoutDashboard, pode: (p) => p.acessa },
  { id: 'fotos', rotulo: 'Fotos', Icone: IconPhoto, pode: (p) => p.modera },
  { id: 'registros', rotulo: 'Registros', Icone: IconClipboardList, pode: (p) => p.acessa },
  { id: 'usuarios', rotulo: 'Usuários', Icone: IconUsers, pode: (p) => p.gerenciaUsuarios },
  { id: 'ameacas', rotulo: 'Alertas', Icone: IconAlertTriangle, pode: (p) => p.modera },
  { id: 'picos', rotulo: 'Picos', Icone: IconMapPin, pode: (p) => p.gerenciaPicos },
  { id: 'relatorios', rotulo: 'Relatórios', Icone: IconReportAnalytics, pode: (p) => p.acessa },
  { id: 'logs', rotulo: 'Logs', Icone: IconHistory, pode: (p) => p.veLogs },
  { id: 'mutiroes', rotulo: 'Mutirões', Icone: IconUsers, pode: (p) => p.acessa },
  { id: 'config', rotulo: 'Configurações', Icone: IconSettings, pode: (p) => p.acessa },
]

const fmtData = (s?: string | null) => (s ? new Date(s).toLocaleDateString('pt-BR') : '—')
const fmtDataHora = (s?: string | null) => (s ? new Date(s).toLocaleString('pt-BR') : '—')

// ─────────────────────────────────────────────────────────── helpers de UI ──
function Titulo({ nome, desc, acao }: { nome: string; desc?: string; acao?: ReactNode }) {
  return (
    <div className="between" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
      <div>
        <h2 style={{ fontSize: 20, color: 'var(--azul-abissal)' }}>{nome}</h2>
        {desc && <p className="muted" style={{ marginTop: 4 }}>{desc}</p>}
      </div>
      {acao}
    </div>
  )
}

function TelaCheia({ children }: { children: ReactNode }) {
  return (
    <div className="admin" style={{ display: 'grid', placeItems: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>{children}</div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────── Dashboard ──
function Dashboard() {
  const [ind, setInd] = useState<Indicadores | null>(null)
  const [erro, setErro] = useState('')
  useEffect(() => {
    admin.indicadores().then(setInd).catch((e) => setErro(String(e?.message ?? e)))
  }, [])
  return (
    <section className="admin-content">
      <Titulo nome="Painel" desc="Visão geral da plataforma." />
      {erro && <Estado>Não foi possível carregar os indicadores.</Estado>}
      {!ind && !erro && <Estado>Carregando…</Estado>}
      {ind && (
        <>
          <div className="admin-grid">
            <StatCard k="Usuários" v={ind.usuarios} />
            <StatCard k="Picos" v={ind.picos} />
            <StatCard k="Fotos ativas" v={ind.fotos} />
            <StatCard k="Fotos pendentes" v={ind.fotosPendentes} />
            <StatCard k="Fotos removidas" v={ind.fotosRemovidas} />
            <StatCard k="Alertas" v={ind.ameacas} />
            <StatCard k="Mutirões" v={ind.mutiroes} />
            <StatCard k="Bloqueados" v={ind.bloqueados} />
            <StatCard k="Ações registradas" v={ind.logs} />
          </div>
          {ind.fotosPendentes > 0 && (
            <div className="card pad" style={{ marginTop: 16 }}>
              <span className="eyebrow">Atenção</span>
              <p style={{ marginTop: 6 }}>
                {ind.fotosPendentes} foto(s) aguardando moderação.
              </p>
            </div>
          )}
          {ind.bloqueados > 0 && (
            <div className="card pad" style={{ marginTop: 8, borderLeft: '4px solid #d97706' }}>
              <span className="eyebrow">Usuários bloqueados</span>
              <p style={{ marginTop: 6 }}>
                {ind.bloqueados} usuário(s) com atividades suspensas.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────── Fotos ──
function CartaoFoto({
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

function ModuloFotos({ perm }: { perm: Permissoes }) {
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
function ModuloRegistros() {
  const [fotos, setFotos] = useState<FotoAdmin[] | null>(null)
  const [erro, setErro] = useState('')
  useEffect(() => {
    admin.listarFotos().then(setFotos).catch((e) => setErro(String(e?.message ?? e)))
  }, [])

  function exportar() {
    if (!fotos) return
    admin.baixarCSV('registros', fotos.map((f) => ({
      id: f.id, pico: f.pico_id, capturada_em: f.capturada_em, status: f.status,
      procedencia: f.procedencia, geofence_ok: f.geofence_ok, observacao: f.observacao ?? '',
    })))
  }

  return (
    <section className="admin-content">
      <Titulo
        nome="Registros"
        desc="Todos os registros de condição enviados (foto + metadados)."
        acao={<button className="btn outline" style={{ minHeight: 40 }} disabled={!fotos?.length} onClick={exportar}><IconDownload size={16} /> CSV</button>}
      />
      {erro && <Estado>Erro ao carregar registros.</Estado>}
      {!fotos && !erro && <Estado>Carregando…</Estado>}
      {fotos && fotos.length === 0 && <Estado>Sem registros.</Estado>}
      {fotos && fotos.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="adt">
            <thead><tr><th>Pico</th><th>Capturada</th><th>Procedência</th><th>Geofence</th><th>Status</th></tr></thead>
            <tbody>
              {fotos.map((f) => (
                <tr key={f.id}>
                  <td>{f.pico_id}</td>
                  <td>{fmtData(f.capturada_em)}</td>
                  <td>{f.procedencia}</td>
                  <td>{f.geofence_ok ? 'ok' : 'não'}</td>
                  <td><StatusBadge status={f.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

// ──────────────────────────────────────────────────────────────── Usuários ──
const TODOS_PAPEIS: Papel[] = ['user', 'analyst', 'moderator', 'admin', 'super_admin']

function ModuloUsuarios({ eu, perm }: { eu: Eu; perm: Permissoes }) {
  const [users, setUsers] = useState<UsuarioAdmin[] | null>(null)
  const [erro, setErro] = useState('')
  const [dlgBloquear, setDlgBloquear] = useState<{ user: UsuarioAdmin; motivo: string } | null>(null)
  const [dlgExcluir, setDlgExcluir] = useState<{ user: UsuarioAdmin; motivo: string } | null>(null)
  const [trabalhando, setTrabalhando] = useState(false)

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
        desc="Gestão de papéis, bloqueio e exclusão de contas. CPF e dados sensíveis não são exibidos (LGPD)."
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
                      {u.nome || <span className="muted">sem nome</span>}
                      {!u.onboarded && <span className="muted" style={{ fontSize: 11 }}> · incompleto</span>}
                    </td>
                    <td>{u.cidade || '—'}</td>
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
                      {!proprio && (
                        <div style={{ display: 'flex', gap: 6 }}>
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
const AMEACA_STATUS = ['publicado', 'em-revisao', 'validado', 'sinalizado', 'ocultado', 'removido', 'identificado', 'em-observacao', 'recorrente', 'resolvido']
const AMEACA_CATEGORIAS = ['lixo-praia', 'lixo-rio', 'esgoto', 'erosao', 'oleo', 'animal', 'entulho', 'microplasticos', 'espuma', 'queimada', 'ocupacao', 'outro']
const AMEACA_GRAVIDADE = ['baixa', 'media', 'alta', 'critica']

function ModuloAmeacas({ perm }: { perm: Permissoes }) {
  const [itens, setItens] = useState<Ameaca[] | null>(null)
  const [erro, setErro] = useState('')
  const [dlg, setDlg] = useState<{ a: Ameaca; motivo: string } | null>(null)
  const [trabalhando, setTrabalhando] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ titulo: string; categoria: string; gravidade: string; municipio: string; uf: string; descricao: string }>({ titulo: '', categoria: '', gravidade: '', municipio: '', uf: '', descricao: '' })

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
        nome="Alertas Ambientais"
        desc="Registros ambientais colaborativos. Edite, altere status, exclua ou exporte."
        acao={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn outline" style={{ minHeight: 40 }} onClick={carregar}><IconRefresh size={16} /> Atualizar</button>
            <button className="btn outline" style={{ minHeight: 40 }} disabled={!itens?.length} onClick={() => itens && admin.baixarCSV('alertas', itens as unknown as Record<string, unknown>[])}><IconDownload size={16} /> CSV</button>
          </div>
        }
      />
      {erro && <Estado>Erro ao carregar alertas.</Estado>}
      {!itens && !erro && <Estado>Carregando…</Estado>}
      {itens && itens.length === 0 && <Estado>Nenhum alerta registrado.</Estado>}
      {itens && itens.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="adt">
            <thead><tr><th>Título</th><th>Categoria</th><th>Gravidade</th><th>Local</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {itens.map((a) => {
                const isEditing = editando === a.id
                return (
                  <tr key={a.id}>
                    <td>
                      {isEditing
                        ? <input className="input" value={editForm.titulo} onChange={(e) => setEditForm({ ...editForm, titulo: e.target.value })} style={{ minWidth: 140, padding: '4px 8px', fontSize: 13 }} />
                        : a.titulo
                      }
                    </td>
                    <td>
                      {isEditing
                        ? <select className="sel" value={editForm.categoria} onChange={(e) => setEditForm({ ...editForm, categoria: e.target.value })}>
                            {AMEACA_CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        : a.categoria
                      }
                    </td>
                    <td>
                      {isEditing
                        ? <select className="sel" value={editForm.gravidade} onChange={(e) => setEditForm({ ...editForm, gravidade: e.target.value })}>
                            {AMEACA_GRAVIDADE.map((g) => <option key={g} value={g}>{g}</option>)}
                          </select>
                        : (a as any).gravidade ?? '—'
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
const VISIBILIDADES: Array<'publico' | 'comunidade' | 'abafado'> = ['publico', 'comunidade', 'abafado']
const FUNDOS: Array<'areia' | 'pedra' | 'misto'> = ['areia', 'pedra', 'misto']

function ModuloPicos({ perm }: { perm: Permissoes }) {
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

  async function mudarVisibilidade(p: PicoAdm, visibilidade: 'publico' | 'comunidade' | 'abafado') {
    setPicos((xs) => xs?.map((x) => (x.id === p.id ? { ...x, visibilidade } : x)) ?? null)
    await admin.definirVisibilidade(p.id, visibilidade)
  }

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
        desc="Catálogo de picos. Edite, exclua ou altere a visibilidade."
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
            <thead><tr><th>Nome</th><th>Praia</th><th>Local</th><th>Fundo</th><th>Visibilidade</th><th>Ações</th></tr></thead>
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
                      <select className="sel" value={p.visibilidade} onChange={(e) => mudarVisibilidade(p, e.target.value as 'publico' | 'comunidade' | 'abafado')}>
                        {VISIBILIDADES.map((v) => <option key={v} value={v}>{v}</option>)}
                      </select>
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
function ModuloLogs({ perm }: { perm: Permissoes }) {
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
function ModuloRelatorios() {
  const [carregando, setCarregando] = useState('')
  async function exportar(nome: string, fn: () => Promise<Record<string, unknown>[]>) {
    setCarregando(nome)
    try {
      admin.baixarCSV(nome, await fn())
    } finally {
      setCarregando('')
    }
  }
  const itens: { nome: string; rotulo: string; fn: () => Promise<Record<string, unknown>[]> }[] = [
    { nome: 'usuarios', rotulo: 'Usuários', fn: async () => (await admin.listarUsuarios()).map((u) => ({ id: u.id, nome: u.nome ?? '', cidade: u.cidade ?? '', papel: u.papel, onboarded: u.onboarded, criado_em: u.criado_em })) },
    { nome: 'picos', rotulo: 'Picos', fn: async () => admin.listarPicosAdmin() as Promise<Record<string, unknown>[]> },
    { nome: 'ameacas', rotulo: 'Ameaças', fn: async () => admin.listarAmeacasAdmin() as Promise<Record<string, unknown>[]> },
    { nome: 'fotos', rotulo: 'Fotos', fn: async () => (await admin.listarFotos()).map((f) => ({ id: f.id, pico: f.pico_id, capturada_em: f.capturada_em, status: f.status, procedencia: f.procedencia, geofence_ok: f.geofence_ok })) },
    { nome: 'logs', rotulo: 'Logs', fn: async () => admin.listarLogs() as Promise<Record<string, unknown>[]> },
  ]
  return (
    <section className="admin-content">
      <Titulo nome="Relatórios" desc="Exporte os dados em CSV. Dados sensíveis (CPF, localização exata) ficam de fora." />
      <div className="admin-grid">
        {itens.map((it) => (
          <button key={it.nome} className="stat" style={{ textAlign: 'left', cursor: 'pointer', border: 0 }} disabled={!!carregando} onClick={() => exportar(it.nome, it.fn)}>
            <div className="row" style={{ gap: 8 }}><IconDownload size={18} /> <b>{it.rotulo}</b></div>
            <div className="k" style={{ marginTop: 4 }}>{carregando === it.nome ? 'gerando…' : 'baixar CSV'}</div>
          </button>
        ))}
      </div>
    </section>
  )
}

const MUTIRAO_STATUS = ['rascunho', 'agendado', 'realizado', 'cancelado']
const MUTIRAO_TIPOS = ['limpeza', 'monitoramento', 'plantio', 'educacao']

function ModuloMutiroes({ perm }: { perm: Permissoes }) {
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

function ModuloConfig({ eu, onSair }: { eu: Eu; onSair: () => void }) {
  return (
    <section className="admin-content">
      <Titulo nome="Configurações" />
      <div className="card pad stack">
        <div><span className="eyebrow">Sessão</span><div style={{ marginTop: 6 }}>{eu.email}</div></div>
        <div><span className="eyebrow">Papel</span><div style={{ marginTop: 6 }}><RoleBadge papel={eu.papel} /></div></div>
        <button className="btn outline" style={{ alignSelf: 'flex-start' }} onClick={onSair}><IconLogout size={16} /> Encerrar sessão</button>
      </div>
    </section>
  )
}

// ──────────────────────────────────────────────────────────────────── Login ──
function LoginAdmin({ onEntrar }: { onEntrar: () => void }) {
  const [etapa, setEtapa] = useState<'email' | 'codigo'>('email')
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  async function enviar() {
    setErro(''); setOcupado(true)
    try { await enviarCodigo(email); setEtapa('codigo') }
    catch (e) { setErro(String((e as Error)?.message ?? e)) }
    finally { setOcupado(false) }
  }
  async function confirmar() {
    setErro(''); setOcupado(true)
    try { await confirmarCodigo(email, codigo); onEntrar() }
    catch (e) { setErro('Código inválido ou expirado.'); setOcupado(false) }
  }

  return (
    <TelaCheia>
      <div className="card pad stack" style={{ textAlign: 'center' }}>
        <div style={{ display: 'grid', placeItems: 'center', gap: 8 }}>
          <IconShieldLock size={34} stroke={1.6} color="var(--azul)" />
          <h2 style={{ fontSize: 19, color: 'var(--azul-abissal)' }}>Painel Ecosurf</h2>
          <p className="muted">Acesso restrito à equipe. Entre com seu e-mail.</p>
        </div>
        {etapa === 'email' ? (
          <>
            <input className="input" type="email" inputMode="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="btn full" disabled={ocupado || !email.includes('@')} onClick={enviar}>{ocupado ? 'Enviando…' : 'Enviar código'}</button>
          </>
        ) : (
          <>
            <input className="input" inputMode="numeric" placeholder="Código do e-mail" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
            <button className="btn full" disabled={ocupado || codigo.length < 4} onClick={confirmar}>{ocupado ? 'Verificando…' : 'Entrar'}</button>
            <button className="btn outline full" onClick={() => setEtapa('email')}>Trocar e-mail</button>
          </>
        )}
        {erro && <p className="muted" style={{ color: 'var(--perigo)' }}>{erro}</p>}
        <Link to="/" style={{ color: 'var(--muted)', fontSize: 13 }}>← Voltar ao app</Link>
      </div>
    </TelaCheia>
  )
}

function NaoAutorizado({ eu, onSair }: { eu: Eu; onSair: () => void }) {
  return (
    <TelaCheia>
      <div className="card pad stack" style={{ textAlign: 'center' }}>
        <IconShieldLock size={34} stroke={1.6} color="var(--perigo)" style={{ margin: '0 auto' }} />
        <h2 style={{ fontSize: 19, color: 'var(--azul-abissal)' }}>Acesso não autorizado</h2>
        <p className="muted">Sua conta ({eu.email}) não tem permissão para o painel. Fale com um administrador.</p>
        <button className="btn outline full" onClick={onSair}><IconLogout size={16} /> Sair</button>
        <Link to="/" className="btn full">Ir para o app</Link>
      </div>
    </TelaCheia>
  )
}

// ─────────────────────────────────────────────────────────── AdminPage (raiz) ──
export function AdminPage() {
  const [eu, setEu] = useState<Eu | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [aba, setAba] = useState<ModId>('dashboard')
  const [menu, setMenu] = useState(false)
  const navigate = useNavigate()

  const carregar = useCallback(() => {
    setCarregando(true)
    meuStatus().then((s) => { setEu(s); setCarregando(false) })
  }, [])
  useEffect(() => { carregar() }, [carregar])

  const sair = useCallback(async () => {
    await admin.sair()
    setEu({ papel: 'user' })
  }, [])

  if (!temBackend()) {
    return <TelaCheia><div className="card pad" style={{ textAlign: 'center' }}><h2 style={{ fontSize: 18 }}>Backend não configurado</h2><p className="muted" style={{ marginTop: 8 }}>O painel precisa do Supabase ativo.</p></div></TelaCheia>
  }
  if (carregando || !eu) {
    return <TelaCheia><p className="muted" style={{ textAlign: 'center' }}>Carregando painel…</p></TelaCheia>
  }
  if (!eu.id) return <LoginAdmin onEntrar={carregar} />
  const perm = permissoes(eu.papel)
  if (!perm.acessa) return <NaoAutorizado eu={eu} onSair={sair} />

  const modulos = MODULOS.filter((m) => m.pode(perm))
  const abaAtiva = modulos.some((m) => m.id === aba) ? aba : 'dashboard'

  function abrir(id: ModId) { setAba(id); setMenu(false) }

  return (
    <div className="admin">
      <header className="admin-topbar">
        <button className="ic admin-menu-btn" aria-label="Menu" style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={() => setMenu((v) => !v)}><IconMenu2 size={22} /></button>
        <button
          onClick={() => navigate('/')}
          aria-label="Voltar ao app"
          title="Voltar ao app"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)',
            borderRadius: 10, padding: '5px 12px', cursor: 'pointer',
            color: 'rgba(255,255,255,.85)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
          }}
        >
          <IconArrowLeft size={16} stroke={2.2} /> Voltar
        </button>
        <span className="marca">Painel Ecosurf</span>
        <div style={{ flex: 1 }} />
        <span className="muted admin-email" style={{ fontSize: 12.5 }}>{eu.email}</span>
        <RoleBadge papel={eu.papel} />
        <button className="ic" aria-label="Sair" title="Sair" style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={sair}><IconLogout size={19} /></button>
      </header>

      <div className="admin-body">
        <div className={`admin-backdrop ${menu ? 'aberta' : ''}`} onClick={() => setMenu(false)} />
        <nav className={`admin-sidebar ${menu ? 'aberta' : ''}`}>
          {modulos.map((m) => (
            <button key={m.id} className={abaAtiva === m.id ? 'active' : ''} onClick={() => abrir(m.id)}>
              <m.Icone size={18} stroke={1.8} /> {m.rotulo}
            </button>
          ))}
          <Link to="/" className="row" style={{ color: 'rgba(255,255,255,.7)', textDecoration: 'none', padding: '10px 12px', fontSize: 13, marginTop: 8 }}>
            <IconArrowBackUp size={16} /> Voltar ao app
          </Link>
        </nav>

        <main className="admin-main">
          {abaAtiva === 'dashboard' && <Dashboard />}
          {abaAtiva === 'fotos' && <ModuloFotos perm={perm} />}
          {abaAtiva === 'registros' && <ModuloRegistros />}
          {abaAtiva === 'usuarios' && <ModuloUsuarios eu={eu} perm={perm} />}
          {abaAtiva === 'ameacas' && <ModuloAmeacas perm={perm} />}
          {abaAtiva === 'picos' && <ModuloPicos perm={perm} />}
          {abaAtiva === 'relatorios' && <ModuloRelatorios />}
          {abaAtiva === 'logs' && <ModuloLogs perm={perm} />}
          {abaAtiva === 'mutiroes' && <ModuloMutiroes perm={perm} />}
          {abaAtiva === 'config' && <ModuloConfig eu={eu} onSair={sair} />}
        </main>
      </div>
    </div>
  )
}
