import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useExcluirMeta, useMetas } from '../hooks'
import type { Meta } from '../types'
import { DialogMeta } from './DialogMeta'
import { ItemMetaRow } from './ItemMetaRow'

type Filtro = 'ativas' | 'concluidas' | 'todas'

interface DialogListaMetasProps {
  aberto: boolean
  onOpenChange: (aberto: boolean) => void
  hoje: Date
}

function aplicarFiltro(metas: Meta[], filtro: Filtro): Meta[] {
  if (filtro === 'ativas') return metas.filter((m) => !m.concluida)
  if (filtro === 'concluidas') return metas.filter((m) => m.concluida)
  return metas
}

export function DialogListaMetas({
  aberto,
  onOpenChange,
}: DialogListaMetasProps) {
  const { data } = useMetas()
  const excluir = useExcluirMeta()
  const [filtro, setFiltro] = useState<Filtro>('ativas')

  const metas = aplicarFiltro(data ?? [], filtro)

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Metas</DialogTitle>
          <DialogDescription>
            Todas as metas, de qualquer categoria, num só lugar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {(['ativas', 'concluidas', 'todas'] as const).map((valor) => (
              <Button
                key={valor}
                size="sm"
                variant={filtro === valor ? 'secondary' : 'ghost'}
                onClick={() => setFiltro(valor)}
              >
                {valor === 'ativas'
                  ? 'Ativas'
                  : valor === 'concluidas'
                    ? 'Concluídas'
                    : 'Todas'}
              </Button>
            ))}
          </div>
          <DialogMeta />
        </div>

        {metas.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            Nenhuma meta {filtro === 'concluidas' ? 'concluída' : 'ativa'} por aqui.
          </p>
        ) : (
          <div className="space-y-2">
            {metas.map((meta) => (
              <ItemMetaRow
                key={meta.id}
                meta={meta}
                onExcluir={() => excluir.mutate(meta.id)}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
