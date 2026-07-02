import { useState } from 'react'
import {
  IconDownload,
} from '@tabler/icons-react'
import * as admin from '../../services/admin'
import { Titulo } from '../shared'

export function ModuloRelatorios() {
  const [carregando, setCarregando] = useState('')
  async function exportar(nome: string, fn: () => Promise<Record<string, unknown>[]>) {
    setCarregando(nome)
    try {
      admin.baixarCSV(nome, await fn())
    } finally {
      setCarregando('')
    }
  }
  const itens: { nome: string; rotulo: string; fn: () => Promise<Record<string, unknown>[]> }[] = [
    { nome: 'usuarios', rotulo: 'Usuários', fn: async () => (await admin.listarUsuarios()).map((u) => ({ id: u.id, nome: u.nome ?? '', cidade: u.cidade ?? '', papel: u.papel, onboarded: u.onboarded, criado_em: u.criado_em })) },
    { nome: 'picos', rotulo: 'Picos', fn: async () => admin.listarPicosAdmin() as Promise<Record<string, unknown>[]> },
    { nome: 'ameacas', rotulo: 'Ameaças', fn: async () => admin.listarAmeacasAdmin() as Promise<Record<string, unknown>[]> },
    { nome: 'fotos', rotulo: 'Fotos', fn: async () => (await admin.listarFotos()).map((f) => ({ id: f.id, pico: f.pico_id, capturada_em: f.capturada_em, status: f.status, procedencia: f.procedencia, geofence_ok: f.geofence_ok })) },
    { nome: 'logs', rotulo: 'Logs', fn: async () => admin.listarLogs() as Promise<Record<string, unknown>[]> },
  ]
  return (
    <section className="admin-content">
      <Titulo nome="Relatórios" desc="Exporte os dados em CSV. Dados sensíveis (CPF, localização exata) ficam de fora." />
      <div className="admin-grid">
        {itens.map((it) => (
          <button key={it.nome} className="stat" style={{ textAlign: 'left', cursor: 'pointer', border: 0 }} disabled={!!carregando} onClick={() => exportar(it.nome, it.fn)}>
            <div className="row" style={{ gap: 8 }}><IconDownload size={18} /> <b>{it.rotulo}</b></div>
            <div className="k" style={{ marginTop: 4 }}>{carregando === it.nome ? 'gerando…' : 'baixar CSV'}</div>
          </button>
        ))}
      </div>
    </section>
  )
}


