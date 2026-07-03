import { useState, useEffect, useMemo } from 'react'
import {
  IconDownload,
} from '@tabler/icons-react'
import * as admin from '../../services/admin'
import { type FotoAdmin } from '../../services/admin'
import { StatusBadge, Estado } from '../ui'
import { Titulo, fmtData, type PicoAdm } from '../shared'

export function ModuloRegistros() {
  const [fotos, setFotos] = useState<FotoAdmin[] | null>(null)
  const [picos, setPicos] = useState<PicoAdm[]>([])
  const [erro, setErro] = useState('')
  useEffect(() => {
    admin.listarFotos().then(setFotos).catch((e) => setErro(String(e?.message ?? e)))
    admin.listarPicosAdmin().then(setPicos).catch(() => { /* fallback: UUID */ })
  }, [])

  const nomesPicos = useMemo(() => new Map(picos.map((p) => [p.id, p.nome])), [picos])

  function exportar() {
    if (!fotos) return
    admin.baixarCSV('registros', fotos.map((f) => ({
      id: f.id, pico: nomesPicos.get(f.pico_id) ?? f.pico_id, capturada_em: f.capturada_em, status: f.status,
      procedencia: f.procedencia, geofence_ok: f.geofence_ok, observacao: f.observacao ?? '',
    })))
  }

  return (
    <section className="admin-content">
      <Titulo
        nome="Registros"
        desc="Todos os registros de condição enviados (foto + metadados)."
        acao={<button className="btn outline" style={{ minHeight: 40 }} disabled={!fotos?.length} onClick={exportar}><IconDownload size={16} /> CSV</button>}
      />
      {erro && <Estado>Erro ao carregar registros.</Estado>}
      {!fotos && !erro && <Estado>Carregando…</Estado>}
      {fotos && fotos.length === 0 && <Estado>Sem registros.</Estado>}
      {fotos && fotos.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="adt">
            <thead><tr><th>Pico</th><th>Capturada</th><th>Procedência</th><th>Geofence</th><th>Status</th></tr></thead>
            <tbody>
              {fotos.map((f) => (
                <tr key={f.id}>
                  <td>{nomesPicos.get(f.pico_id) ?? f.pico_id}</td>
                  <td>{fmtData(f.capturada_em)}</td>
                  <td>{f.procedencia}</td>
                  <td>{f.geofence_ok ? 'ok' : 'não'}</td>
                  <td><StatusBadge status={f.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
