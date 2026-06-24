import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  IconMapPin,
  IconCalendar,
  IconUser,
} from '@tabler/icons-react'
import { Header } from '../components/Header'
import { restPerfilPublico } from '../services/supabase/rest'
import { temBackend } from '../services/api'
import type { PerfilPublico } from '../types/domain'

export function UsuarioPage() {
  const { userId } = useParams<{ userId: string }>()
  const [perfil, setPerfil] = useState<PerfilPublico | null | undefined>(undefined)

  useEffect(() => {
    if (!userId || !temBackend()) {
      setPerfil(null)
      return
    }
    restPerfilPublico(userId).then(setPerfil).catch(() => setPerfil(null))
  }, [userId])

  if (perfil === undefined) {
    return (
      <div className="page">
        <Header title="Perfil" sub="Carregando..." />
        <div className="page-pad" style={{ textAlign: 'center', paddingTop: 40 }}>
          <p className="muted">Carregando perfil...</p>
        </div>
      </div>
    )
  }

  if (perfil === null) {
    return (
      <div className="page">
        <Header title="Perfil" sub="Não encontrado" />
        <div className="page-pad" style={{ textAlign: 'center', paddingTop: 40 }}>
          <p className="muted">Este perfil não está disponível.</p>
        </div>
      </div>
    )
  }

  const dataEntrada = new Date(perfil.criadoEm).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="page">
      <Header title={perfil.nome ?? 'Usuário Ecosurf'} sub="Perfil público" />
      <div className="page-pad stack">
        {/* Avatar + nome */}
        <div className="card pad" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {perfil.fotoUrl ? (
            <img
              src={perfil.fotoUrl}
              alt=""
              style={{ width: 72, height: 72, borderRadius: 22, objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 22,
                background: 'var(--azul-medio)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                fontWeight: 'bold',
              }}
            >
              {perfil.nome ? perfil.nome.charAt(0).toUpperCase() : <IconUser size={28} />}
            </div>
          )}
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{perfil.nome ?? 'Usuário'}</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
              Nível: {perfil.nivel || "1 - Gota d'Água"}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="card pad stack" style={{ gap: 12 }}>
          {perfil.cidade && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <IconMapPin size={18} stroke={2} color="var(--turq)" />
              <span style={{ fontSize: 14 }}>{perfil.cidade}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <IconCalendar size={18} stroke={2} color="var(--turq)" />
            <span style={{ fontSize: 14 }}>Membro desde {dataEntrada}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
