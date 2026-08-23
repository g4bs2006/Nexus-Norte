import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useEncerrarMeta } from '../hooks'
import type { Meta } from '../types'

interface DialogEncerrarMetaProps {
  meta: Meta
  aberto: boolean
  onOpenChange: (aberto: boolean) => void
}

/**
 * Confirmação de encerramento definitivo, no mesmo formato de
 * `DialogConfirmarExclusao`: `DialogContent` sem override, cancelar em
 * `outline`, e o rótulo do botão dizendo o que vai acontecer.
 */
export function DialogEncerrarMeta({
  meta,
  aberto,
  onOpenChange,
}: DialogEncerrarMetaProps) {
  const encerrar = useEncerrarMeta()

  async function confirmar() {
    await encerrar.mutateAsync(meta.id)
    onOpenChange(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="text-status-ok size-5 shrink-0" />
            <span>Encerrar meta</span>
          </DialogTitle>
          <DialogDescription>
            Marcar <strong className="text-foreground">{meta.titulo}</strong>{' '}
            como concluída?
            {meta.no_check_diario && (
              <span className="block pt-2">
                Ela sai da lista de checks do topo e fica guardada como
                concluída no painel de metas.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={encerrar.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => void confirmar()}
            disabled={encerrar.isPending}
          >
            {encerrar.isPending ? 'Encerrando…' : 'Encerrar meta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
