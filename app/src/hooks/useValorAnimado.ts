import { useEffect, useState } from 'react'

/**
 * Devolve 0 na primeira pintura e o valor real logo depois, para que uma
 * transição CSS tenha de onde partir.
 *
 * Sem isso, anéis e barras montam já no valor final e a transição declarada
 * nunca dispara — era o caso do `AnelProgresso` e das barras de progresso até o
 * Bloco A do brief de design.
 *
 * Respeita `prefers-reduced-motion`: quem pede menos movimento recebe o valor
 * final direto, sem quadro intermediário.
 */
export function useValorAnimado(valor: number | null): number | null {
  const reduzMovimento =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const [atual, setAtual] = useState<number | null>(
    reduzMovimento ? valor : valor === null ? null : 0,
  )

  useEffect(() => {
    if (reduzMovimento || valor === null) {
      setAtual(valor)
      return
    }

    // Dois quadros: o primeiro garante que o navegador pintou o estado zerado,
    // o segundo aplica o destino. Com um só, o React pode agrupar as duas
    // atualizações e a transição é perdida.
    let segundo = 0
    const primeiro = requestAnimationFrame(() => {
      segundo = requestAnimationFrame(() => setAtual(valor))
    })

    return () => {
      cancelAnimationFrame(primeiro)
      cancelAnimationFrame(segundo)
    }
  }, [valor, reduzMovimento])

  return atual
}
