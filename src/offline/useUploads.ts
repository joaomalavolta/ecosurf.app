import { useEffect, useState } from 'react'
import { onMudanca, pendentes } from './uploadQueue'
import type { UploadPendente } from './db'

export function useUploads(): UploadPendente[] {
  const [lista, setLista] = useState<UploadPendente[]>([])
  useEffect(() => {
    let vivo = true
    const carregar = () => pendentes().then((p) => vivo && setLista(p))
    void carregar()
    const off = onMudanca(carregar)
    return () => {
      vivo = false
      off()
    }
  }, [])
  return lista
}
