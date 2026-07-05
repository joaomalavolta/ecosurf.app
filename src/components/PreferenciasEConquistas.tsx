import { useState } from 'react'
import {
  IconSettings, IconTextSize, IconWaveSquare,
  IconCamera, IconRipple, IconMap2, IconTargetArrow, IconAlertTriangle, IconUsers,
} from '@tabler/icons-react'
import type { Icon } from '@tabler/icons-react'
import {
  textoGrandeAtivo, reduzAnimacaoAtivo, setTextoGrande, setReduzAnimacao,
} from '../lib/preferencias'

function LinhaPref({ Icone, titulo, sub, valor, onToggle }: {
  Icone: Icon; titulo: string; sub: string; valor: boolean; onToggle: () => void
}) {
  return (
    <button className="row" onClick={onToggle} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', padding: '10px 2px', color: 'inherit', fontFamily: 'inherit' }}>
      <Icone size={20} stroke={2} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14.5 }}>{titulo}</div>
        <div className="muted" style={{ fontSize: 12 }}>{sub}</div>
      </div>
      <span className={`switch ${valor ? 'on' : ''}`} aria-hidden><span className="knob" /></span>
    </button>
  )
}

/** Painel de preferências: acessibilidade que realmente muda o app. */
export function PainelPreferencias({ onFechar }: { onFechar: () => void }) {
  const [texto, setTexto] = useState(textoGrandeAtivo())
  const [anim, setAnim] = useState(reduzAnimacaoAtivo())

  return (
    <div className="card pad" style={{ marginTop: 12 }}>
      <div className="between">
        <span className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <IconSettings size={12} stroke={2} /> Preferências do app
        </span>
        <button onClick={onFechar} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13 }}>fechar</button>
      </div>
      <div style={{ marginTop: 6 }}>
        <LinhaPref Icone={IconTextSize} titulo="Texto grande" sub="Aumenta a tipografia em todo o app"
          valor={texto} onToggle={() => { const v = !texto; setTexto(v); setTextoGrande(v) }} />
        <LinhaPref Icone={IconWaveSquare} titulo="Reduzir animações" sub="Desliga transições e o voo do mapa"
          valor={anim} onToggle={() => { const v = !anim; setAnim(v); setReduzAnimacao(v) }} />
      </div>
      <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
        Preferências salvas neste aparelho.
      </p>
    </div>
  )
}

// ── Conquistas: marcos calculados dos dados reais, sem tabela nova ──

interface DadosConquista {
  fotos: number
  picos: number
  precisao: number
  alertas: number
  mutiroes: number
}

function medalhas(d: DadosConquista): { Icone: Icon; titulo: string; desc: string; ok: boolean; progresso?: number }[] {
  return [
    { Icone: IconCamera, titulo: 'Primeiro registro', desc: 'Publicou a primeira foto', ok: d.fotos >= 1 },
    { Icone: IconRipple, titulo: 'Vigia do mar', desc: '10 fotos publicadas', ok: d.fotos >= 10, progresso: Math.min(1, d.fotos / 10) },
    { Icone: IconMap2, titulo: 'Desbravador', desc: 'Registrou 3 picos diferentes', ok: d.picos >= 3, progresso: Math.min(1, d.picos / 3) },
    { Icone: IconTargetArrow, titulo: 'Testemunha confiável', desc: '80% de fotos "no local"', ok: d.precisao >= 80, progresso: Math.min(1, d.precisao / 80) },
    { Icone: IconAlertTriangle, titulo: 'Sentinela costeira', desc: 'Registrou o primeiro alerta', ok: d.alertas >= 1 },
    { Icone: IconUsers, titulo: 'Mobilizador', desc: 'Organizou um mutirão', ok: d.mutiroes >= 1 },
  ]
}

export function CardConquistas({ dados }: { dados: DadosConquista }) {
  const lista = medalhas(dados)
  const conquistadas = lista.filter((m) => m.ok).length
  return (
    <div className="card pad" style={{ marginTop: 12 }}>
      <div className="between">
        <span className="eyebrow">Conquistas</span>
        <span className="dado" style={{ fontSize: 12, color: 'var(--turq)', fontWeight: 700 }}>{conquistadas}/{lista.length}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 10 }}>
        {lista.map((m) => (
          <div key={m.titulo} style={{
            display: 'flex', gap: 8, alignItems: 'center', padding: '9px 10px',
            borderRadius: 12, border: '1px solid var(--line)',
            opacity: m.ok ? 1 : 0.55,
            background: m.ok ? 'color-mix(in srgb, var(--turq) 7%, transparent)' : 'transparent',
          }}>
            <m.Icone size={22} stroke={1.8} color={m.ok ? 'var(--turq)' : 'var(--muted)'} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>{m.titulo}</div>
              <div className="muted" style={{ fontSize: 10.5 }}>{m.desc}</div>
              {!m.ok && m.progresso != null && m.progresso > 0 && (
                <div style={{ height: 4, background: 'var(--line)', borderRadius: 99, marginTop: 4 }}>
                  <div style={{ width: `${m.progresso * 100}%`, height: '100%', background: 'var(--turq)', borderRadius: 99 }} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
