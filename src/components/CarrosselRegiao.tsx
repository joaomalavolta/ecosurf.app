import { Link } from 'react-router-dom'
import { IconSeeding, IconAlertTriangle, IconUsers, IconPaw } from '@tabler/icons-react'
import type { Alerta, Mutirao } from '../types/domain'
import { SUPABASE_URL } from '../services/supabase/config'
import { categoriaPorId } from './SeletorCategoria'

/**
 * Mini-carrossel da região: alertas e mutirões com FOTO, num trilho único
 * logo abaixo dos filtros do feed. Substitui as faixas soltas — os reports
 * cívicos ganham palco visual sem competir com as fotos-herói de onda.
 */

const COR_GRAVIDADE: Record<string, string> = {
  critica: '#D64045', alta: '#E8734A', media: '#E8A05C', baixa: '#8FA6AD',
}


const PESO_GRAV: Record<string, number> = { critica: 0, alta: 1, media: 2, baixa: 3 }

const TOTAL_VAGAS = 8
const VAGAS_POSITIVAS = 3

/**
 * Quais registros entram no trilho, e em que ordem.
 *
 * ── Vagas reservadas, e não uma fila única ────────────────────────────────
 *
 * A primeira versão ordenava tudo junto dando aos positivos um peso pior que
 * o da gravidade mais baixa, e cortava em oito. Com dez alertas no ar — o caso
 * real de hoje — as oito vagas eram todas de alerta e nenhum positivo chegava
 * ao carrossel: o recurso existia e era invisível.
 *
 * Fila única não resolve, porque os critérios são diferentes de verdade —
 * alerta ordena por GRAVIDADE, positivo por NOVIDADE — e a urgência do alerta
 * sempre ganharia. Então o espaço é dividido: havendo positivo, três das oito
 * vagas são dele; sem positivo, o alerta ocupa as oito como antes.
 *
 * Exportada para poder ser testada sem montar o componente.
 */
export function vagasDoCarrossel(registros: Alerta[]): Alerta[] {
  const ehPositivo = (a: Alerta) => categoriaPorId(a.categoria).tipo === 'positivo'
  const grav = (a: Alerta) => PESO_GRAV[a.gravidade ?? 'media'] ?? 2
  const nova = (a: Alerta) => (a.criadaEm ? new Date(a.criadaEm).getTime() : 0)

  const positivos = registros.filter(ehPositivo)
    .sort((a, b) => nova(b) - nova(a))
    .slice(0, VAGAS_POSITIVAS)
  const soAlertas = registros.filter((a) => !ehPositivo(a))
    .sort((a, b) => grav(a) - grav(b))
    .slice(0, TOTAL_VAGAS - positivos.length)

  // Alertas primeiro: a urgência abre o trilho.
  return [...soAlertas, ...positivos]
}

export function CarrosselRegiao({ alertas, mutiroes }: { alertas: Alerta[]; mutiroes: Mutirao[] }) {
  if (alertas.length === 0 && mutiroes.length === 0) return null

  const registrosOrd = vagasDoCarrossel(alertas)

  return (
    <>
      <div className="between" style={{ padding: '6px 16px 0' }}>
        <span className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><IconSeeding size={12} stroke={2} /> Agir local · o que há por perto</span>
      </div>
      <div className="carrossel-regiao">
      {registrosOrd.map((a) => {
        const cat = categoriaPorId(a.categoria)
        const IconeCat = cat.icone
        const img = a.images?.[0]
        // Positivo usa a cor da categoria; a escala de gravidade pintaria de
        // laranja "média" uma tartaruga avistada.
        const ehPositivo = cat.tipo === 'positivo'
        const cor = ehPositivo ? cat.cor : (COR_GRAVIDADE[a.gravidade ?? 'media'] ?? '#8FA6AD')
        return (
          <Link key={`a-${a.id}`} to={`/alerta/${a.id}`} className="cr-card">
            <div className="cr-foto" style={{ background: 'linear-gradient(135deg, #0D6EA8, #2E9BD6)' }}>
              {img
                ? <img src={`${SUPABASE_URL}/storage/v1/object/public/fotos/${img}`} alt="" loading="lazy" />
                : <IconeCat size={30} stroke={1.8} color="rgba(255,255,255,.92)" />}
              <span className="cr-chip" style={{ background: cor }}>
                {ehPositivo
                  ? <><IconPaw size={10} stroke={2.5} /> {cat.label}</>
                  : <><IconAlertTriangle size={10} stroke={2.5} /> {a.gravidade ?? 'média'}</>}
              </span>
            </div>
            <span className="cr-titulo">{a.titulo}</span>
            <span className="cr-sub">{a.municipio}{a.uf ? `/${a.uf}` : ''}</span>
          </Link>
        )
      })}

      {mutiroes.slice(0, 8).map((m) => (
        <Link key={`m-${m.id}`} to={`/mutirao/${m.id}`} className="cr-card">
          <div className="cr-foto" style={{ background: 'linear-gradient(135deg, #0D6EA8, #2E9BD6)' }}>
            {m.imagemUrl
              ? <img src={m.imagemUrl} alt="" loading="lazy" />
              : <IconUsers size={30} stroke={1.8} color="rgba(255,255,255,.92)" />}
            <span className="cr-chip" style={{ background: '#2E9B6B' }}>
              <IconUsers size={10} stroke={2.5} /> {m.quando}{m.horario ? ` ${m.horario}` : ''}
            </span>
          </div>
          <span className="cr-titulo">{m.titulo}</span>
          <span className="cr-sub">{m.municipio}/{m.uf}</span>
        </Link>
      ))}
      </div>
    </>
  )
}
