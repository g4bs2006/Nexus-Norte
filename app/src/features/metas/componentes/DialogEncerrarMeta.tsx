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
      <DialogContent className="border-border/80 max-w-md shadow-2xl backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2 text-base">
            <CheckCircle2 className="size-5 text-emerald-500" />
            <span>Encerrar Meta Definitivamente</span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground pt-1 text-xs">
            Deseja marcar a meta{' '}
            <strong className="text-foreground">"{meta.titulo}"</strong> como
            concluída?
            {meta.no_check_diario && (
              <span className="block pt-1 font-medium text-emerald-600/90 dark:text-emerald-400">
                Ela deixará de aparecer na lista de checks do topo e permanecerá
                armazenada como concluída no seu painel de metas.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={encerrar.isPending}
            onClick={confirmar}
          >
            <span>Concluir Meta</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
