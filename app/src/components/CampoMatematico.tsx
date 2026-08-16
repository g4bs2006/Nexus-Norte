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
 * Teclas que o MathLive não reconhece em teclado brasileiro.
 *
 * Ele TEM os dois atalhos embutidos — `/` vira fração e `^` vira expoente —,
 * mas casa a tecla pelo `code` (a POSIÇÃO física) contra um mapa de layout, e
 * os layouts que ele traz são só Dvorak, inglês, francês, alemão e espanhol.
 * Não há ABNT2. No teclado brasileiro a `/` sai da tecla `IntlRo`, que não
 * existe no mapa americano, e o `^` é tecla morta de acento — nenhum dos dois
 * chega ao atalho, e por isso os dois entravam como caractere solto.
 *
 * A chave aqui é `event.key`, que é o CARACTERE digitado e não depende de
 * onde ele mora no teclado. Em layout que o MathLive já entende o resultado é
 * o mesmo LaTeX, então isto não atrapalha quem não é brasileiro.
 *
 * `#@` é "o que já está antes do cursor" e `#?` é um espaço a preencher — é a
 * mesma notação que o próprio MathLive usa nos atalhos que traz de fábrica.
 */
const ATALHOS: Record<string, string> = {
  '/': '\\frac{#@}{#?}',
  '^': '^{#?}',
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
      const elementoAtual = campo.current
      if (!elementoAtual) return

      if (evento.key === 'Enter' && !evento.shiftKey) {
        evento.preventDefault()
        evento.stopPropagation()
        confirmar.current?.()
        return
      }

      const latex = ATALHOS[evento.key]
      if (latex === undefined) return
      evento.preventDefault()
      evento.stopPropagation()
      elementoAtual.executeCommand(['insert', latex])
    }

    /*
     * O caminho da TECLA MORTA, que o `keydown` não alcança.
     *
     * No ABNT2 o `^` é acento: a primeira pressão chega como `key: 'Dead'` e
     * nenhum caractere existe ainda, então a regra acima não tem o que casar.
     * O caractere só aparece quando a composição se resolve — e aí ele vem
     * como `data` de um `beforeinput`, que é onde este segundo ouvinte pega.
     *
     * Não há risco de agir duas vezes: quando o `keydown` casa, ele já chama
     * `preventDefault`, e sem inserção não há `beforeinput` depois.
     */
    function aoInserir(evento: InputEvent) {
      const elementoAtual = campo.current
      if (!elementoAtual) return

      const latex = ATALHOS[evento.data ?? '']
      if (latex === undefined) return
      evento.preventDefault()
      evento.stopPropagation()
      elementoAtual.executeCommand(['insert', latex])
    }

    /*
     * Fase de CAPTURA nos dois. O MathLive trata o teclado dentro do próprio
     * shadow DOM, e um ouvinte de bolha aqui correria depois dele — ou nem
     * correria, se ele parasse a propagação. Na captura o evento passa por
     * este elemento antes de descer, então somos os primeiros.
     */
    elemento.addEventListener('keydown', aoTeclar, true)
    elemento.addEventListener('beforeinput', aoInserir as EventListener, true)
    return () => {
      elemento.removeEventListener('keydown', aoTeclar, true)
      elemento.removeEventListener(
        'beforeinput',
        aoInserir as EventListener,
        true,
      )
    }
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
