import { Check, Ban } from 'lucide-react'
import { CORES_DISPONIVEIS } from '@/lib/cores'
import { cn } from '@/lib/utils'

interface SeletorCorProps {
  /** Hex selecionado, ou `''` para "sem cor". */
  valor: string
  onChange: (valor: string) => void
}

/**
 * Seleção de cor por swatches, a partir da paleta fixa em `lib/cores`.
 *
 * Substitui a entrada livre de hex: garante que a cor gravada pertença à
 * paleta do design system e permaneça legível nos dois temas.
 */
export function SeletorCor({ valor, onChange }: SeletorCorProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* "Sem cor" — cai na cor do pilar na renderização */}
      <button
        type="button"
        onClick={() => onChange('')}
        title="Sem cor"
        aria-label="Sem cor"
        aria-pressed={valor === ''}
        className={cn(
          // 36px no toque: swatch de 28px é alvo pequeno demais para o dedo
          'flex size-9 items-center justify-center rounded-full border transition-all sm:size-7',
          'text-muted-foreground hover:border-foreground/40',
          valor === ''
            ? 'border-foreground/60 ring-ring/40 ring-2'
            : 'border-border',
        )}
      >
        <Ban className="size-3.5" />
      </button>

      {CORES_DISPONIVEIS.map((cor) => {
        const selecionada = valor === cor.valor
        return (
          <button
            key={cor.valor}
            type="button"
            onClick={() => onChange(cor.valor)}
            title={cor.nome}
            aria-label={cor.nome}
            aria-pressed={selecionada}
            style={{ backgroundColor: cor.valor }}
            className={cn(
              'flex size-9 items-center justify-center rounded-full transition-all sm:size-7',
              'ring-offset-background hover:scale-105',
              selecionada && 'ring-foreground/50 ring-2 ring-offset-2',
            )}
          >
            {selecionada && (
              <Check className="size-3.5 text-white drop-shadow-sm" />
            )}
          </button>
        )
      })}
    </div>
  )
}
