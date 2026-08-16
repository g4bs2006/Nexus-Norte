import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import 'mathlive'
import type { MathfieldElement } from 'mathlive'

export interface CampoMatematicoHandle {
  inserir: (latex: string) => void
  focar: () => void
}

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
   *
   * `emBloco` é `true` no `Ctrl+Enter`: insere em linha própria sem passar
   * pela caixa, que era a outra viagem de mão até o mouse.
   */
  onConfirmar?: (emBloco: boolean) => void
}

/**
 * Teclas que o MathLive não reconhece em teclado brasileiro.
 */
const ATALHOS_ABNT: Record<string, string> = {
  '/': '\\frac{#@}{#?}',
  '^': '^{#?}',
}

/**
 * Dicionário estendido de atalhos por palavra para o MathLive.
 *
 * Permite digitar o nome da letra grega ou operador (ex: `epsilon`, `alpha`, `theta`)
 * no teclado e converter instantaneamente na letra grega ou símbolo LaTeX correspondente.
 */
const ATALHOS_INLINE_GREGOS: Record<string, string> = {
  alpha: '\\alpha',
  beta: '\\beta',
  gamma: '\\gamma',
  delta: '\\delta',
  epsilon: '\\epsilon',
  ep: '\\epsilon',
  zeta: '\\zeta',
  eta: '\\eta',
  theta: '\\theta',
  iota: '\\iota',
  kappa: '\\kappa',
  lambda: '\\lambda',
  mu: '\\mu',
  nu: '\\nu',
  xi: '\\xi',
  pi: '\\pi',
  rho: '\\rho',
  sigma: '\\sigma',
  tau: '\\tau',
  phi: '\\phi',
  chi: '\\chi',
  psi: '\\psi',
  omega: '\\omega',
  Delta: '\\Delta',
  Gamma: '\\Gamma',
  Theta: '\\Theta',
  Lambda: '\\Lambda',
  Sigma: '\\Sigma',
  Phi: '\\Phi',
  Omega: '\\Omega',
  inf: '\\infty',
  oo: '\\infty',
  pd: '\\partial',
  lim: '\\lim_{#?}',
  sqrt: '\\sqrt{#?}',
  int: '\\int_{#?}^{#?}',
  sum: '\\sum_{#?}^{#?}',
  prod: '\\prod_{#?}^{#?}',
  neq: '\\neq',
  approx: '\\approx',
  leq: '\\le',
  geq: '\\ge',
}

/**
 * O `<math-field>` do MathLive, embrulhado para o React com suporte a ref imperativa.
 */
const CampoMatematico = forwardRef<CampoMatematicoHandle, CampoMatematicoProps>(
  function CampoMatematico({ valor, onChange, onConfirmar }, ref) {
    const campo = useRef<MathfieldElement>(null)

    useImperativeHandle(ref, () => ({
      inserir(latex: string) {
        if (campo.current) {
          campo.current.executeCommand(['insert', latex])
          campo.current.focus()
        }
      },
      focar() {
        campo.current?.focus()
      },
    }))

    /*
     * Foco e atalhos inline ao montar.
     */
    useEffect(() => {
      const elemento = campo.current
      if (!elemento) return
      elemento.focus()

      // Registra os atalhos de palavras para LaTeX no MathLive
      elemento.inlineShortcuts = {
        ...elemento.inlineShortcuts,
        ...ATALHOS_INLINE_GREGOS,
      }
    }, [])

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
          confirmar.current?.(evento.ctrlKey || evento.metaKey)
          return
        }

        if (evento.key === 'Tab' && !evento.shiftKey) {
          const val = elementoAtual.value.trimEnd()
          const matchText = val.match(/\\text\{([a-zA-Z]+)\}$/)
          const matchWord = val.match(/([a-zA-Z]+)$/)
          const palavra = matchText?.[1] ?? matchWord?.[1]

          if (palavra && ATALHOS_INLINE_GREGOS[palavra]) {
            evento.preventDefault()
            evento.stopPropagation()
            const latexSubstituto = ATALHOS_INLINE_GREGOS[palavra]
            for (let i = 0; i < palavra.length; i++) {
              elementoAtual.executeCommand('deleteBackward')
            }
            elementoAtual.executeCommand(['insert', latexSubstituto])
            return
          }
        }

        const latex = ATALHOS_ABNT[evento.key]
        if (latex === undefined) return
        evento.preventDefault()
        evento.stopPropagation()
        elementoAtual.executeCommand(['insert', latex])
      }

      function aoInserir(evento: InputEvent) {
        const elementoAtual = campo.current
        if (!elementoAtual) return

        const latex = ATALHOS_ABNT[evento.data ?? '']
        if (latex === undefined) return
        evento.preventDefault()
        evento.stopPropagation()
        elementoAtual.executeCommand(['insert', latex])
      }

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
  },
)

export default CampoMatematico

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
