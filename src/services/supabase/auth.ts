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
