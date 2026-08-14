import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { cn } from '@/lib/utils'

interface FormulaProps {
  /** LaTeX cru, sem os `$`. */
  latex: string
  /** `$$…$$` renderiza centralizado em linha própria. */
  bloco?: boolean
  className?: string
}

/**
 * Fórmula LaTeX renderizada por KaTeX.
 *
 * **KaTeX e não MathJax** (spec 14/08, seção 5): é síncrono e rápido, e cobre o
 * LaTeX de Engenharia. MathJax é mais completo em cantos exóticos e é
 * assíncrono — numa nota com trinta fórmulas, esperar trinta renderizações
 * assíncronas é a diferença entre abrir e travar.
 *
 * Mora no kernel porque o editor também mora, e a fórmula aparece dos dois
 * lados: na leitura e na pré-visualização de quem está escrevendo.
 *
 * `throwOnError: false` de propósito. LaTeX quebrado é o estado NORMAL de quem
 * está digitando `\frac{` — derrubar a nota inteira por causa disso seria
 * trocar um erro visível e local por uma tela em branco.
 */
export function Formula({ latex, bloco = false, className }: FormulaProps) {
  const html = useMemo(
    () =>
      katex.renderToString(latex, {
        displayMode: bloco,
        throwOnError: false,
        // `trust: false` é o padrão e fica explícito: bloqueia \href e \includegraphics,
        // que transformariam o conteúdo da nota em vetor de HTML arbitrário.
        trust: false,
        output: 'html',
      }),
    [latex, bloco],
  )

  return (
    <span
      className={cn(bloco && 'my-2 block overflow-x-auto text-center', className)}
      // O HTML vem do KaTeX sobre LaTeX próprio, com `trust` desligado — não há
      // caminho daqui para script nem para link externo.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
