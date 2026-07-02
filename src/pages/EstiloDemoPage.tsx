import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

/**
 * TELA DE DEMONSTRAÇÃO DE ESTILO — rota /estilo.
 *
 * Isolada de propósito: todos os estilos são embutidos e escopados na classe
 * `.demo`, então NADA aqui afeta o resto do app. Serve para avaliar a nova
 * direção visual (fonte de display, dados em mono, a maré como assinatura)
 * antes de aplicar no Radar de verdade.
 *
 * As fontes (Space Grotesk display + JetBrains Mono dados) são carregadas
 * sob demanda só nesta página.
 */

// ── curva de maré de exemplo (senoide mista, só para o visual) ──
function pontosMare(largura: number, altura: number, n = 96): string {
  const pts: string[] = []
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 4
    const y = Math.cos(t) * 0.5 + Math.cos(t * 0.6 + 1) * 0.28
    const px = (i / n) * largura
    const py = altura / 2 - y * (altura / 2.6)
    pts.push(`${px.toFixed(1)},${py.toFixed(1)}`)
  }
  return pts.join(' ')
}

const PICOS_DEMO = [
  { nome: 'Praia da Guarita', cond: 'Clássico', mare: 'enchendo', vento: 'terral', onda: '1.2', periodo: '11', nota: '4.6', cor: '#3BE0C4' },
  { nome: 'Cibratel', cond: 'Boa', mare: 'cheia', vento: 'lateral', onda: '0.9', periodo: '8', nota: '3.4', cor: '#F4B740' },
  { nome: 'Itararé', cond: 'Mexido', mare: 'vazando', vento: 'maral', onda: '1.4', periodo: '7', nota: '2.1', cor: '#E86F61' },
]

