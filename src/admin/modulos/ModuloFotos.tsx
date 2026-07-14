import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  IconRefresh,
} from '@tabler/icons-react'
import * as admin from '../../services/admin'
import { type Permissoes, type FotoAdmin } from '../../services/admin'
import { ConfirmDialog, Estado } from '../ui'
import { Titulo, type PicoAdm } from '../shared'
import { CartaoFoto } from './CartaoFoto'

type EditFoto = { foto: FotoAdmin; observacao: string; pico_id: string; capturada_em: string }

/** ISO → valor aceito por <input type="datetime-local"> (hora local, sem segundos). */
function paraDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export function ModuloFotos({ perm }: { perm: Permissoes }) {
  const [fotos, setFotos] = useState<FotoAdmin[] | null>(null)
  const [picos, setPicos] = useState<PicoAdm[]>([])
  const [erro, setErro] = useState('')
  const [dlg, setDlg] = useState<{ foto: FotoAdmin; motivo: string; hard: boolean } | null>(null)
  const [edit, setEdit] = useState<EditFoto | null>(null)
  const [trabalhando, setTrabalhando] = useState(false)

  const carregar = useCallback(() => {
    setErro('')
    admin.listarFotos().then(setFotos).catch((e) => setErro(String(e?.message ?? e)))
    admin.listarPicosAdmin().then(setPicos).catch(() => { /* nome do pico é decorativo; UUID como fallback */ })
  }, [])
  useEffect(() => carregar(), [carregar])

  const nomesPicos = useMemo(() => new Map(picos.map((p) => [p.id, [p.nome, p.municipio].filter(Boolean).join(' — ')])), [picos])

  async function moderar(f: FotoAdmin, status: 'aprovada' | 'ocultada' | 'rejeitada') {
    await admin.moderarFoto(f.id, status)
    setFotos((xs) => xs?.map((x) => (x.id === f.id ? { ...x, status } : x)) ?? null)
  }
  async function confirmarExcluir() {
    if (!dlg) return
    setTrabalhando(true)
    try {
      await admin.excluirFoto(dlg.foto.id, dlg.motivo.trim() || 'sem motivo informado', { hard: dlg.hard, path: dlg.foto.storage_path, videoPath: dlg.foto.video_path })
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

  function iniciarEdicao(f: FotoAdmin) {
    setEdit({ foto: f, observacao: f.observacao ?? '', pico_id: f.pico_id, capturada_em: paraDatetimeLocal(f.capturada_em) })
  }

  async function confirmarEdicao() {
    if (!edit) return
    setTrabalhando(true)
    try {
      const campos: { observacao: string | null; pico_id: string; capturada_em?: string } = {
        observacao: edit.observacao.trim() || null,
        pico_id: edit.pico_id,
      }
      if (edit.capturada_em) campos.capturada_em = new Date(edit.capturada_em).toISOString()
      await admin.editarFoto(edit.foto.id, campos)
      setFotos((xs) => xs?.map((x) => (x.id === edit.foto.id ? { ...x, ...campos, observacao: campos.observacao } : x)) ?? null)
      setEdit(null)
    } catch (e) {
      setErro(String((e as Error)?.message ?? e))
    } finally {
      setTrabalhando(false)
    }
  }

  return (
    <section className="admin-content">
      <Titulo
        nome="Fotos"
        desc="Modere e corrija o conteúdo enviado pela comunidade. Verifique rostos e dados sensíveis antes de aprovar."
        acao={<button className="btn outline" style={{ minHeight: 40 }} onClick={carregar}><IconRefresh size={16} /> Atualizar</button>}
      />
      {erro && <Estado>Erro ao carregar fotos.</Estado>}
      {!fotos && !erro && <Estado>Carregando…</Estado>}
      {fotos && fotos.length === 0 && <Estado>Nenhuma foto enviada ainda.</Estado>}
      {fotos && fotos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {fotos.map((f) => (
            <CartaoFoto key={f.id} f={f} perm={perm} nomePico={nomesPicos.get(f.pico_id)} onModerar={moderar} onEditar={iniciarEdicao} onExcluir={(x) => setDlg({ foto: x, motivo: '', hard: false })} onRestaurar={restaurar} />
          ))}
        </div>
      )}
      {edit && (
        <ConfirmDialog
          titulo="Editar registro"
          texto="Corrija a legenda, o pico vinculado ou o horário. Procedência e geofence são selos do servidor e não podem ser alterados. A edição fica registrada na auditoria."
          confirmar={trabalhando ? 'Salvando…' : 'Salvar'}
          onConfirmar={confirmarEdicao}
          onCancelar={() => setEdit(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            <label style={{ fontSize: 12.5, fontWeight: 600 }}>
              Pico vinculado
              <select className="sel" value={edit.pico_id} onChange={(e) => setEdit({ ...edit, pico_id: e.target.value })} style={{ width: '100%', marginTop: 4 }}>
                {!nomesPicos.has(edit.pico_id) && <option value={edit.pico_id}>{edit.pico_id}</option>}
                {picos.map((p) => (
                  <option key={p.id} value={p.id}>{[p.nome, p.municipio, p.uf].filter(Boolean).join(' — ')}</option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: 12.5, fontWeight: 600 }}>
              Data e hora da captura
              <input className="input" type="datetime-local" value={edit.capturada_em} onChange={(e) => setEdit({ ...edit, capturada_em: e.target.value })} style={{ width: '100%', marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12.5, fontWeight: 600 }}>
              Legenda / observação
              <textarea className="input" placeholder="Sem legenda" value={edit.observacao} onChange={(e) => setEdit({ ...edit, observacao: e.target.value })} style={{ width: '100%', marginTop: 4, minHeight: 70, resize: 'vertical' }} />
            </label>
          </div>
        </ConfirmDialog>
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
