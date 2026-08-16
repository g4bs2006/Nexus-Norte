import { useEffect, useRef } from 'react'
import 'mathlive'
import type { MathfieldElement } from 'mathlive'

interface CampoMatematicoProps {
  valor: string
  onChange: (latex: string) => void
  /**
   * `Enter` confirma, como em qualquer campo de uma linha só.
   *
   * Sem isto o diálogo exigia mouse: não havia foco automático nem tecla que
   * inserisse, então escrever a fórmula no teclado terminava com a mão indo
   * até o botão. `Shift+Enter` fica livre para o que o MathLive quiser fazer
   * com ele — é a saída para quem estiver montando uma matriz.
   */
  onConfirmar?: () => void
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
  onConfirmar,
}: CampoMatematicoProps) {
  const campo = useRef<MathfieldElement>(null)

  /*
   * Foco ao montar, e não `autoFocus`: o diálogo só monta este componente ao
   * abrir (e por `lazy`), então o foco do Radix já passou quando chegamos
   * aqui — pedir o foco depois é o que garante o cursor no campo.
   */
  useEffect(() => {
    campo.current?.focus()
  }, [])

  /*
   * Por ref: o callback muda a cada render do diálogo, e entrar na dependência
   * do efeito re-registraria o listener sem necessidade.
   */
  const confirmar = useRef(onConfirmar)
  confirmar.current = onConfirmar

  useEffect(() => {
    const elemento = campo.current
    if (!elemento) return

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key !== 'Enter' || evento.shiftKey) return
      evento.preventDefault()
      evento.stopPropagation()
      confirmar.current?.()
    }

    /*
     * Fase de CAPTURA. O MathLive trata o teclado dentro do próprio shadow
     * DOM, e um listener de bolha aqui correria depois dele — ou nem correria,
     * se ele parasse a propagação. Na captura o evento passa por este
     * elemento antes de descer, então o `Enter` é nosso primeiro.
     */
    elemento.addEventListener('keydown', aoTeclar, true)
    return () => elemento.removeEventListener('keydown', aoTeclar, true)
  }, [])

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
