import { useState } from 'react'
import { IconRipple, IconCheck, IconMapPin, IconAlertTriangle, IconPlus } from '@tabler/icons-react'
import { SeletorComunidade } from './SeletorComunidade'
import type { Pico } from '../types/domain'

/**
 * Confirmação do vínculo — a etapa que faltava entre fotografar e enviar.
 *
 * O app escolhia sozinho "o pico mais próximo em até 600 m" e publicava. Só que
 * o GPS de celular erra dezenas de metros na praia, e há picos a 120 m um do
 * outro no acervo: a foto podia ir para o pico errado sem ninguém perceber —
 * carregando o selo "no local", que promete exatamente o contrário.
 *
 * Aqui o autor vê a foto, o pico sugerido e a DISTÂNCIA real até ele. Um toque
 * publica. Quando há risco de confusão (outro pico quase tão perto, ou GPS
 * impreciso), a lista já abre com aviso — a fricção aparece só onde o risco está.
 */
export function ConfirmarPico({
  dados,
  comunidadeId,
  onComunidade,
  onEscolher,
  onOutro,
  onPublicar,
}: {
  dados: {
    blob?: Blob
    pos: { precisaoM?: number }
    candidatos: { pico: Pico; metros: number }[]
    escolhido: string
    ambiguo: boolean
  }
  comunidadeId: string | null
  onComunidade: (id: string | null) => void
  onEscolher: (picoId: string) => void
  onOutro: () => void
  onPublicar: () => void | Promise<void>
}) {
  const [listaAberta, setListaAberta] = useState(dados.ambiguo)
  const [enviando, setEnviando] = useState(false)
  const [previa] = useState(() => (dados.blob ? URL.createObjectURL(dados.blob) : ''))

  const atual = dados.candidatos.find((c) => c.pico.id === dados.escolhido) ?? dados.candidatos[0]
  const precisao = dados.pos.precisaoM ? Math.round(dados.pos.precisaoM) : null

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#06222E', zIndex: 50,
      overflowY: 'auto',
      padding: '22px 18px calc(env(safe-area-inset-bottom, 0px) + 24px)',
    }}>
      <h2 style={{ color: '#fff', margin: '0 0 4px', fontSize: 22 }}>Confirme o pico</h2>
      <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 13, margin: '0 0 16px' }}>
        Sua foto entra na linha do tempo deste pico. Confira antes de publicar.
      </p>

      {/* A foto que acabou de ser tirada */}
      {previa && (
        <div style={{
          width: '100%', aspectRatio: '4 / 3', borderRadius: 14, overflow: 'hidden',
          marginBottom: 14, background: '#0a1929',
        }}>
          <img src={previa} alt="Foto capturada" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      )}

      {/* Aviso quando há risco real de confusão */}
      {dados.ambiguo && dados.candidatos.length > 1 && (
        <div style={{
          display: 'flex', gap: 9, alignItems: 'flex-start',
          background: 'rgba(232,115,74,.14)', border: '1px solid rgba(232,115,74,.35)',
          borderRadius: 12, padding: '10px 12px', marginBottom: 12,
        }}>
          <IconAlertTriangle size={17} stroke={2} style={{ color: '#F0A17E', flexShrink: 0, marginTop: 1 }} />
          <span style={{ color: 'rgba(255,255,255,.88)', fontSize: 12.5, lineHeight: 1.45 }}>
            Há mais de um pico por perto{precisao ? ` e o GPS tem margem de ${precisao} m` : ''}. Confirme qual é o certo.
          </span>
        </div>
      )}

      {/* Pico escolhido */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'rgba(30,203,195,.12)', border: '1px solid rgba(30,203,195,.34)',
        borderRadius: 14, padding: '13px 14px',
      }}>
        <span style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: 'grid', placeItems: 'center',
          background: 'linear-gradient(135deg, #0D6EA8, #2E9BD6)',
        }}>
          <IconRipple size={20} stroke={2} color="#fff" />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'rgba(255,255,255,.55)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Enviar para
          </div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {atual?.pico.nome ?? 'Pico'}
          </div>
          {atual && (
            <div className="dado" style={{ color: '#7FE7E1', fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
              <IconMapPin size={11} stroke={2} /> a {atual.metros} m de você
            </div>
          )}
        </div>
      </div>

      {/* Trocar de pico */}
      {!listaAberta && dados.candidatos.length > 1 && (
        <button
          onClick={() => setListaAberta(true)}
          style={{
            background: 'none', border: 0, cursor: 'pointer', fontFamily: 'inherit',
            color: '#7FE7E1', fontSize: 13, fontWeight: 600,
            padding: '12px 2px', display: 'inline-flex', alignItems: 'center', gap: 5,
          }}
        >
          Não é este pico? Trocar →
        </button>
      )}

      {listaAberta && (
        <div style={{ marginTop: 12 }}>
          <span style={{ color: 'rgba(255,255,255,.55)', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Picos por perto
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {dados.candidatos.map(({ pico, metros }) => {
              const ativo = pico.id === dados.escolhido
              return (
                <button
                  key={pico.id}
                  onClick={() => onEscolher(pico.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '11px 12px', borderRadius: 12, cursor: 'pointer',
                    fontFamily: 'inherit', textAlign: 'left',
                    background: ativo ? 'rgba(30,203,195,.14)' : 'rgba(255,255,255,.05)',
                    border: ativo ? '1.5px solid #1ECBC3' : '1px solid rgba(255,255,255,.14)',
                  }}
                >
                  <IconRipple size={17} stroke={2} style={{ color: ativo ? '#7FE7E1' : 'rgba(255,255,255,.5)', flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: 14, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pico.nome}
                    </span>
                    <span className="dado" style={{ color: 'rgba(255,255,255,.5)', fontSize: 11 }}>
                      a {metros} m{pico.praia ? ` · ${pico.praia}` : ''}
                    </span>
                  </span>
                  {ativo && <IconCheck size={17} stroke={2.4} style={{ color: '#7FE7E1', flexShrink: 0 }} />}
                </button>
              )
            })}
          </div>

          <button
            onClick={onOutro}
            style={{
              background: 'none', border: '1px dashed rgba(255,255,255,.25)', cursor: 'pointer',
              fontFamily: 'inherit', color: 'rgba(255,255,255,.8)', fontSize: 13, fontWeight: 600,
              padding: '11px 12px', borderRadius: 12, width: '100%', marginTop: 8,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <IconPlus size={15} stroke={2} /> Nenhum destes — outro local
          </button>
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <SeletorComunidade valor={comunidadeId} onChange={onComunidade} escuro />
      </div>

      <button
        className="btn acento full"
        style={{ marginTop: 6 }}
        disabled={enviando || !atual}
        onClick={() => { setEnviando(true); void onPublicar() }}
      >
        <IconCheck size={17} stroke={2} /> {enviando ? 'Publicando…' : 'Publicar no radar'}
      </button>
    </div>
  )
}
