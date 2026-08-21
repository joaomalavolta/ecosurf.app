import { Fragment, useState, useEffect, useCallback } from 'react'
import {
  IconCheck, IconDownload, IconEdit, IconRefresh, IconTrash,
} from '@tabler/icons-react'
import * as admin from '../../services/admin'
import { type Permissoes } from '../../services/admin'
import { ConfirmDialog, Estado } from '../ui'
import { CATEGORIAS, categoriaPorId } from '../../components/SeletorCategoria'
import type { ModeracaoRegistro } from '../../types/domain'
import { Titulo, type Ameaca } from '../shared'

/**
 * O CICLO DE VIDA da ocorrência — e só ele.
 *
 * Esta lista tinha dez valores; o `ameacas_status_check` aceita quatro. Os seis
 * extras ('publicado', 'em-revisao', 'validado', 'sinalizado', 'ocultado',
 * 'removido') faziam o UPDATE voltar 23514, e como o erro era engolido a tabela
 * mostrava o valor novo até a próxima recarga. Visibilidade agora tem controle
 * próprio, na coluna `moderacao` — ver migration 0069.
 */
const AMEACA_STATUS = ['identificado', 'em-observacao', 'recorrente', 'resolvido']

const MODERACAO: { valor: ModeracaoRegistro; rotulo: string; cor: string }[] = [
  { valor: 'visivel', rotulo: 'No ar', cor: '#2E9B6B' },
  { valor: 'oculto', rotulo: 'Oculto', cor: '#C17817' },
  { valor: 'removido', rotulo: 'Removido', cor: '#E84855' },
]
// Sai do catálogo em vez de repetir a lista: era exatamente essa cópia que
// deixaria a moderação sem as categorias novas depois da 0063.
const AMEACA_CATEGORIAS = CATEGORIAS.map((c) => c.id)
const AMEACA_GRAVIDADE = ['baixa', 'media', 'alta', 'critica']

/** Linha antiga (antes da 0069) não traz a coluna; ausente = está no ar. */
const moderacaoDe = (a: Ameaca): ModeracaoRegistro =>
  (((a as { moderacao?: string | null }).moderacao ?? 'visivel') as ModeracaoRegistro)

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

  /**
   * A tela pintava a linha ANTES do await e nunca olhava o resultado. Agora
   * pinta otimista (a resposta é boa) mas DESFAZ se o banco recusar — e diz
   * por quê, em vez de deixar um valor fantasma até a próxima recarga.
   */
  async function mudarStatus(a: Ameaca, status: string) {
    const antes = a.status
    setItens((xs) => xs?.map((x) => (x.id === a.id ? { ...x, status } : x)) ?? null)
    try {
      await admin.atualizarStatusAmeaca(a.id, status)
      setErro('')
    } catch (e) {
      setItens((xs) => xs?.map((x) => (x.id === a.id ? { ...x, status: antes } : x)) ?? null)
      setErro(`Não deu para mudar o status: ${(e as Error)?.message ?? e}`)
    }
  }

  /** Tira do ar (ou devolve). Escreve em `moderacao`, não em `status`. */
  async function mudarModeracao(a: Ameaca, moderacao: ModeracaoRegistro) {
    const antes = (a as { moderacao?: string }).moderacao ?? 'visivel'
    setItens((xs) => xs?.map((x) => (x.id === a.id ? { ...x, moderacao } : x)) ?? null)
    try {
      await admin.definirModeracaoAmeaca(a.id, moderacao)
      setErro('')
    } catch (e) {
      setItens((xs) => xs?.map((x) => (x.id === a.id ? { ...x, moderacao: antes } : x)) ?? null)
      setErro(`Não deu para mudar a visibilidade: ${(e as Error)?.message ?? e}`)
    }
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
      {/* Dizia sempre "Erro ao carregar" mesmo quando o erro vinha de um
          UPDATE. Agora mostra a mensagem real — é ela que revela um CHECK
          recusando o valor. */}
      {erro && <Estado>{erro}</Estado>}
      {!itens && !erro && <Estado>Carregando…</Estado>}
      {itens && itens.length === 0 && <Estado>Nenhum registro publicado.</Estado>}
      {itens && itens.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="adt">
            <thead><tr><th>Título</th><th>Tipo</th><th>Categoria</th><th>Gravidade</th><th>Local</th><th>Status</th><th>Visibilidade</th><th>Ações</th></tr></thead>
            <tbody>
              {itens.map((a) => {
                const isEditing = editando === a.id
                const cat = categoriaPorId(a.categoria)
                const ehPositivo = ((a as { tipo_registro?: string | null }).tipo_registro ?? cat.tipo) === 'positivo'
                const fora = moderacaoDe(a) !== 'visivel'
                return (
                  <Fragment key={a.id}>
                  {/* Linha fora do ar recua: sem isso a moderação teria de ler
                      o seletor de cada linha para saber o que está publicado. */}
                  <tr style={fora ? { opacity: 0.55 } : undefined}>
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
                    {/* O eixo que faltava. Escreve em `moderacao`, então
                        esconder não apaga o ciclo de vida ao lado. */}
                    <td>
                      <select
                        className="sel"
                        value={moderacaoDe(a)}
                        onChange={(e) => mudarModeracao(a, e.target.value as ModeracaoRegistro)}
                        style={{ color: MODERACAO.find((m) => m.valor === moderacaoDe(a))?.cor, fontWeight: 600 }}
                      >
                        {MODERACAO.map((m) => <option key={m.valor} value={m.valor}>{m.rotulo}</option>)}
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
                      <td colSpan={8} style={{ background: 'var(--cinza, rgba(0,0,0,.03))' }}>
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

