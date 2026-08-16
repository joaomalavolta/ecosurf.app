import { useEffect, useState } from 'react'
import { IconEye, IconPhoto, IconMap2, IconSeeding } from '@tabler/icons-react'
import { toast } from '../lib/toast'
// Só o TIPO entra estático: importar um valor daqui anularia a divisão de
// chunk dos imports dinâmicos abaixo.
import type { VisibilidadePerfil } from '../services/visibilidadePerfil'

const TUDO_VISIVEL: VisibilidadePerfil = { fotos: true, mapa: true, acoes: true }

/**
 * "Esconder minhas publicações" — o controle da vitrine.
 *
 * Três chaves em vez de um botão só porque as coisas são diferentes: fotos são
 * imagens de gente e de lugar, o mapa mostra por onde a pessoa anda, e alertas
 * e mutirões são registro cívico. Dá para querer sumir com o rosto e manter a
 * denúncia de pé.
 *
 * O texto diz o que o botão NÃO faz. Quem lê "esconder" pode entender "apagar",
 * e descobrir depois que a foto seguia no feed do pico seria pior do que nunca
 * ter oferecido a opção.
 */

const CHAVES: { chave: keyof VisibilidadePerfil; rotulo: string; Icone: typeof IconPhoto }[] = [
  { chave: 'fotos', rotulo: 'Minhas fotos', Icone: IconPhoto },
  { chave: 'mapa', rotulo: 'Meu mapa de contribuições', Icone: IconMap2 },
  { chave: 'acoes', rotulo: 'Meus alertas e mutirões', Icone: IconSeeding },
]

export function CardVisibilidadePerfil() {
  const [vis, setVis] = useState<VisibilidadePerfil | null>(null)
  const [salvando, setSalvando] = useState<keyof VisibilidadePerfil | null>(null)

  useEffect(() => {
    let vivo = true
    import('../services/visibilidadePerfil')
      .then(({ minhaVisibilidade }) => minhaVisibilidade())
      .then((v) => { if (vivo) setVis(v) })
      .catch(() => { if (vivo) setVis(TUDO_VISIVEL) })
    return () => { vivo = false }
  }, [])

  async function alternar(chave: keyof VisibilidadePerfil) {
    if (!vis || salvando) return
    const novo = !vis[chave]
    // Otimista: o interruptor responde na hora e volta se o banco recusar.
    setVis({ ...vis, [chave]: novo })
    setSalvando(chave)
    try {
      const { definirVisibilidade } = await import('../services/visibilidadePerfil')
      await definirVisibilidade(chave, novo)
    } catch (e) {
      setVis((v) => (v ? { ...v, [chave]: !novo } : v))
      toast(e instanceof Error ? e.message : 'Não foi possível salvar agora.')
    } finally {
      setSalvando(null)
    }
  }

  if (!vis) return null

  const escondidas = CHAVES.filter(({ chave }) => !vis[chave]).length

  return (
    <div className="card pad" style={{ marginTop: 12 }}>
      <span className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <IconEye size={12} stroke={2} /> O que aparece no meu perfil público
      </span>
      <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.45, margin: '5px 0 10px' }}>
        Isto controla só a sua página de perfil. Suas fotos continuam no feed do pico,
        seus alertas no mapa e seus mutirões abertos para inscrição.
      </p>

      <div className="stack" style={{ gap: 2 }}>
        {CHAVES.map(({ chave, rotulo, Icone }) => (
          <label
            key={chave}
            className="between"
            style={{ cursor: 'pointer', padding: '7px 0', opacity: salvando === chave ? 0.6 : 1 }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 14 }}>
              <Icone size={18} stroke={2} style={{ color: 'var(--muted)', flexShrink: 0 }} />
              {rotulo}
            </span>
            <input
              type="checkbox"
              checked={vis[chave]}
              disabled={salvando === chave}
              onChange={() => alternar(chave)}
              aria-label={`Mostrar ${rotulo.toLowerCase()} no meu perfil público`}
            />
          </label>
        ))}
      </div>

      {escondidas > 0 && (
        <p className="muted" style={{ fontSize: 11.5, lineHeight: 1.45, marginTop: 8 }}>
          {escondidas === 1 ? 'Uma seção está escondida' : `${escondidas} seções estão escondidas`} de
          quem visita seu perfil. As contagens de reputação continuam visíveis.
        </p>
      )}
    </div>
  )
}
