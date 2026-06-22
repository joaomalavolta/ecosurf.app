/** Validação de CPF (formato + dígitos verificadores). */
export function cpfValido(cpf: string): boolean {
  const c = cpf.replace(/\D/g, '')
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false
  const dig = (base: number) => {
    let s = 0
    for (let i = 0; i < base; i++) s += +c[i] * (base + 1 - i)
    const r = 11 - (s % 11)
    return r >= 10 ? 0 : r
  }
  return dig(9) === +c[9] && dig(10) === +c[10]
}

export function formatCpf(v: string): string {
  const c = v.replace(/\D/g, '').slice(0, 11)
  return c
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2')
}
