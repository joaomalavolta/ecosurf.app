import { Link } from 'react-router-dom'
import { IconAlertTriangle, IconHeartHandshake, IconBeach } from '@tabler/icons-react'
import { Header } from '../components/Header'

export function NovaAcaoPage() {
  return (
    <div className="page">
      <Header title="Nova Ação" sub="Mapeie problemas ambientais e ajude a dar visibilidade ao que está acontecendo no maretório." />
      <div className="page-pad stack" style={{ paddingTop: 20 }}>
        <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, textAlign: 'center' }}>
          O Ecosurf.app é uma plataforma cidadã de mapeamento colaborativo.
          Os registros ambientais publicados pelos usuários têm finalidade informativa, educativa e de interesse público.
        </p>

        <p style={{ fontSize: 14, fontWeight: 700, textAlign: 'center', marginTop: 8 }}>
          Escolha o que deseja fazer:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
          {/* Card Registrar Alerta */}
          <Link
            to="/nova-acao/alerta"
            style={{
              textDecoration: 'none',
              color: 'inherit',
              borderRadius: 16,
              border: '2px solid var(--line)',
              padding: '20px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              background: 'var(--card)',
              transition: 'border-color .15s, box-shadow .15s',
            }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'linear-gradient(135deg, #E84855, #D64045)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto',
            }}>
              <IconAlertTriangle size={28} stroke={2} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Registrar Alerta Ambiental</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, lineHeight: 1.4 }}>
                Lixo, esgoto, erosão, óleo, animal encalhado e outros impactos ambientais.
              </div>
            </div>
          </Link>

          {/* Card Criar Mutirão */}
          <Link
            to="/nova-acao/mutirao"
            style={{
              textDecoration: 'none',
              color: 'inherit',
              borderRadius: 16,
              border: '2px solid var(--line)',
              padding: '20px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              background: 'var(--card)',
              transition: 'border-color .15s, box-shadow .15s',
            }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'linear-gradient(135deg, #FF8C42, #F5721C)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto',
            }}>
              <IconHeartHandshake size={28} stroke={2} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Criar Mutirão</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, lineHeight: 1.4 }}>
                Organize uma limpeza de praia, rio, mangue, costão, trilha costeira ou ação educativa.
              </div>
            </div>
          </Link>

          {/* Card Cadastrar Pico */}
          <Link
            to="/nova-acao/pico"
            style={{
              textDecoration: 'none',
              color: 'inherit',
              borderRadius: 16,
              border: '2px solid var(--line)',
              padding: '20px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              background: 'var(--card)',
              transition: 'border-color .15s, box-shadow .15s',
            }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'linear-gradient(135deg, #1ECBC3, #0D6EA8)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto',
            }}>
              <IconBeach size={28} stroke={2} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Cadastrar Pico de Surf</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, lineHeight: 1.4 }}>
                Adicione uma praia, costão ou spot que ainda não está no mapa da comunidade.
              </div>
            </div>
          </Link>
        </div>

        <p style={{ fontSize: 11.5, color: 'var(--muted)', textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
          Seu registro contribui para informar a comunidade do surf, pesquisadores, jornalistas, educadores e gestores.
        </p>
      </div>
    </div>
  )
}
