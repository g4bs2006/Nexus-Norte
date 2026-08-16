import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Formula } from './Formula'
import type { CampoMatematicoHandle } from './CampoMatematico'

const CampoMatematico = lazy(() => import('./CampoMatematico'))

const SIMBOLOS_RAPIDOS = [
  { rotulo: 'α', latex: '\\alpha' },
  { rotulo: 'β', latex: '\\beta' },
  { rotulo: 'γ', latex: '\\gamma' },
  { rotulo: 'δ', latex: '\\delta' },
  { rotulo: 'ε', latex: '\\epsilon' },
  { rotulo: 'θ', latex: '\\theta' },
  { rotulo: 'λ', latex: '\\lambda' },
  { rotulo: 'μ', latex: '\\mu' },
  { rotulo: 'π', latex: '\\pi' },
  { rotulo: 'σ', latex: '\\sigma' },
  { rotulo: 'ω', latex: '\\omega' },
  { rotulo: 'Δ', latex: '\\Delta' },
  { rotulo: 'Ω', latex: '\\Omega' },
  { rotulo: '∞', latex: '\\infty' },
  { rotulo: '∂', latex: '\\partial' },
  { rotulo: '√', latex: '\\sqrt{#?}' },
  { rotulo: '∫', latex: '\\int_{#?}^{#?}' },
  { rotulo: '∑', latex: '\\sum_{#?}^{#?}' },
  { rotulo: '≈', latex: '\\approx' },
  { rotulo: '≠', latex: '\\neq' },
]

/** Uma tecla a digitar, na linha de dicas. */
function Atalho({ children }: { children: string }) {
  return (
    <code className="bg-muted rounded px-1 py-0.5 font-mono text-[11px]">
      {children}
    </code>
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
        className="max-w-2xl!"
        onInteractOutside={(evento) => evento.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar fórmula' : 'Fórmula'}</DialogTitle>
          <DialogDescription>
            Escreva como se lê ou clique nos símbolos rápidos abaixo.
          </DialogDescription>
        </DialogHeader>

        <Suspense
          fallback={
            <p className="text-muted-foreground text-sm">Carregando editor…</p>
          }
        >
          <CampoMatematico
            ref={campoRef}
            valor={latex}
            onChange={setLatex}
            onConfirmar={inserir}
          />
        </Suspense>

        {/* Barra de Símbolos Rápido de 1-Clique */}
        <div className="flex flex-wrap gap-1 py-1.5 border-y border-border/60 my-1">
          <span className="text-[11px] font-medium text-muted-foreground self-center mr-1">Rápidos:</span>
          {SIMBOLOS_RAPIDOS.map((s) => (
            <button
              key={s.rotulo}
              type="button"
              className="h-6 px-1.5 min-w-6 rounded bg-muted hover:bg-accent text-xs font-mono transition-colors flex items-center justify-center border border-border/40 cursor-pointer"
              onClick={() => campoRef.current?.inserir(s.latex)}
            >
              {s.rotulo}
            </button>
          ))}
        </div>

        <p className="text-muted-foreground text-xs">
          Digite <Atalho>alpha</Atalho> <Atalho>epsilon</Atalho>{' '}
          <Atalho>theta</Atalho> <Atalho>sum</Atalho> <Atalho>int</Atalho>{' '}
          <Atalho>oo</Atalho> para símbolos directos no teclado. <Atalho>/</Atalho>{' '}
          faz fração e <Atalho>^</Atalho> faz expoente.
        </p>

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
          <span className="text-muted-foreground/70">
            — ou <Atalho>Ctrl</Atalho>+<Atalho>Enter</Atalho> para inserir assim
          </span>
        </label>

        <DialogFooter>
          {/*
            `() => inserir()` e não `inserir`: passado direto, o evento de
            clique viraria o argumento `forcarBloco` — e um MouseEvent é
            truthy, então todo botão inseriria em bloco.
          */}
          <Button
            type="button"
            onClick={() => inserir()}
            disabled={latex.trim() === ''}
          >
            {editando ? 'Salvar' : 'Inserir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
