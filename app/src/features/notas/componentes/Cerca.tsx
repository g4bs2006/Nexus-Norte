import { useMemo } from 'react'
import { renderizarBloco } from './renderizadores'

interface CercaProps {
  linguagem: string
  codigo: string
}

/**
 * Uma cerca de código na LEITURA da nota.
 *
 * Quem decide o que cada linguagem vira é `renderizarBloco`, o mesmo que as
 * node views do editor usam — então ler e escrever mostram a mesma coisa, sem
 * duas listas para divergir.
 *
 * Aqui o `null` dele vira `<pre>`: linguagem que não é nossa é código, e código
 * se mostra como código. No editor o mesmo `null` deixa aparecer a cerca
 * editável, que já existe lá.
 */
export function Cerca({ linguagem, codigo }: CercaProps) {
  const bloco = useMemo(
    () => renderizarBloco(linguagem, codigo),
    [linguagem, codigo],
  )

  if (bloco !== null) return <>{bloco}</>

  return (
    <pre className="bg-muted my-2 overflow-x-auto rounded-md p-3 font-mono text-xs">
      {codigo}
    </pre>
  )
}
