import { Suspense, lazy, useState, type ReactNode } from 'react'
import { Sigma } from 'lucide-react'
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
import { Formula } from './Formula'

const CampoMatematico = lazy(() => import('./CampoMatematico'))

interface DialogFormulaProps {
  /** Recebe o LaTeX pronto, sem os `$`. Quem chama decide onde inserir. */
  onInserir: (latex: string, bloco: boolean) => void
  trigger?: ReactNode
}

/**
 * Entrada de fórmula com MathLive, devolvendo LaTeX.
 *
 * Não é enfeite (spec 14/08, seção 5): digitar `\int_{0}^{\infty}` às cegas é
 * lento o suficiente para se desistir de anotar no app — e fricção é o que
 * matou as tentativas anteriores de manter um sistema pessoal. Aqui se escreve
 * a fórmula vendo a fórmula.
 *
 * O que sai é LaTeX cru, que é o que a nota guarda. Renderização é view; fonte
 * é texto (é o mesmo princípio que sustenta Markdown como fonte de verdade).
 *
 * MathLive entra por `lazy` porque é pesado e só serve a quem está escrevendo.
 */
export function DialogFormula({ onInserir, trigger }: DialogFormulaProps) {
  const [aberto, setAberto] = useState(false)
  const [latex, setLatex] = useState('')
  const [bloco, setBloco] = useState(false)

  function inserir() {
    const limpo = latex.trim()
    if (limpo === '') return
    onInserir(limpo, bloco)
    setLatex('')
    setAberto(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="secondary" size="sm" type="button">
            <Sigma className="size-4" />
            Fórmula
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fórmula</DialogTitle>
          <DialogDescription>
            Escreva como se lê. O que a nota guarda é o LaTeX.
          </DialogDescription>
        </DialogHeader>

        <Suspense
          fallback={
            <p className="text-muted-foreground text-sm">Carregando editor…</p>
          }
        >
          <CampoMatematico valor={latex} onChange={setLatex} />
        </Suspense>

        {latex.trim() !== '' && (
          <div className="bg-muted/40 rounded-md p-3">
            <Formula latex={latex} bloco={bloco} />
          </div>
        )}

        <label className="text-muted-foreground flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={bloco}
            onChange={(evento) => setBloco(evento.target.checked)}
          />
          Em linha própria, centralizada
        </label>

        <DialogFooter>
          <Button type="button" onClick={inserir} disabled={latex.trim() === ''}>
            Inserir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
