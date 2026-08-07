import { useEffect, useState } from 'react'

/**
 * Devolve `valor` só depois de `delayMs` sem mudar de novo.
 *
 * Usado pelos sliders de corte do simulador (resolução 10.47.5): arrastar
 * dispara uma nova posição a cada pixel, e recalcular a projeção inteira a
 * cada uma delas é trabalho que não muda o que se lê na tela — só o valor
 * final, depois que o dedo para, precisa virar recorte de verdade.
 */
export function useDebounced<T>(valor: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(valor)

  useEffect(() => {
    const temporizador = setTimeout(() => setDebounced(valor), delayMs)
    return () => clearTimeout(temporizador)
  }, [valor, delayMs])

  return debounced
}
