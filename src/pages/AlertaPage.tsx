import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { IconMapPin, IconAlertTriangle, IconArrowLeft } from '@tabler/icons-react'
import { Header } from '../components/Header'
import { categoriaPorId } from '../components/SeletorCategoria'
import { SUPABASE_URL, SUPABASE_KEY } from '../services/supabase/config'

interface AlertaDetalhe {
  id: string
  titulo: string
  categoria: string
  status: string
  municipio: string
  uf: string
  descricao: string | null
  local_nome: string | null
  gravidade: string | null
  recorrente: boolean
  images: string[] | null
  criada_em: string
  denunciante_id: string | null
}

const STATUS_LABELS: Record<string, string> = {
  identificado: 'Identificado',
  'em-observacao': 'Em observação',
  recorrente: 'Recorrente',
  resolvido: 'Resolvido',
}

export function AlertaPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [alerta, setAlerta] = useState<AlertaDetalhe | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    fetch(`${SUPABASE_URL}/rest/v1/ameacas?select=*&id=eq.${encodeURIComponent(id)}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    })
      .then((r) => r.json())
      .then((rows: AlertaDetalhe[]) => {
        if (rows.length > 0) setAlerta(rows[0])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="page">
        <Header title="Carregando..." />
        <div className="page-pad" style={{ textAlign: 'center', padding: 40 }}>
          <div className="spinner" />
        </div>
      </div>
    )
  }

  if (!alerta) {
    return (
      <div className="page">
        <Header title="Alerta não encontrado" />
        <div className="page-pad stack" style={{ textAlign: 'center', paddingTop: 40 }}>
          <IconAlertTriangle size={48} stroke={1.5} color="var(--muted)" />
          <p className="muted">Esse registro não existe ou foi removido.</p>
          <button className="btn acento" onClick={() => navigate('/acoes')}>Voltar para Ações</button>
        </div>
      </div>
    )
  }

  const cat = categoriaPorId(alerta.categoria as any)
  const CatIcon = cat.icone
  const imageUrls = (alerta.images ?? []).map(
    (path) => `${SUPABASE_URL}/storage/v1/object/public/fotos/${path}`
  )

  return (
    <div className="page">
      <Header title="Registro Ambiental" sub={alerta.titulo} />
      <div className="page-pad stack" style={{ paddingTop: 16, paddingBottom: 80 }}>
        {/* Badge categoria */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div
            style={{
              width: 44, height: 44, borderRadius: 14,
              background: `${cat.cor}18`, color: cat.cor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <CatIcon size={24} stroke={2} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{alerta.titulo}</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {cat.label} · {STATUS_LABELS[alerta.status] ?? alerta.status}
            </div>
          </div>
        </div>

        {/* Fotos */}
        {imageUrls.length > 0 && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {imageUrls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Foto ${i + 1}`}
                style={{
                  width: imageUrls.length === 1 ? '100%' : 260,
                  height: 200,
                  objectFit: 'cover',
                  borderRadius: 14,
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
        )}

        {/* Info cards */}
        <div className="card pad">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <IconMapPin size={16} stroke={2} color="var(--turq)" />
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {alerta.local_nome ? `${alerta.local_nome} — ` : ''}
              {alerta.municipio}/{alerta.uf}
            </span>
          </div>
          {alerta.gravidade && (
            <div style={{ fontSize: 13 }}>
              <b>Gravidade:</b> {alerta.gravidade}
            </div>
          )}
          {alerta.recorrente && (
            <div style={{ fontSize: 13, color: 'var(--perigo)', marginTop: 4 }}>
              ⚠ Problema recorrente neste local
            </div>
          )}
          <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>
            Registrado em {new Date(alerta.criada_em).toLocaleDateString('pt-BR', {
              day: '2-digit', month: 'long', year: 'numeric',
            })}
          </div>
        </div>

        {/* Descrição */}
        {alerta.descricao && (
          <div>
            <h3 style={{ fontSize: 14, marginBottom: 6 }}>Descrição</h3>
            <p style={{ fontSize: 13, color: 'var(--texto)', lineHeight: 1.6 }}>{alerta.descricao}</p>
          </div>
        )}

        <button
          className="btn outline full"
          onClick={() => navigate('/acoes')}
          style={{ marginTop: 12 }}
        >
          <IconArrowLeft size={16} /> Voltar para Ações
        </button>
      </div>
    </div>
  )
}
