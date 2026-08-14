import { useEffect, useRef } from 'react'
import 'mathlive'
import type { MathfieldElement } from 'mathlive'

interface CampoMatematicoProps {
  valor: string
  onChange: (latex: string) => void
}

/**
 * O `<math-field>` do MathLive, embrulhado para o React.
 *
 * MathLive é um Web Component, não um componente React: registra o elemento
 * customizado ao ser importado, e é por isso que o `import 'mathlive'` acima
 * não tem binding. O React 19 já repassa props desconhecidas para elementos
 * customizados, mas o valor entra por propriedade e não por atributo — daí a
 * ref em vez de JSX.
 *
 * Carregado por `lazy` a partir de `DialogFormula`: é pesado e só serve a quem
 * está escrevendo uma fórmula, que é uma fração das vezes em que se abre a nota.
 */
export default function CampoMatematico({
  valor,
  onChange,
}: CampoMatematicoProps) {
  const campo = useRef<MathfieldElement>(null)

  useEffect(() => {
    const elemento = campo.current
    if (!elemento) return

    // Só sobrescreve quando o valor de fora diverge: escrever de volta o que o
    // próprio campo acabou de emitir moveria o cursor a cada tecla.
    if (elemento.value !== valor) elemento.value = valor

    function aoDigitar() {
      if (elemento) onChange(elemento.value)
    }

    elemento.addEventListener('input', aoDigitar)
    return () => elemento.removeEventListener('input', aoDigitar)
  }, [valor, onChange])

  return (
    <math-field
      ref={campo}
      className="border-input w-full rounded-md border p-2 text-base"
    />
  )
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'math-field': React.DetailedHTMLProps<
        React.HTMLAttributes<MathfieldElement>,
        MathfieldElement
      >
    }
  }
}
