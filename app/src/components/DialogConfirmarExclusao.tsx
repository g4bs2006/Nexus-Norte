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
 * Dialog de confirmação de exclusão. **Todo botão que apaga passa por aqui.**
 *
 * Era usado só em entidades "pai" com cascata (categoria, matéria, treino,
 * projeto), e a regra escrita aqui dizia que "exclusão simples" podia ser botão
 * direto. A regra estava errada no celular: um lançamento, uma série ou uma falta
 * apagados por engano não voltam, e o sistema não tem desfazer nem lixeira. O que
 * distingue os casos não é o tamanho da cascata — é ser irreversível, e todos são.
 *
 * No mobile o argumento é mais forte ainda: esses botões viviam em linhas apertadas
 * com 36px de alvo, colados no de editar, tocados com o polegar enquanto a lista
 * rola. Por isso o trigger padrão tem **44px** no toque (`size-11`), a régua do HIG,
 * e volta a 28px de `sm:` para cima, onde há mouse.
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
              'text-muted-foreground hover:text-status-risco size-11 shrink-0 sm:size-7'
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
