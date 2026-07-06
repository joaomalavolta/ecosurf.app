import { Link } from 'react-router-dom'
import { IconUserHeart, IconStar, IconRipple } from '@tabler/icons-react'
import type { Foto } from '../types/domain'

/**
 * Estados vazios com propósito: em vez de silêncio, cada filtro vazio
 * convida à próxima ação. O "Seguindo" vazio sugere autores ativos de
 * verdade (extraídos do feed), transformando o vazio em descoberta.
 */

function autoresSugeridos(feed: Foto[], jaSegue: Set<string>): { id: string; nome: string }[] {
  const contagem = new Map<string, { nome: string; n: number }>()
  for (const f of feed) {
    if (!f.autorId || jaSegue.has(f.autorId)) continue
    const atual = contagem.get(f.autorId)
    if (atual) atual.n++
    else contagem.set(f.autorId, { nome: f.autorNome ?? 'Surfista', n: 1 })
  }
  return [...contagem.entries()]
    .sort((a, b) => b[1].n - a[1].n)
    .slice(0, 4)
    .map(([id, v]) => ({ id, nome: v.nome }))
}

export function VazioFeed({ filtro, feed, seguidos }: {
  filtro: 'favoritos' | 'melhores' | 'todos' | 'seguindo'
  feed: Foto[]
  seguidos: Set<string>
}) {
  if (filtro === 'seguindo') {
    const sugestoes = autoresSugeridos(feed, seguidos)
    return (
      <div className="card pad" style={{ textAlign: 'center', padding: '26px 18px' }}>
        <IconUserHeart size={30} stroke={1.7} style={{ color: 'var(--turq)', marginBottom: 8 }} />
        <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Você ainda não segue ninguém</p>
        <p className="muted" style={{ fontSize: 13, marginBottom: sugestoes.length ? 16 : 0 }}>
          Siga surfistas e fotógrafos para ver os registros deles reunidos aqui.
        </p>
        {sugestoes.length > 0 && (
          <>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Ativos na sua região</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sugestoes.map((a) => (
                <Link
                  key={a.id}
                  to={`/usuario/${a.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit',
                    padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 12,
                  }}
                >
                  <span style={{ width: 34, height: 34, borderRadius: 99, background: 'color-mix(in srgb, var(--turq) 18%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--turq)' }}>{a.nome[0]?.toUpperCase()}</span>
                  <span style={{ flex: 1, textAlign: 'left', fontSize: 14, fontWeight: 500 }}>{a.nome}</span>
                  <span className="dado" style={{ fontSize: 12, color: 'var(--turq)', fontWeight: 700 }}>ver perfil →</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  if (filtro === 'favoritos') {
    return (
      <div className="card pad" style={{ textAlign: 'center', padding: '26px 18px' }}>
        <IconStar size={30} stroke={1.7} style={{ color: 'var(--amber, #E8A05C)', marginBottom: 8 }} />
        <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Nenhum pico favorito ainda</p>
        <p className="muted" style={{ fontSize: 13 }}>
          Toque na estrela dos picos que você mais frequenta — eles aparecem aqui, sempre à mão.
        </p>
      </div>
    )
  }

  // melhores
  return (
    <div className="card pad" style={{ textAlign: 'center', padding: '26px 18px' }}>
      <IconRipple size={30} stroke={1.7} style={{ color: 'var(--turq)', marginBottom: 8 }} />
      <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Sem curtidas por enquanto</p>
      <p className="muted" style={{ fontSize: 13 }}>
        As fotos mais curtidas da comunidade aparecem aqui. Curta os melhores registros para destacá-los.
      </p>
    </div>
  )
}
