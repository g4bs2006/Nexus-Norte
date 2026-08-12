import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CheckDiaProps {
  id: string
  marcado: boolean
  onAlternar: (marcado: boolean) => void
  children: ReactNode
  /** Texto secundário à direita — horário, matéria, o que for. */
  detalhe?: string
  /** Marcador de exceção (ex: aula remarcada). */
  aviso?: string
  /**
   * Filete de identidade do item (hoje, a cor da matéria).
   *
   * Fica FORA de `check-texto` de propósito: é ali que mora a animação de risco
   * ao marcar, e um filete lá dentro seria riscado junto — a cor identifica a
   * matéria, não é parte da frase.
   */
  cor?: string
}

/**
 * O check do dia — assinatura visual do sistema (Bloco C do brief).
 *
 * Usa `<label>` envolvendo um input nativo escondido em vez do `Checkbox` do
 * shadcn: a animação depende de encadear estados entre a caixa, a marca e o
 * texto, e o `:checked` do input nativo faz isso em CSS puro, sem re-render.
 * Acessibilidade e navegação por teclado vêm de graça do input.
 *
 * A área de toque cobre a linha inteira — no celular, acertar um alvo de 16px é
 * o tipo de fricção que faz um check diário ser abandonado.
 */
export function CheckDia({
  id,
  marcado,
  onAlternar,
  children,
  detalhe,
  aviso,
  cor,
}: CheckDiaProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'hover:bg-accent/50 -mx-2 flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 transition-colors',
        marcado && 'check-marcado',
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={marcado}
        onChange={(evento) => onAlternar(evento.target.checked)}
        className="sr-only peer"
      />

      <span
        aria-hidden
        className="check-caixa peer-focus-visible:ring-ring peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--card)]"
      >
        <svg viewBox="0 0 24 24" className="check-marca">
          <path d="M4 12.5 9.5 18 20 6.5" />
        </svg>
      </span>

      {cor && (
        <span
          aria-hidden
          className="-mr-1.5 h-4 w-0.5 shrink-0 rounded-full"
          style={{ backgroundColor: cor }}
        />
      )}

      <span className="min-w-0 flex-1 text-sm">
        <span className="check-texto">{children}</span>
        {detalhe && (
          <span className="text-muted-foreground ml-1.5 font-mono text-xs tabular-nums">
            {detalhe}
          </span>
        )}
        {aviso && (
          <span className="text-status-atencao ml-1.5 text-xs">{aviso}</span>
        )}
      </span>
    </label>
  )
}
