import { sb } from './client'

/** Auth leve por telefone (OTP via SMS). Dormente sem backend. */
export async function entrarComTelefone(phone: string): Promise<void> {
  const { error } = await sb().auth.signInWithOtp({ phone })
  if (error) throw error
}

export async function confirmarCodigo(phone: string, token: string): Promise<void> {
  const { error } = await sb().auth.verifyOtp({ phone, token, type: 'sms' })
  if (error) throw error
}

export async function sair(): Promise<void> {
  await sb().auth.signOut()
}

/** Define o nome de exibição do usuário (aparece no feed). Cria sessão se preciso. */
export async function definirNome(nome: string): Promise<void> {
  const { data: s } = await sb().auth.getSession()
  let uid = s.session?.user.id
  if (!uid) {
    const { data, error } = await sb().auth.signInAnonymously()
    if (error || !data.user) throw error ?? new Error('sem sessão')
    uid = data.user.id
  }
  const { error } = await sb().from('perfis').update({ nome }).eq('id', uid)
  if (error) throw error
}
