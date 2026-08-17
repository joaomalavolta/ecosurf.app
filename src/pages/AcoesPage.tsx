import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { ComponentType } from 'react'
import {
  IconCamera,
  IconAlertTriangle,
  IconHeartHandshake,
  IconPlus,
  IconBookmark,
  IconTrash,
  IconPaw,
  type IconProps,
} from '@tabler/icons-react'
import { Header } from '../components/Header'
import { ImpactoComunidade } from '../components/ImpactoComunidade'
import { categoriaPorId } from '../components/SeletorCategoria'
import { acaoEncerrada } from '../lib/agenda'
import { carregarAmeacas, carregarMutiroes } from '../services/picos'
import { listarRascunhos, excluirRascunho } from '../services/alertas'
import type { Alerta, Mutirao, Rascunho } from '../types/domain'

/**
 * Hub de ações — Alertas, Mutirões e "+ Nova Ação".
 */
function Linha({
  Icon,
  titulo,
  texto,
  cor = 'var(--turq)',
  to,
  autorNome,
  autorFoto,
  autorId,
}: {
  Icon: ComponentType<IconProps>
  titulo: string
  texto: string
  cor?: string
  to?: string
  autorNome?: string
  autorFoto?: string
  autorId?: string
}) {
  const inner = (
    <div className="card pad row">
      <div
        style={{ width: 50, height: 50, borderRadius: 16, background: 'var(--cinza)', color: cor, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}
      >
        <Icon size={24} stroke={2} />
      </div>
      <div style={{ flex: 1 }}>
        <b>{titulo}</b>
        <div className="muted">{texto}</div>
        {autorNome && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
            {autorFoto ? (
              <img src={autorFoto} alt="" style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--azul-medio)', color: '#fff', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                {autorNome.charAt(0).toUpperCase()}
              </div>
            )}
            {autorId ? (
              <Link to={`/usuario/${autorId}`} style={{ fontSize: 11.5, color: 'var(--muted)', textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>
                {autorNome}
              </Link>
            ) : (
              <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{autorNome}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
  return to ? (
    <Link to={to} style={{ textDecoration: 'none', color: 'inherit' }}>
      {inner}
    </Link>
  ) : (
    inner
  )
}

function Secao({ titulo, children }: { titulo: ReactNode; children: ReactNode }) {
  return (
    <section className="stack" style={{ marginTop: 4 }}>
      <h2 style={{ fontSize: 18, margin: '8px 2px 2px', display: 'flex', alignItems: 'center', gap: 8 }}>{titulo}</h2>
      {children}
    </section>
  )
}

const STATUS_LABELS: Record<string, string> = {
  publicado: 'Publicado pela comunidade',
  'em-revisao': 'Em revisão',
  validado: 'Validado',
  sinalizado: 'Sinalizado',
  identificado: 'Publicado',
  'em-observacao': 'Em observação',
  recorrente: 'Recorrente',
  resolvido: 'Resolvido',
}

export function AcoesPage() {
  const [registros, setRegistros] = useState<Alerta[]>([])
  const [mutiroes, setMutiroes] = useState<Mutirao[]>([])
  const [rascunhos, setRascunhos] = useState<Rascunho[]>([])
  const [tab, setTab] = useState<'tudo' | 'alertas' | 'positivos' | 'mutiroes'>('tudo')

  // As duas famílias vêm da mesma consulta (mesma tabela) e se separam aqui.
  const alertas = useMemo(() => registros.filter((r) => r.tipoRegistro !== 'positivo'), [registros])
  const positivos = useMemo(() => registros.filter((r) => r.tipoRegistro === 'positivo'), [registros])

  useEffect(() => {
    let vivo = true
    carregarAmeacas().then((a) => vivo && setRegistros(a))
    carregarMutiroes().then((m) => vivo && setMutiroes(m))
    listarRascunhos().then((r) => vivo && setRascunhos(r))
    return () => {
      vivo = false
    }
  }, [])

  // Próximas primeiro (mais perto de acontecer no topo); as encerradas caem
  // para o fim da lista, da mais recente para a mais antiga.
  const mutiroesOrdenados = useMemo(() => {
    const t = (m: Mutirao) => new Date(m.quando).getTime() || 0
    const abertos = mutiroes.filter((m) => !acaoEncerrada(m.quando)).sort((a, b) => t(a) - t(b))
    const encerrados = mutiroes.filter((m) => acaoEncerrada(m.quando)).sort((a, b) => t(b) - t(a))
    return [...abertos, ...encerrados]
  }, [mutiroes])

  async function removerRascunho(id: string) {
    await excluirRascunho(id)
    setRascunhos((rs) => rs.filter((r) => r.id !== id))
  }

  return (
    <div className="page">
      <Header title="Ações" sub="Registrar, defender a costa e mobilizar." />
      <div className="page-pad stack acoes-grid">
        {/* Botões principais */}
        <div className="g-botoes" style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <Link to="/capturar" className="btn acento full" style={{ minHeight: 50, fontSize: 14 }}>
            <IconCamera size={18} stroke={2} /> Foto rápida
          </Link>
          <Link to="/nova-acao" className="btn full" style={{ minHeight: 50, fontSize: 14, background: 'var(--azul-abissal)', color: '#fff' }}>
            <IconPlus size={18} stroke={2} /> Nova Ação
          </Link>
        </div>

        {/* Tabs de filtro */}
        <div className="g-impacto" style={{ marginBottom: 10 }}>
          <ImpactoComunidade alertas={alertas} positivos={positivos} mutiroes={mutiroes} />
        </div>
        <div className="pills full g-pills" style={{ marginBottom: 10 }}>
          <Pill on={tab === 'tudo'} onClick={() => setTab('tudo')}>Tudo</Pill>
          <Pill on={tab === 'alertas'} onClick={() => setTab('alertas')}><IconAlertTriangle size={14} stroke={2} /> Alertas</Pill>
          <Pill on={tab === 'positivos'} onClick={() => setTab('positivos')}><IconPaw size={14} stroke={2} /> Positivos</Pill>
          <Pill on={tab === 'mutiroes'} onClick={() => setTab('mutiroes')}><IconHeartHandshake size={14} stroke={2} /> Mutirões</Pill>
        </div>

        <div className="g-lista1">{(tab === 'tudo' || tab === 'alertas') && (
        <Secao titulo={<><IconAlertTriangle size={19} stroke={2} color="var(--perigo)" /> Registros ambientais</>}>
          {alertas.length === 0 && <p className="muted">Nenhum registro ambiental no momento.</p>}
          {alertas.map((a) => {
            const cat = categoriaPorId(a.categoria)
            return (
              <Linha
                key={a.id}
                Icon={cat.icone}
                cor={cat.cor}
                titulo={a.titulo}
                texto={`${a.municipio}/${a.uf} · ${STATUS_LABELS[a.status] ?? a.status}`}
                to={`/alerta/${a.id}`}
                autorNome={a.autorNome}
                autorFoto={a.autorFoto}
                autorId={a.autorId}
              />
            )
          })}
        </Secao>
        )}</div>

        {/* Seção própria, não um "tipo" a mais na lista de alertas: misturar
            "Esgoto aparente" com "Filhotes avistados" na mesma coluna faria o
            bom e o ruim disputarem a mesma leitura. O texto aqui traz a
            categoria em vez do status — registro positivo não tem status. */}
        <div className="g-lista1">{(tab === 'tudo' || tab === 'positivos') && (
        <Secao titulo={<><IconPaw size={19} stroke={2} color="#2E9B6B" /> Registros positivos</>}>
          {positivos.length === 0 && (
            <p className="muted">
              Nada por aqui ainda. Fauna, desova, mata em pé ou coleta seletiva: o
              mapa também é feito do que está dando certo.
            </p>
          )}
          {positivos.map((p) => {
            const cat = categoriaPorId(p.categoria)
            return (
              <Linha
                key={p.id}
                Icon={cat.icone}
                cor={cat.cor}
                titulo={p.titulo}
                texto={`${p.municipio}/${p.uf} · ${cat.label}`}
                to={`/alerta/${p.id}`}
                autorNome={p.autorNome}
                autorFoto={p.autorFoto}
                autorId={p.autorId}
              />
            )
          })}
        </Secao>
        )}</div>

        <div className="g-lista2">{(tab === 'tudo' || tab === 'mutiroes') && (
        <Secao titulo={<><IconHeartHandshake size={19} stroke={2} color="#FF8C42" /> Mutirões</>}>
          {mutiroes.length === 0 && <p className="muted">Nenhum mutirão agendado no momento.</p>}
          {mutiroesOrdenados.map((m) => {
            const encerrado = acaoEncerrada(m.quando)
            const quandoTxt = m.horario ?? new Date(m.quando).toLocaleDateString('pt-BR')
            return (
              <Linha
                key={m.id}
                Icon={IconHeartHandshake}
                cor={encerrado ? 'var(--muted)' : '#FF8C42'}
                titulo={m.titulo}
                // Encerrado vem primeiro no texto: evita o convite a entrar
                // numa ação que já passou.
                texto={`${encerrado ? 'Encerrado · ' : ''}${m.municipio}/${m.uf} · ${quandoTxt}${!encerrado && m.vagas ? ` · ${m.vagas} vagas` : ''}`}
                to={`/mutirao/${m.id}`}
                autorNome={m.autorNome}
                autorFoto={m.autorFoto}
                autorId={m.autorId}
              />
            )
          })}
        </Secao>
        )}

        {/* Rascunhos */}
        {rascunhos.length > 0 && (
          <Secao titulo={<><IconBookmark size={19} stroke={2} color="var(--muted)" /> Rascunhos</>}>
            {rascunhos.map((r) => {
              const dados = r.dados as Record<string, any>
              const titulo = dados.titulo || (r.tipo === 'alerta' ? 'Alerta sem título' : 'Mutirão sem título')
              return (
                <div key={r.id} className="card pad" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{titulo}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {r.tipo === 'alerta' ? '🔴 Alerta' : '🟠 Mutirão'} · salvo em {new Date(r.atualizadoEm).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <Link to={`/nova-acao/${r.tipo === 'alerta' ? 'alerta' : 'mutirao'}`} className="btn" style={{ fontSize: 12, padding: '6px 10px', minHeight: 32 }}>
                    Retomar
                  </Link>
                  <button className="btn outline" style={{ fontSize: 12, padding: '6px 8px', minHeight: 32, color: 'var(--perigo)' }} onClick={() => removerRascunho(r.id)}>
                    <IconTrash size={14} />
                  </button>
                </div>
              )
            })}
          </Secao>
        )}</div>
      </div>
    </div>
  )
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className={`pill ${on ? 'active' : ''}`} onClick={onClick}>
      {children}
    </button>
  )
}
