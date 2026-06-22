# Backend do Ecosurf (Supabase / PostgreSQL + PostGIS)

> **Provisionado** em `ecosurf-app` (org joaomalavolta, região sa-east-1),
> projeto ref `mdgttlgtrrmkmqttrxdq` · URL `https://mdgttlgtrrmkmqttrxdq.supabase.co`.
> Migrations 0001–0006 aplicadas, bucket `fotos` criado, RLS sem lints.
> Falta só ligar um provedor de SMS para o login por telefone (ver abaixo).
>
> As chaves vão em `.env` (não versionado) — ver `.env.example`. A anon/publishable
> key é de cliente (pode aparecer no front), mas mantemos fora do repo por higiene.

## Provisionar

1. Criar projeto Supabase (ou Postgres+PostGIS próprio, para soberania total).
2. Aplicar as migrations em ordem:
   - `migrations/0001_schema.sql`
   - `migrations/0002_rls.sql`
   (via `supabase db push`, o SQL editor, ou a tool MCP `apply_migration`.)
3. Criar o bucket de Storage `fotos` (privado; servir via URL assinada/CDN).
4. Habilitar **Auth por telefone (OTP)** — login leve, alinhado ao público.
5. Copiar URL e anon key para `.env` (ver `.env.example`).

## Auth por telefone (fluxo)

```
usuário digita celular → supabase.auth.signInWithOtp({ phone })
        → recebe SMS → verifyOtp({ phone, token })
        → trigger cria linha em `perfis` (telefone_validado = true)
```
A confiança comunitária (precisão, nível, moderação por veterano de região)
cresce sobre `perfis`.

## Ligar o app ao backend (a implementar ao provisionar)

`src/services/api.ts` já define o contrato (`EcosurfApi`). O mock implementa ele
hoje. O adaptador real (esboço) — instalar `@supabase/supabase-js` e:

```ts
// src/services/supabase/api.ts (criar ao provisionar)
import { createClient } from '@supabase/supabase-js'
import type { EcosurfApi, NovaFoto } from '../api'

const sb = createClient(import.meta.env.VITE_SUPABASE_URL!, import.meta.env.VITE_SUPABASE_ANON_KEY!)

export const supabaseApi: EcosurfApi = {
  async enviarFoto(f: NovaFoto) {
    const path = `${f.picoId}/${f.id}.webp`
    if (f.blob) await sb.storage.from('fotos').upload(path, f.blob, { contentType: 'image/webp' })
    const { error } = await sb.from('fotos').insert({
      id: f.id, pico_id: f.picoId, capturada_em: f.capturadaEm,
      storage_path: path, procedencia: f.procedencia, geofence_ok: f.geofenceOk,
      observacao: f.observacao,
    })
    if (error) throw error
    return { id: f.id }
  },
}
```

Depois, em `api.ts`, escolher pela env:
```ts
export const api = import.meta.env.VITE_SUPABASE_URL ? supabaseApi : mockApi
```
A fila offline (`src/offline/uploadQueue.ts`) passa a reenviar contra o backend
real sem mudança — e o `BackgroundSyncPlugin` do Workbox pode replicar a fila
no Service Worker.

## Procedência / anti-fake (server-side)

O selo `no-local` só deve ser aceito quando o servidor confirmar:
- `geofence_ok` = ponto dentro do raio do pico;
- `capturada_em` próximo do `criada_em` (anti-foto-antiga);
- foto vinda da câmera in-app (não upload de galeria).
Validar no insert (policy/trigger), nunca confiar só no cliente.
