import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { Sigma } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { Formula } from './Formula'
import { simbolosRapidos } from './editor/catalogoSimbolos'
import type { CampoMatematicoHandle } from './CampoMatematico'

const CampoMatematico = lazy(() => import('./CampoMatematico'))

/*
 * A barra sai do catálogo único, e não de uma lista própria.
 *
 * Ela era a terceira cópia — havia esta, a do `//` e a do `Tab`, e as três
 * discordavam sobre quais símbolos existem. Agora `rapido` marca no catálogo o
 * que aparece aqui, e um símbolo novo entra nos três caminhos de uma vez.
 */
const SIMBOLOS_GREGOS = simbolosRapidos('grega')
const SIMBOLOS_OPERADORES = simbolosRapidos('operador')

/** Uma tecla a digitar, na linha de dicas. */
function Atalho({ children }: { children: string }) {
  return (
    <kbd className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono border border-border/50 shadow-2xs">
      {children}
    </kbd>
  )
}

interface DialogFormulaProps {
  onInserir: (latex: string, bloco: boolean) => void
  inicial?: { latex: string; bloco: boolean } | null
  aberto: boolean
  onAbertoChange: (aberto: boolean) => void
}

export function DialogFormula({
  onInserir,
  inicial,
  aberto,
  onAbertoChange,
}: DialogFormulaProps) {
  const [latex, setLatex] = useState('')
  const [bloco, setBloco] = useState(false)
  const campoRef = useRef<CampoMatematicoHandle>(null)

  const editando = inicial != null

  useEffect(() => {
    if (!aberto) return
    setLatex(inicial?.latex ?? '')
    if (inicial) setBloco(inicial.bloco)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto])

  function inserir(forcarBloco?: boolean) {
    const limpo = latex.trim()
    if (limpo === '') return
    const emBloco = forcarBloco ?? bloco
    onInserir(limpo, emBloco)
    setBloco(emBloco)
    setLatex('')
    onAbertoChange(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={onAbertoChange}>
      <DialogContent
        className="max-w-2xl! border-border/80 shadow-2xl backdrop-blur-xl"
        onInteractOutside={(evento) => evento.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sigma className="size-4 text-estudos" />
            <span>{editando ? 'Editar Fórmula' : 'Fórmula Matemática'}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Escreva em LaTeX ou digite o nome e pressione <Atalho>Tab</Atalho> para converter.
          </DialogDescription>
        </DialogHeader>

        {/* Input MathLive com borda suave de foco */}
        <Suspense
          fallback={
            <p className="text-muted-foreground text-sm">Carregando editor…</p>
          }
        >
          <div className="rounded-lg border border-border/80 bg-card p-1 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/40 transition-all shadow-2xs">
            <CampoMatematico
              ref={campoRef}
              valor={latex}
              onChange={setLatex}
              onConfirmar={inserir}
            />
          </div>
        </Suspense>

        {/* Modo de Exibição: Segmented Control Notion Style */}
        <div className="flex items-center justify-between gap-4 py-1 border-b border-border/50">
          <span className="text-xs font-medium text-muted-foreground">Modo de exibição:</span>
          <div className="flex items-center p-0.5 bg-muted/80 rounded-lg border border-border/60 text-xs">
            <button
              type="button"
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer',
                !bloco
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setBloco(false)}
            >
              Em linha ($...$)
            </button>
            <button
              type="button"
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer',
                bloco
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setBloco(true)}
            >
              Bloco centralizado ($$...$$)
            </button>
          </div>
        </div>

        {/* Barra de Símbolos Rápido Agrupada */}
        <div className="space-y-1.5 py-1">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5 flex-wrap">
            <span className="text-[11px] font-medium text-muted-foreground mr-1">Gregas:</span>
            {SIMBOLOS_GREGOS.map((s) => (
              <button
                key={s.gatilho}
                type="button"
                className="h-6 px-1.5 min-w-6 rounded-md bg-muted/80 hover:bg-primary hover:text-primary-foreground text-xs font-mono transition-all flex items-center justify-center border border-border/40 cursor-pointer shadow-2xs"
                onClick={() => campoRef.current?.inserir(s.latex)}
              >
                {s.amostra}
              </button>
            ))}
            <span className="text-[11px] font-medium text-muted-foreground ml-2 mr-1">Operadores:</span>
            {SIMBOLOS_OPERADORES.map((s) => (
              <button
                key={s.gatilho}
                type="button"
                className="h-6 px-1.5 min-w-6 rounded-md bg-muted/80 hover:bg-primary hover:text-primary-foreground text-xs font-mono transition-all flex items-center justify-center border border-border/40 cursor-pointer shadow-2xs"
                onClick={() => campoRef.current?.inserir(s.latex)}
              >
                {s.amostra}
              </button>
            ))}
          </div>
        </div>

        <p className="text-muted-foreground text-[11px] leading-relaxed">
          Digite <Atalho>alpha</Atalho> <Atalho>epsilon</Atalho>{' '}
          <Atalho>theta</Atalho> <Atalho>sum</Atalho> <Atalho>int</Atalho> + <Atalho>Tab</Atalho> para símbolos diretos. <Atalho>/</Atalho>{' '}
          faz fração e <Atalho>^</Atalho> faz expoente.
        </p>

        {/* Live KaTeX Preview Card */}
        {latex.trim() !== '' && (
          <div className="bg-accent/40 border border-border/60 rounded-lg p-3 space-y-1 backdrop-blur-sm">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Pré-visualização KaTeX:
            </span>
            <Formula latex={latex} bloco={bloco} />
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onAbertoChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm cursor-pointer"
            disabled={latex.trim() === ''}
            onClick={() => inserir()}
          >
            <span>{editando ? 'Salvar Fórmula' : 'Inserir Fórmula'}</span>
            <Atalho>↵</Atalho>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
