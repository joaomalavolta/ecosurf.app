import { useMemo } from 'react'
import { IconChartBar, IconShieldCheck, IconCamera } from '@tabler/icons-react'
import type { Alerta, Foto, Mutirao } from '../types/domain'
import { categoriaPorId } from './SeletorCategoria'

/**
 * Painel "Pulso da Comunidade" (fase 2 do portal): gráficos dos dados
 * gerados pelos usuários — fotos por dia, alertas por categoria e o mix de
 * procedência (a saúde do sistema de confiança). SVG próprio com os tokens
 * do design system, como a curva de maré: zero biblioteca, zero peso.
 * Honestidade de escala: lê o feed recente (~120 fotos); quando o volume
 * nacional crescer, migra para agregação no servidor.
 */
export function PainelComunidade({ fotos, alertas, mutiroes }: { fotos: Foto[]; alertas: Alerta[]; mutiroes: Mutirao[] }) {
  // ── fotos por dia (14 dias) ──
  const porDia = useMemo(() => {
    const dias: { rotulo: string; n: number }[] = []
    const hoje = new Date()
    for (let i = 13; i >= 0; i--) {
      const d = new Date(hoje)
      d.setDate(d.getDate() - i)
      const chave = d.toDateString()
      dias.push({
        rotulo: i === 0 ? 'hoje' : d.toLocaleDateString('pt-BR', { day: 'numeric' }),
        n: fotos.filter((f) => new Date(f.capturadaEm).toDateString() === chave).length,
      })
    }
    return dias
  }, [fotos])

  // ── alertas por categoria ──
  const porCategoria = useMemo(() => {
    const m = new Map<string, number>()
    for (const a of alertas) m.set(a.categoria, (m.get(a.categoria) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [alertas])

  // ── mix de procedência ──
  const procedencia = useMemo(() => {
    const total = fotos.length || 1
    const noLocal = fotos.filter((f) => f.procedencia === 'no-local').length
    const galeria = fotos.filter((f) => f.procedencia === 'galeria').length
    return {
      noLocal: Math.round((noLocal / total) * 100),
      galeria: Math.round((galeria / total) * 100),
      resto: Math.max(0, 100 - Math.round((noLocal / total) * 100) - Math.round((galeria / total) * 100)),
    }
  }, [fotos])

  if (fotos.length === 0 && alertas.length === 0 && mutiroes.length === 0) return null

  const maxDia = Math.max(1, ...porDia.map((d) => d.n))
  const maxCat = Math.max(1, ...porCategoria.map(([, n]) => n))
  const W = 420, H = 96, PAD = 4
  const bw = (W - PAD * 2) / porDia.length

  return (
    <div className="card pad">
      <span className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <IconChartBar size={12} stroke={2} /> Pulso da comunidade
      </span>

      {/* fotos por dia */}
      <div style={{ marginTop: 12 }}>
        <div className="between" style={{ marginBottom: 4 }}>
          <span className="muted" style={{ fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <IconCamera size={12} stroke={2} /> Fotos por dia · 14 dias
          </span>
          <span className="dado" style={{ fontSize: 11.5, color: 'var(--turq)', fontWeight: 700 }}>
            {porDia.reduce((s, d) => s + d.n, 0)} no período
          </span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 84, display: 'block' }} aria-label="Fotos por dia">
          {porDia.map((d, i) => {
            const h = (d.n / maxDia) * (H - 26)
            return (
              <g key={i}>
                <rect
                  x={PAD + i * bw + 2}
                  y={H - 16 - h}
                  width={bw - 4}
                  height={Math.max(h, d.n > 0 ? 3 : 1)}
                  rx={3}
                  fill={i === porDia.length - 1 ? 'var(--turq)' : 'color-mix(in srgb, var(--turq) 45%, transparent)'}
                />
                {d.n > 0 && (
                  <text x={PAD + i * bw + bw / 2} y={H - 20 - h} textAnchor="middle" fontSize="9" fill="var(--muted)" fontFamily="JetBrains Mono, monospace">{d.n}</text>
                )}
                {(i === 0 || i === porDia.length - 1 || i % 3 === 0) && (
                  <text x={PAD + i * bw + bw / 2} y={H - 4} textAnchor="middle" fontSize="8.5" fill="var(--muted)" fontFamily="JetBrains Mono, monospace">{d.rotulo}</text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* alertas por categoria */}
      {porCategoria.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <span className="muted" style={{ fontSize: 11.5 }}>Alertas por categoria</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
            {porCategoria.map(([cat, n]) => {
              const info = categoriaPorId(cat as Parameters<typeof categoriaPorId>[0])
              const Icone = info.icone
              return (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icone size={14} stroke={2} color={info.cor} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 11.5, width: 108, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.label}</span>
                  <div style={{ flex: 1, height: 8, background: 'var(--line)', borderRadius: 99 }}>
                    <div style={{ width: `${(n / maxCat) * 100}%`, height: '100%', background: info.cor, borderRadius: 99 }} />
                  </div>
                  <span className="dado" style={{ fontSize: 11.5, fontWeight: 700, width: 18, textAlign: 'right' }}>{n}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* mix de procedência */}
      {fotos.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="between" style={{ marginBottom: 4 }}>
            <span className="muted" style={{ fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <IconShieldCheck size={12} stroke={2} /> Procedência das fotos
            </span>
            <span className="dado" style={{ fontSize: 11.5, color: '#2E9B6B', fontWeight: 700 }}>{procedencia.noLocal}% no local</span>
          </div>
          <div style={{ display: 'flex', height: 10, borderRadius: 99, overflow: 'hidden', background: 'var(--line)' }}>
            <div style={{ width: `${procedencia.noLocal}%`, background: '#2E9B6B' }} title="No local" />
            <div style={{ width: `${procedencia.galeria}%`, background: '#E8A05C' }} title="Galeria" />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 5 }}>
            <span className="muted" style={{ fontSize: 10 }}><span style={{ color: '#2E9B6B' }}>●</span> no local</span>
            <span className="muted" style={{ fontSize: 10 }}><span style={{ color: '#E8A05C' }}>●</span> galeria</span>
            <span className="muted" style={{ fontSize: 10 }}>● não verificado</span>
          </div>
        </div>
      )}
    </div>
  )
}
