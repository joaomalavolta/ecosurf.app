/**
 * O que aparece no seu perfil público.
 *
 * Mora em `perfis` (colunas `mostrar_*`), não em `user_preferences`: a RLS de
 * lá entrega a linha só para o dono, e quem precisa enxergar esta regra é
 * justamente quem visita. Ver migration 0061.
 *
 * Esconder aqui é sobre a VITRINE, não sobre apagar. A foto continua no feed
 * do pico, o alerta continua no mapa público e o mutirão continua aceitando
 * inscrição — o que muda é o perfil deixar de reunir tudo num lugar só, que é
 * o que incomoda quem não quer ser fácil de seguir.
 */

export interface VisibilidadePerfil {
  fotos: boolean
  mapa: boolean
  acoes: boolean
}

export const TUDO_VISIVEL: VisibilidadePerfil = { fotos: true, mapa: true, acoes: true }

/** A escolha atual do usuário logado. */
export async function minhaVisibilidade(): Promise<VisibilidadePerfil> {
  try {
    const { sb } = await import('./supabase/client')
    const { data: sessao } = await sb().auth.getSession()
    const uid = sessao.session?.user?.id
    if (!uid) return TUDO_VISIVEL
    const { data, error } = await sb()
      .from('perfis')
      .select('mostrar_fotos, mostrar_mapa, mostrar_acoes')
      .eq('id', uid)
      .maybeSingle()
    if (error || !data) return TUDO_VISIVEL
    const r = data as {
      mostrar_fotos?: boolean | null
      mostrar_mapa?: boolean | null
      mostrar_acoes?: boolean | null
    }
    // `?? true`, nunca `!!`. Enquanto o deploy do app e o do banco não se
    // encontram, a coluna pode não vir — e aí `undefined` viraria "escondido".
    // O usuário abriria o próprio perfil e leria "3 seções estão escondidas",
    // o que é falso e assustador. Na dúvida, mostrar.
    return {
      fotos: r.mostrar_fotos ?? true,
      mapa: r.mostrar_mapa ?? true,
      acoes: r.mostrar_acoes ?? true,
    }
  } catch {
    return TUDO_VISIVEL
  }
}

/**
 * Grava uma das chaves.
 *
 * O erro sobe como `Error` de verdade: erro do PostgREST é objeto simples, e
 * `throw error` faria `e instanceof Error` dar false — foi assim que "não foi
 * possível salvar" escondeu por dois meses o motivo real (ver 0052).
 */
export async function definirVisibilidade(
  chave: keyof VisibilidadePerfil,
  valor: boolean,
): Promise<void> {
  const { sb } = await import('./supabase/client')
  const { data: sessao } = await sb().auth.getSession()
  const uid = sessao.session?.user?.id
  if (!uid) throw new Error('Entre na sua conta para mudar isso.')

  const coluna = { fotos: 'mostrar_fotos', mapa: 'mostrar_mapa', acoes: 'mostrar_acoes' }[chave]
  const { error } = await sb().from('perfis').update({ [coluna]: valor }).eq('id', uid)
  if (error) throw new Error(error.message || 'Não foi possível salvar a preferência.')
}