export function EstiloDemoPage() {
  const [tema, setTema] = useState<'mar' | 'espuma'>('mar')
  const linhaMare = useMemo(() => pontosMare(340, 60), [])
  const svgRef = useRef<SVGPolylineElement>(null)

  // desenha a maré com animação de traço
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const comp = el.getTotalLength()
    el.style.strokeDasharray = String(comp)
    el.style.strokeDashoffset = String(comp)
    el.getBoundingClientRect()
    el.style.transition = 'stroke-dashoffset 1.6s ease-out'
    el.style.strokeDashoffset = '0'
  }, [])

  const escuro = tema === 'mar'
  const bg = escuro ? '#071A24' : '#F5FAFC'
  const card = escuro ? '#0A2E3B' : '#FFFFFF'
  const linha = escuro ? '#0E3A4A' : '#DCE8EE'
  const texto = escuro ? '#EAF8F9' : '#092233'
  const suave = escuro ? '#7FA8B8' : '#5E7280'
  const agua = '#3BE0C4'

  return (
    <div className="demo" style={{ minHeight: '100dvh', background: bg, color: texto, fontFamily: "'Space Grotesk', system-ui, sans-serif", paddingBottom: 40 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
        .demo *, .demo *::before, .demo *::after { box-sizing: border-box; }
        .demo .mono { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }
        .demo .disp { font-family: 'Space Grotesk', system-ui, sans-serif; letter-spacing: -0.02em; }
        .demo .pico-card { transition: transform .18s ease, border-color .18s ease; }
        .demo .pico-card:active { transform: scale(.985); }
      `}</style>

      {/* barra topo */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px 8px' }}>
        <div>
          <div className="disp" style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: suave }}>demonstração de estilo</div>
          <div className="disp" style={{ fontSize: 26, fontWeight: 700, marginTop: 2 }}>Ecosurf<span style={{ color: agua }}>.</span></div>
        </div>
        <button
          onClick={() => setTema(escuro ? 'espuma' : 'mar')}
          className="mono"
          style={{ background: 'transparent', color: suave, border: `1px solid ${linha}`, borderRadius: 999, padding: '7px 13px', fontSize: 12, cursor: 'pointer' }}
        >
          {escuro ? '☀ espuma' : '☾ maré'}
        </button>
      </div>

      {/* ── ASSINATURA: a maré como coroa ── */}
      <div style={{ padding: '4px 18px 0' }}>
        <svg viewBox="0 0 340 60" style={{ width: '100%', height: 64, display: 'block' }} xmlns="http://www.w3.org/2000/svg" aria-label="Curva de maré do dia">
          <defs>
            <linearGradient id="fadeMare" x1="0" x2="1">
              <stop offset="0" stopColor={agua} stopOpacity="0.25" />
              <stop offset="0.5" stopColor={agua} stopOpacity="1" />
              <stop offset="1" stopColor={agua} stopOpacity="0.25" />
            </linearGradient>
          </defs>
          <polyline ref={svgRef} points={linhaMare} fill="none" stroke="url(#fadeMare)" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="170" cy="30" r="4" fill={agua} />
          <circle cx="170" cy="30" r="9" fill="none" stroke={agua} strokeOpacity="0.4" strokeWidth="1.5" />
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: -6 }}>
          <span className="mono" style={{ fontSize: 10.5, color: suave }}>00h</span>
          <span className="mono" style={{ fontSize: 11, color: agua }}>agora · 0.7m ↑ enchendo</span>
          <span className="mono" style={{ fontSize: 10.5, color: suave }}>24h</span>
        </div>
      </div>

      {/* headline com a fonte de display */}
      <div style={{ padding: '22px 18px 10px' }}>
        <h1 className="disp" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.05, margin: 0 }}>
          Como está o mar<br />agora, na sua praia.
        </h1>
        <p style={{ fontSize: 14, color: suave, marginTop: 10, lineHeight: 1.5, fontFamily: 'system-ui, sans-serif', maxWidth: 320 }}>
          Leitura ao vivo dos picos pela comunidade — condição, maré e vento, com quem registrou assinando embaixo.
        </p>
      </div>

      {/* chips de filtro */}
      <div style={{ display: 'flex', gap: 8, padding: '6px 18px 16px' }}>
        {['Tudo', 'Surf', 'Ambiente'].map((f, i) => (
          <span key={f} className="mono" style={{
            fontSize: 12, padding: '7px 14px', borderRadius: 999,
            background: i === 0 ? agua : 'transparent',
            color: i === 0 ? '#04181F' : suave,
            border: i === 0 ? 'none' : `1px solid ${linha}`,
            fontWeight: i === 0 ? 700 : 400,
          }}>{f}</span>
        ))}
      </div>

      {/* cards de pico — dados em mono, selo com cor que significa */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 18px' }}>
        {PICOS_DEMO.map((p) => (
          <div key={p.nome} className="pico-card" style={{
            background: card, border: `1px solid ${linha}`, borderLeft: `3px solid ${p.cor}`,
            borderRadius: '0 14px 14px 0', padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="disp" style={{ fontSize: 17, fontWeight: 600 }}>{p.nome}</div>
                <div className="mono" style={{ fontSize: 11.5, color: suave, marginTop: 4 }}>
                  maré {p.mare} · {p.vento}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: p.cor, background: `${p.cor}1f`, padding: '4px 9px', borderRadius: 999 }}>
                  {p.cond}
                </span>
              </div>
            </div>
            {/* linha de dados técnicos em mono */}
            <div style={{ display: 'flex', gap: 18, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${linha}` }}>
              <div>
                <div className="mono" style={{ fontSize: 19, fontWeight: 700, color: texto }}>{p.onda}<span style={{ fontSize: 11, color: suave }}>m</span></div>
                <div className="mono" style={{ fontSize: 10, color: suave, marginTop: 1, letterSpacing: '0.05em' }}>ONDA</div>
              </div>
              <div>
                <div className="mono" style={{ fontSize: 19, fontWeight: 700, color: texto }}>{p.periodo}<span style={{ fontSize: 11, color: suave }}>s</span></div>
                <div className="mono" style={{ fontSize: 10, color: suave, marginTop: 1, letterSpacing: '0.05em' }}>PERÍODO</div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div className="mono" style={{ fontSize: 19, fontWeight: 700, color: p.cor }}>{p.nota}</div>
                <div className="mono" style={{ fontSize: 10, color: suave, marginTop: 1, letterSpacing: '0.05em' }}>NOTA</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* legenda didática */}
      <div style={{ padding: '22px 18px 0' }}>
        <div style={{ background: escuro ? 'rgba(59,224,196,.08)' : 'rgba(46,155,214,.08)', border: `1px solid ${linha}`, borderRadius: 14, padding: '14px 16px' }}>
          <div className="disp" style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>O que mudou nesta demonstração</div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, color: suave, lineHeight: 1.7, fontFamily: 'system-ui, sans-serif' }}>
            <li><b style={{ color: texto }}>Fonte de display</b> (Space Grotesk) nos títulos — personalidade de instrumento.</li>
            <li><b style={{ color: texto }}>Dados em mono</b> (JetBrains Mono) — onda, período, maré viram leitura técnica.</li>
            <li><b style={{ color: texto }}>A maré coroa a tela</b> — o elemento-assinatura que ninguém copia.</li>
            <li><b style={{ color: texto }}>Cor que significa</b> — verde = surfável, âmbar = atenção, coral = mexido.</li>
          </ul>
        </div>
        <p style={{ fontSize: 11.5, color: suave, marginTop: 14, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
          Esta tela é isolada. Nada aqui afeta o app atual.<br />
          <Link to="/" style={{ color: agua }}>← voltar ao Ecosurf</Link>
        </p>
      </div>
    </div>
  )
}
