/**
 * Skeletons de carregamento — placeholders pulsantes no formato do conteúdo
 * real, em vez de "Carregando...". Reduzem a sensação de espera e evitam o
 * salto de layout quando os dados chegam.
 */

export function Skeleton({ w = '100%', h = 16, r = 8, style }: { w?: number | string; h?: number | string; r?: number; style?: React.CSSProperties }) {
  return <span className="skeleton" style={{ width: w, height: h, borderRadius: r, display: 'block', ...style }} />
}

/** Placeholder de um card-herói do feed (foto grande + linha de dados). */
export function SkeletonFeedCard() {
  return (
    <div style={{ margin: '0 16px 16px' }}>
      <Skeleton h={0} style={{ paddingBottom: '125%', borderRadius: 18 }} />
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <Skeleton w={120} h={13} />
        <Skeleton w={70} h={13} />
      </div>
    </div>
  )
}

/** Bolhas de stories carregando. */
export function SkeletonStories() {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '4px 16px' }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <Skeleton w={62} h={62} r={99} />
          <Skeleton w={44} h={9} />
        </div>
      ))}
    </div>
  )
}

/** Linha de lista (alerta, mutirão, publicação). */
export function SkeletonLinha() {
  return (
    <div className="card pad" style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
      <Skeleton w={44} h={44} r={12} />
      <div style={{ flex: 1 }}>
        <Skeleton w="70%" h={14} style={{ marginBottom: 6 }} />
        <Skeleton w="45%" h={11} />
      </div>
    </div>
  )
}

/** Página de detalhe (Pico/Mutirão): capa + título + linhas de meta + cards. */
export function SkeletonDetalhe() {
  return (
    <div style={{ padding: '4px 16px 16px' }}>
      <Skeleton h={0} r={16} style={{ paddingBottom: '55%', marginBottom: 14 }} />
      <Skeleton w="72%" h={22} style={{ marginBottom: 8 }} />
      <Skeleton w="48%" h={13} style={{ marginBottom: 18 }} />
      <div className="card pad" style={{ marginBottom: 10 }}>
        <Skeleton w={80} h={10} style={{ marginBottom: 12 }} />
        <Skeleton w="90%" h={13} style={{ marginBottom: 6 }} />
        <Skeleton w="70%" h={13} />
      </div>
      <div className="card pad">
        <Skeleton w={100} h={10} style={{ marginBottom: 12 }} />
        <Skeleton w="100%" h={13} style={{ marginBottom: 6 }} />
        <Skeleton w="85%" h={13} />
      </div>
    </div>
  )
}

/** Formulário em edição: título + campos empilhados. */
export function SkeletonFormulario() {
  return (
    <div style={{ padding: '4px 16px 16px' }}>
      <Skeleton w="60%" h={22} style={{ marginBottom: 22 }} />
      {[0, 1, 2].map((i) => (
        <div key={i} className="card pad" style={{ marginBottom: 10 }}>
          <Skeleton w={80} h={10} style={{ marginBottom: 10 }} />
          <Skeleton w="100%" h={38} r={10} />
        </div>
      ))}
    </div>
  )
}
