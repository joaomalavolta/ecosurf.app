import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  IconLayoutDashboard, IconPhoto, IconClipboardList, IconUsers, IconAlertTriangle,
  IconMapPin, IconReportAnalytics, IconHistory, IconSettings, IconMenu2, IconLogout,
  IconShieldLock, IconArrowBackUp, IconTrash, IconCheck, IconEyeOff, IconRefresh,
  IconDownload, IconArrowBackUp as IconRestaurar,
} from '@tabler/icons-react'
import { temBackend } from '../services/api'
import { enviarCodigo, confirmarCodigo } from '../services/perfil'
import * as admin from '../services/admin'
import { permissoes, meuStatus, type Papel, type Permissoes, type Indicadores, type FotoAdmin, type UsuarioAdmin } from '../services/admin'
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
  { id: 'ameacas', rotulo: 'Ameaças', Icone: IconAlertTriangle, pode: (p) => p.modera },
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
            <StatCard k="Ameaças" v={ind.ameacas} />
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

function ModuloUsuarios({ eu }: { eu: Eu }) {
  const [users, setUsers] = useState<UsuarioAdmin[] | null>(null)
  const [erro, setErro] = useState('')
  useEffect(() => {
    admin.listarUsuarios().then(setUsers).catch((e) => setErro(String(e?.message ?? e)))
  }, [])

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

  return (
    <section className="admin-content">
      <Titulo
        nome="Usuários"
        desc="Gestão de papéis e acesso. CPF e dados sensíveis não são exibidos (LGPD)."
        acao={<button className="btn outline" style={{ minHeight: 40 }} disabled={!users?.length} onClick={() => users && admin.baixarCSV('usuarios', users.map((u) => ({ id: u.id, nome: u.nome ?? '', cidade: u.cidade ?? '', papel: u.papel, onboarded: u.onboarded, criado_em: u.criado_em })))}><IconDownload size={16} /> CSV</button>}
      />
      {erro && <Estado>Erro ao carregar usuários.</Estado>}
      {!users && !erro && <Estado>Carregando…</Estado>}
      {users && (
        <div style={{ overflowX: 'auto' }}>
          <table className="adt">
            <thead><tr><th>Nome</th><th>Cidade</th><th>Cadastro</th><th>Papel</th><th>Alterar</th></tr></thead>
            <tbody>
              {users.map((u) => {
                const opcoes = base.includes(u.papel) ? base : [...base, u.papel]
                const proprio = u.id === eu.id
                return (
                  <tr key={u.id}>
                    <td>{u.nome || <span className="muted">sem nome</span>}{!u.onboarded && <span className="muted" style={{ fontSize: 11 }}> · incompleto</span>}</td>
                    <td>{u.cidade || '—'}</td>
                    <td>{fmtData(u.criado_em)}</td>
                    <td><RoleBadge papel={u.papel} /></td>
                    <td>
                      <select className="sel" value={u.papel} disabled={proprio} title={proprio ? 'Você não pode alterar o próprio papel' : ''} onChange={(e) => mudar(u, e.target.value as Papel)}>
                        {opcoes.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

// ───────────────────────────────────────────────────────────────── Ameaças ──
const AMEACA_STATUS = ['identificado', 'em-observacao', 'recorrente', 'resolvido']

function ModuloAmeacas({ perm }: { perm: Permissoes }) {
  const [itens, setItens] = useState<Ameaca[] | null>(null)
  const [erro, setErro] = useState('')
  const [dlg, setDlg] = useState<{ a: Ameaca; motivo: string } | null>(null)
  useEffect(() => {
    admin.listarAmeacasAdmin().then(setItens).catch((e) => setErro(String(e?.message ?? e)))
  }, [])

  async function mudarStatus(a: Ameaca, status: string) {
    setItens((xs) => xs?.map((x) => (x.id === a.id ? { ...x, status } : x)) ?? null)
    await admin.atualizarStatusAmeaca(a.id, status)
  }
  async function confirmarExcluir() {
    if (!dlg) return
    await admin.excluirAmeaca(dlg.a.id, dlg.motivo.trim() || 'sem motivo informado')
    setItens((xs) => xs?.filter((x) => x.id !== dlg.a.id) ?? null)
    setDlg(null)
  }

  return (
    <section className="admin-content">
      <Titulo nome="Ameaças" desc="Denúncias ambientais. A localização exata fica protegida; aqui só município/UF." />
      {erro && <Estado>Erro ao carregar ameaças.</Estado>}
      {!itens && !erro && <Estado>Carregando…</Estado>}
      {itens && itens.length === 0 && <Estado>Nenhuma ameaça registrada.</Estado>}
      {itens && itens.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="adt">
            <thead><tr><th>Título</th><th>Categoria</th><th>Local</th><th>Status</th>{perm.excluiPermanente && <th></th>}</tr></thead>
            <tbody>
              {itens.map((a) => (
                <tr key={a.id}>
                  <td>{a.titulo}</td>
                  <td>{a.categoria}</td>
                  <td>{[a.municipio, a.uf].filter(Boolean).join(' / ') || '—'}</td>
                  <td>
                    <select className="sel" value={a.status} onChange={(e) => mudarStatus(a, e.target.value)}>
                      {AMEACA_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  {perm.excluiPermanente && (
                    <td><button className="btn outline" style={{ minHeight: 34, padding: '0 10px', fontSize: 12.5, color: 'var(--perigo)' }} onClick={() => setDlg({ a, motivo: '' })}><IconTrash size={14} /></button></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {dlg && (
        <ConfirmDialog titulo="Excluir ameaça?" texto="Ação definitiva. Registre o motivo." confirmar="Excluir" perigo onConfirmar={confirmarExcluir} onCancelar={() => setDlg(null)}>
          <textarea className="input" placeholder="Motivo" value={dlg.motivo} onChange={(e) => setDlg({ ...dlg, motivo: e.target.value })} style={{ marginTop: 12, minHeight: 60 }} />
        </ConfirmDialog>
      )}
    </section>
  )
}

// ──────────────────────────────────────────────────────────────────── Picos ──
const VISIBILIDADES: Array<'publico' | 'comunidade' | 'abafado'> = ['publico', 'comunidade', 'abafado']

function ModuloPicos() {
  const [picos, setPicos] = useState<PicoAdm[] | null>(null)
  const [erro, setErro] = useState('')
  useEffect(() => {
    admin.listarPicosAdmin().then(setPicos).catch((e) => setErro(String(e?.message ?? e)))
  }, [])

  async function mudar(p: PicoAdm, visibilidade: 'publico' | 'comunidade' | 'abafado') {
    setPicos((xs) => xs?.map((x) => (x.id === p.id ? { ...x, visibilidade } : x)) ?? null)
    await admin.definirVisibilidade(p.id, visibilidade)
  }

  return (
    <section className="admin-content">
      <Titulo nome="Picos" desc="Catálogo de picos. A visibilidade controla o que aparece no radar público." />
      {erro && <Estado>Erro ao carregar picos.</Estado>}
      {!picos && !erro && <Estado>Carregando…</Estado>}
      {picos && (
        <div style={{ overflowX: 'auto' }}>
          <table className="adt">
            <thead><tr><th>Nome</th><th>Praia</th><th>Local</th><th>Fundo</th><th>Visibilidade</th></tr></thead>
            <tbody>
              {picos.map((p) => (
                <tr key={p.id}>
                  <td>{p.nome}</td>
                  <td>{p.praia}</td>
                  <td>{[p.municipio, p.uf].filter(Boolean).join(' / ') || '—'}</td>
                  <td>{p.fundo}</td>
                  <td>
                    <select className="sel" value={p.visibilidade} onChange={(e) => mudar(p, e.target.value as 'publico' | 'comunidade' | 'abafado')}>
                      {VISIBILIDADES.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

// ───────────────────────────────────────────────────────────────────── Logs ──
function ModuloLogs() {
  const [logs, setLogs] = useState<LogItem[] | null>(null)
  const [erro, setErro] = useState('')
  useEffect(() => {
    admin.listarLogs().then(setLogs).catch((e) => setErro(String(e?.message ?? e)))
  }, [])
  return (
    <section className="admin-content">
      <Titulo
        nome="Logs de auditoria"
        desc="Toda ação administrativa é registrada (quem, o quê, quando)."
        acao={<button className="btn outline" style={{ minHeight: 40 }} disabled={!logs?.length} onClick={() => logs && admin.baixarCSV('logs', logs)}><IconDownload size={16} /> CSV</button>}
      />
      {erro && <Estado>Erro ao carregar logs.</Estado>}
      {!logs && !erro && <Estado>Carregando…</Estado>}
      {logs && logs.length === 0 && <Estado>Sem registros de auditoria ainda.</Estado>}
      {logs && logs.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="adt">
            <thead><tr><th>Quando</th><th>Papel</th><th>Ação</th><th>Item</th><th>Motivo</th></tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{fmtDataHora(l.criado_em)}</td>
                  <td>{l.papel}</td>
                  <td>{l.acao}</td>
                  <td>{l.item_tipo} {l.item_id?.slice(0, 8)}</td>
                  <td>{l.motivo || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

function Stub({ titulo }: { titulo: string }) {
  return (
    <section className="admin-content">
      <Titulo nome={titulo} />
      <Estado>Módulo em construção. Em breve por aqui.</Estado>
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
          {abaAtiva === 'usuarios' && <ModuloUsuarios eu={eu} />}
          {abaAtiva === 'ameacas' && <ModuloAmeacas perm={perm} />}
          {abaAtiva === 'picos' && <ModuloPicos />}
          {abaAtiva === 'relatorios' && <ModuloRelatorios />}
          {abaAtiva === 'logs' && <ModuloLogs />}
          {abaAtiva === 'mutiroes' && <Stub titulo="Mutirões" />}
          {abaAtiva === 'config' && <ModuloConfig eu={eu} onSair={sair} />}
        </main>
      </div>
    </div>
  )
}
