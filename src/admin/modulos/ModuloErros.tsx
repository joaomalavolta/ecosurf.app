import { useState, useEffect, useCallback } from 'react'
import { IconRefresh, IconTrash, IconBug } from '@tabler/icons-react'
import * as admin from '../../services/admin'
import { ConfirmDialog, Estado } from '../ui'
import { Titulo, fmtDataHora } from '../shared'

type ErroFront = Awaited<ReturnType<typeof admin.listarErrosFront>>[number]

/** Resumo curto do aparelho a partir do user agent. */
function resumoDevice(ua: string | null): string {
  if (!ua) return '—'
  if (/iPhone|iPad/.test(ua)) return 'iOS'
  if (/Android/.test(ua)) return 'Android'
  if (/Windows/.test(ua)) return 'Windows'
  if (/Macintosh/.test(ua)) return 'Mac'
  return 'outro'
}

export function ModuloErros() {
  const [erros, setErros] = useState<ErroFront[] | null>(null)
  const [erro, setErro] = useState('')
  const [aberto, setAberto] = useState<string | null>(null)
  const [dlgLimpar, setDlgLimpar] = useState(false)
  const [trabalhando, setTrabalhando] = useState(false)

  const carregar = useCallback(() => {
    setErro('')
    admin.listarErrosFront().then(setErros).catch((e) => setErro(String((e as Error)?.message ?? e)))
  }, [])
  useEffect(() => carregar(), [carregar])

  async function confirmarLimpar() {
    setTrabalhando(true)
    try {
      await admin.limparErrosFront()
      setErros([])
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
        nome="Erros do app"
        desc="Erros de JavaScript capturados nos aparelhos dos usuários (rota, aparelho e detalhe técnico)."
        acao={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn outline" style={{ minHeight: 40 }} onClick={carregar}><IconRefresh size={16} /> Atualizar</button>
            <button className="btn outline" style={{ minHeight: 40 }} disabled={!erros?.length} onClick={() => erros && admin.baixarCSV('erros-front', erros)}>CSV</button>
            <button className="btn outline" style={{ minHeight: 40, color: 'var(--perigo)', borderColor: 'var(--perigo-bg)' }} disabled={!erros?.length} onClick={() => setDlgLimpar(true)}>
              <IconTrash size={16} /> Limpar
            </button>
          </div>
        }
      />
      {erro && <Estado>Erro ao carregar: {erro}</Estado>}
      {!erros && !erro && <Estado>Carregando…</Estado>}
      {erros && erros.length === 0 && <Estado>Nenhum erro registrado. Mar limpo.</Estado>}

      {erros && erros.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {erros.map((e) => (
            <div key={e.id} className="card pad" style={{ cursor: 'pointer' }} onClick={() => setAberto(aberto === e.id ? null : e.id)}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <IconBug size={18} stroke={2} style={{ color: 'var(--perigo)', flexShrink: 0, marginTop: 2 }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, wordBreak: 'break-word' }}>{e.mensagem}</div>
                  <div className="muted" style={{ fontSize: 11.5, marginTop: 3 }}>
                    {fmtDataHora(e.criado_em)} · {resumoDevice(e.user_agent)} · {e.rota ?? '—'}
                  </div>
                  {aberto === e.id && e.stack && (
                    <pre style={{ fontSize: 10.5, marginTop: 8, padding: 10, background: 'var(--superficie-2, #f4f4f2)', borderRadius: 8, overflow: 'auto', maxHeight: 220, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{e.stack}</pre>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {dlgLimpar && (
        <ConfirmDialog
          titulo="Limpar todos os erros?"
          texto="Remove todos os relatórios de erro do app. Considere exportar o CSV antes."
          confirmar={trabalhando ? 'Limpando…' : 'Limpar tudo'}
          perigo
          onConfirmar={confirmarLimpar}
          onCancelar={() => setDlgLimpar(false)}
        />
      )}
    </section>
  )
}
