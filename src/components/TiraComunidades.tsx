import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconUsersGroup, IconPlus, IconChevronRight } from '@tabler/icons-react'
import { listarComunidades, type Comunidade } from '../services/comunidades'

/**
 * Tira de comunidades no Radar — a porta de entrada que faltava.
 *
 * Comunidades só existiam no Perfil (enterradas) e no menu do mapa: quem
 * abria o app não sabia que a funcionalidade existia. Aqui elas aparecem no
 * fluxo principal, no formato que a comunidade do surf já entende — bolhas
 * horizontais, como os picos logo acima. O "criar" abre a fileira, para que
 * a ação seja sempre visível mesmo quando já há muitas comunidades.
 */
export function TiraComunidades() {
  const [comunidades, setComunidades] = useState<Comunidade[]>([])
  const [carregou, setCarregou] = useState(false)

  useEffect(() => {
    let vivo = true
    listarComunidades()
      .then((cs) => { if (vivo) { setComunidades(cs.slice(0, 12)); setCarregou(true) } })
      .catch(() => { if (vivo) setCarregou(true) })
    return () => { vivo = false }
  }, [])

  if (!carregou) return null

  // Sem nenhuma comunidade ainda: um convite claro, em vez de uma fileira vazia.
  if (comunidades.length === 0) {
    return (
      <div style={{ margin: '4px 12px 12px' }}>
        <Link
          to="/comunidades/nova"
          className="card pad"
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            textDecoration: 'none', color: 'inherit',
          }}
        >
          <span style={{
            width: 42, height: 42, borderRadius: 13, flexShrink: 0,
            background: 'linear-gradient(135deg, #0D6EA8, #2E9BD6)',
            display: 'grid', placeItems: 'center',
          }}>
            <IconUsersGroup size={21} stroke={1.9} color="#fff" />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Crie uma comunidade</div>
            <div className="muted" style={{ fontSize: 12, lineHeight: 1.4 }}>
              Reúna pessoas em torno de uma praia, projeto ou causa.
            </div>
          </div>
          <IconChevronRight size={17} stroke={2} style={{ color: 'var(--muted)', flexShrink: 0 }} />
        </Link>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ padding: '0 14px 8px' }}>
        <span className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <IconUsersGroup size={12} stroke={2} /> Comunidades · gente que cuida do litoral
        </span>
      </div>

      <div className="tira-comunidades">
        {/* Criar vem primeiro: a ação nunca fica escondida no fim da rolagem */}
        <Link to="/comunidades/nova" className="tira-com-item" aria-label="Criar comunidade">
          <span className="tira-com-avatar tira-com-novo">
            <IconPlus size={22} stroke={2.2} />
          </span>
          <span className="tira-com-nome">Criar</span>
        </Link>

        {comunidades.map((c) => (
          <Link key={c.id} to={`/comunidade/${c.id}`} className="tira-com-item">
            <span
              className="tira-com-avatar"
              style={c.avatarUrl
                ? { backgroundImage: `url('${c.avatarUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : undefined}
            >
              {!c.avatarUrl && <IconUsersGroup size={20} stroke={1.9} color="#fff" />}
            </span>
            <span className="tira-com-nome">{c.nome}</span>
            <span className="tira-com-sub">{c.membros} {c.membros === 1 ? 'membro' : 'membros'}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
