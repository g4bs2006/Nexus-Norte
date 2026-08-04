import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface DialogConfirmarExclusaoProps {
  /** Título do diálogo (ex: "Excluir categoria"). */
  titulo: string
  /** Mensagem descritiva (ex: "Todos os lançamentos desta categoria serão perdidos."). */
  mensagem: string
  /** Callback executado ao confirmar. Pode ser async — o botão mostra "Excluindo…" enquanto pendente. */
  onConfirmar: () => void | Promise<void>
  /** Desabilita o botão de confirmar enquanto a operação está em andamento. */
  pendente?: boolean
  /**
   * Elemento que dispara a abertura do dialog. Se omitido, renderiza um botão
   * ícone de lixeira padrão.
   */
  trigger?: React.ReactNode
  /** Classes extras para o trigger padrão (botão de lixeira). */
  classeTrigger?: string
}

/**
 * Dialog genérico de confirmação de exclusão.
 *
 * Usado em entidades "pai" cuja exclusão em cascata pode destruir dados filhos
 * (categorias, matérias, treinos, projetos). Para exclusões simples (uma linha
 * sem filhos) o botão direto sem confirmação continua sendo usado.
 */
export function DialogConfirmarExclusao({
  titulo,
  mensagem,
  onConfirmar,
  pendente = false,
  trigger,
  classeTrigger,
}: DialogConfirmarExclusaoProps) {
  const [aberto, setAberto] = useState(false)

  async function confirmar() {
    await onConfirmar()
    setAberto(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="ghost"
            size="icon"
            className={
              classeTrigger ??
              'text-muted-foreground hover:text-status-risco size-7'
            }
            aria-label={titulo}
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{mensagem}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setAberto(false)}
            disabled={pendente}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => void confirmar()}
            disabled={pendente}
          >
            {pendente ? 'Excluindo…' : 'Excluir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
