import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { deISO } from '@/lib/datas'
import type { EventoCalendario } from '../eventos'

export interface PedidoMoverProva {
  evento: EventoCalendario
  novaData: string
}

interface DialogConfirmarMoverProvaProps {
  /** `null` = fechado. */
  pedido: PedidoMoverProva | null
  onFechar: () => void
  onConfirmar: (pedido: PedidoMoverProva) => void
  pendente?: boolean
}

/**
 * Confirmação antes de mover uma prova (spec 2026-08-13, seção 1).
 *
 * Mudar a data de avaliação recalcula pressão de prazo e risco em outras
 * telas — não é operação para acontecer por esbarrão no touch. O arrasto na
 * grade já foi revertido visualmente antes deste diálogo abrir (`GradeMes`);
 * confirmar aqui chama a mutation de novo, como se fosse um novo arrasto.
 */
export function DialogConfirmarMoverProva({
  pedido,
  onFechar,
  onConfirmar,
  pendente = false,
}: DialogConfirmarMoverProvaProps) {
  return (
    <Dialog open={pedido !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mover prova?</DialogTitle>
          <DialogDescription>
            {pedido && (
              <>
                Mover "{pedido.evento.titulo}" para{' '}
                {format(deISO(pedido.novaData), "dd 'de' MMMM")}?
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar} disabled={pendente}>
            Cancelar
          </Button>
          <Button
            onClick={() => pedido && onConfirmar(pedido)}
            disabled={pendente}
          >
            {pendente ? 'Movendo…' : 'Mover'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
