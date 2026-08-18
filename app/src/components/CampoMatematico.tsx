import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import 'mathlive'
import type { MathfieldElement } from 'mathlive'
import { simboloPorPalavra } from './editor/catalogoSimbolos'

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
 *
 * Ele TEM os dois atalhos embutidos — `/` vira fração e `^` vira expoente —,
 * mas casa a tecla pelo `code` (a POSIÇÃO física) contra um mapa de layout, e
 * os layouts que ele traz são só Dvorak, inglês, francês, alemão e espanhol.
 * Não há ABNT2. No teclado brasileiro a `/` sai da tecla `IntlRo`, que não
 * existe no mapa americano, e o `^` é tecla morta de acento — nenhum dos dois
 * chega ao atalho, e por isso os dois entravam como caractere solto.
 *
 * A chave aqui é `event.key`, que é o CARACTERE digitado e não depende de onde
 * ele mora no teclado. Em layout que o MathLive já entende o resultado é o
 * mesmo LaTeX, então isto não atrapalha quem não é brasileiro.
 *
 * `#@` é "o que já está antes do cursor" e `#?` é um espaço a preencher — é a
 * mesma notação que o próprio MathLive usa nos atalhos que traz de fábrica.
 *
 * (Este comentário foi apagado por engano num refactor e restaurado depois: sem
 * ele, o mapa parece redundante com o que a biblioteca já faz, e o caminho
 * óbvio é "limpar" justamente o que faz o teclado brasileiro funcionar.)
 */
const ATALHOS_ABNT: Record<string, string> = {
  '/': '\\frac{#@}{#?}',
  '^': '^{#?}',
}

/** Quanto texto olhar para trás ao procurar a palavra sob o cursor. */
const JANELA_PALAVRA = 24

/**
 * Traduz os buracos do catálogo para os do MathLive.
 *
 * O catálogo escreve `{}` porque é a notação do LaTeX e é o que o editor de
 * texto usa para posicionar o `Tab` (ver `montarInsercao`). O MathLive marca
 * espaço a preencher com `#?`, e sem a tradução `\int_{}^{}` entra com dois
 * grupos vazios que o cursor não visita — o símbolo aparece e a conta continua
 * a ser digitada na mão.
 */
function paraMathlive(latex: string): string {
  return latex.replace(/\{\}/g, '{#?}')
}

/**
 * O `<math-field>` do MathLive, embrulhado para o React com suporte a ref imperativa.
 */
const CampoMatematico = forwardRef<CampoMatematicoHandle, CampoMatematicoProps>(
  function CampoMatematico({ valor, onChange, onConfirmar }, ref) {
    const campo = useRef<MathfieldElement>(null)

    useImperativeHandle(ref, () => ({
      /*
       * Traduz aqui, e não em quem chama: a barra de botões do diálogo passa o
       * LaTeX do catálogo, que escreve buraco como `{}`. Sem a tradução o botão
       * `√` inseriria `\sqrt{}` — desenhado certo, mas com o cursor fora do
       * radicando, então o próximo caractere sai ao lado da raiz e não dentro.
       */
      inserir(latex: string) {
        if (campo.current) {
          campo.current.executeCommand(['insert', paraMathlive(latex)])
          campo.current.focus()
        }
      },
      focar() {
        campo.current?.focus()
      },
    }))

    useEffect(() => {
      const elemento = campo.current
      if (!elemento) return
      elemento.focus()

      /*
       * Os atalhos nativos do MathLive ficam desligados de propósito.
       *
       * Eles convertem SOZINHOS enquanto se digita: escrever `beta` já vira β
       * sem que se peça, e quem queria as quatro letras não tem como recusar. A
       * conversão passa a ser um ato — digita-se a palavra e aperta-se `Tab` —,
       * que é o que a linha de dicas do diálogo promete e o que dá controle a
       * quem escreve.
       *
       * O `Tab` é implementado em `aoTeclar`, lendo o conteúdo do campo.
       */
      elemento.inlineShortcuts = {}
    }, [])

    const confirmar = useRef(onConfirmar)
    confirmar.current = onConfirmar

    useEffect(() => {
      const elemento = campo.current
      if (!elemento) return

      function aoTeclar(evento: KeyboardEvent) {
        const elementoAtual = campo.current
        if (!elementoAtual) return

        /*
         * `Tab` converte a palavra sob o cursor no símbolo que ela nomeia.
         *
         * A palavra é lida do CAMPO (`position` + `getValue`), e não de um
         * registro paralelo das teclas digitadas — ver `simboloPorPalavra`,
         * que documenta os três jeitos pelos quais o registro paralelo
         * dessincronizava.
         *
         * Não havendo palavra convertível, o `Tab` segue seu caminho: dentro de
         * uma fórmula com buracos ele anda entre eles, que é comportamento do
         * próprio MathLive e não cabe a este componente sequestrar.
         */
        if (evento.key === 'Tab' && !evento.shiftKey) {
          const cursor = elementoAtual.position
          const inicio = Math.max(0, cursor - JANELA_PALAVRA)
          const antes = elementoAtual.getValue(inicio, cursor, 'latex')
          const simbolo = simboloPorPalavra(antes)

          if (simbolo) {
            evento.preventDefault()
            evento.stopPropagation()

            /*
             * Seleciona a palavra e deixa o `insert` substituí-la — o modo
             * padrão do MathLive é `replaceSelection`. Um laço de
             * `deleteBackward` por caractere, que era o que havia antes,
             * pressupõe um átomo por letra: depois de um `\frac` o cursor está
             * dentro de um grupo, e a conta erra.
             */
            elementoAtual.selection = {
              ranges: [[cursor - simbolo.gatilho.length, cursor]],
            }
            elementoAtual.executeCommand(['insert', paraMathlive(simbolo.latex)])
            return
          }
        }

        if (evento.key === 'Enter' && !evento.shiftKey) {
          evento.preventDefault()
          evento.stopPropagation()
          confirmar.current?.(evento.ctrlKey || evento.metaKey)
          return
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
