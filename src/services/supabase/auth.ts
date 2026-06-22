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

/** Login por e-mail (magic link) — funciona sem provedor de SMS. */
export async function entrarComEmail(email: string): Promise<void> {
  const { error } = await sb().auth.signInWithOtp({ email })
  if (error) throw error
}

export async function sair(): Promise<void> {
  await sb().auth.signOut()
}

/** Define o nome de exibição do usuário (aparece no feed). Exige sessão real. */
export async function definirNome(nome: string): Promise<void> {
  const { data } = await sb().auth.getSession()
  const u = data.session?.user
  if (!u || u.is_anonymous) throw new Error('Entre primeiro (telefone ou e-mail).')
  const { error } = await sb().from('perfis').update({ nome }).eq('id', u.id)
  if (error) throw error
}
