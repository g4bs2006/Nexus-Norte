import { $prose } from '@milkdown/kit/utils'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'
import type { EditorState as EstadoEditor } from '@milkdown/kit/prose/state'
import type { EditorView as VisaoEditor } from '@milkdown/kit/prose/view'

const chave = new PluginKey('tab-nao-escapa')

/**
 * `Tab` não joga o foco para fora do editor.
 *
 * O comportamento padrão do navegador para `Tab` num `contenteditable` é ir
 * para o próximo elemento focável — na prática, um botão da página. Quem está
 * escrevendo aperta `Tab` esperando mexer no texto e descobre que saiu do
 * editor, com o próximo `Enter` acionando um botão que não se queria.
 *
 * Este plugin é o ÚLTIMO da cadeia a ver a tecla, então só age quando ninguém
 * mais quis:
 *
 * - dentro de lista, o `listItemKeymap` do `commonmark` já usa `Tab` para
 *   aninhar o item (e `Shift+Tab` para desaninhar);
 * - dentro de fórmula, `navegarBuracos` usa `Tab` para andar pelos `{}`;
 * - no menu do `/` e do `//`, `Tab` escolhe o item destacado.
 *
 * Sobra o parágrafo comum, e aí `Tab` não faz nada — mas nada É a resposta
 * certa enquanto Markdown for a fonte de verdade: recuo de parágrafo não
 * existe em Markdown, e escrever espaços no começo da linha teria efeito
 * colateral grave, porque quatro espaços viram BLOCO DE CÓDIGO ao reler.
 *
 * **Menos dentro do bloco de código**, onde recuo é o conteúdo, não a aparência:
 * ali `Tab` indenta e `Shift+Tab` desindenta, e é o único lugar do editor em que
 * `Shift+Tab` é consumido. Sem isto, escrever um `for` em Python obrigava a
 * digitar os espaços à mão — e o `Tab` do navegador ainda jogava o foco fora do
 * editor no meio da linha.
 *
 * Fora do bloco de código, `Shift+Tab` segue passando: é a saída de teclado para
 * quem precisa sair do editor sem mouse, que prender as duas direções tiraria.
 */

/** Dois espaços, não `\t`: é o que o Markdown salvo carrega sem ambiguidade. */
const RECUO = '  '

export const tabNaoEscapa = $prose(
  () =>
    new Plugin({
      key: chave,
      props: {
        handleKeyDown: (view, evento) => {
          if (evento.key !== 'Tab') return false

          const { state } = view
          const { $from, from, to, empty } = state.selection

          if ($from.parent.type.spec.code) {
            evento.preventDefault()

            if (evento.shiftKey) return desindentar(view)

            /*
             * Com trecho selecionado, `Tab` indenta as LINHAS dele em vez de
             * substituir a seleção por dois espaços — que é o que o
             * `insertText` faria, e apagaria o código selecionado.
             */
            if (!empty) return indentarBloco(view)

            view.dispatch(state.tr.insertText(RECUO, from, to))
            return true
          }

          /* Fora de código, só o `Tab` cru é segurado. */
          if (evento.shiftKey) return false
          evento.preventDefault()
          return true
        },
      },
    }),
)

/** Início e fim do texto do bloco de código onde a seleção está. */
function limitesDoCodigo(estado: EstadoEditor) {
  const { $from } = estado.selection
  const inicio = $from.start()
  return { inicio, texto: $from.parent.textContent }
}

/**
 * Acrescenta o recuo no começo de cada linha tocada pela seleção.
 *
 * A troca é feita numa transação só, do começo ao fim do trecho de linhas
 * inteiras: emitir um `insertText` por linha faria cada um deslocar as posições
 * calculadas para os seguintes.
 */
function indentarBloco(view: VisaoEditor): boolean {
  const { state } = view
  const { inicio, texto } = limitesDoCodigo(state)
  const { from, to } = state.selection

  const linhaInicial = texto.lastIndexOf('\n', from - inicio - 1) + 1
  const fimBruto = texto.indexOf('\n', to - inicio)
  const linhaFinal = fimBruto === -1 ? texto.length : fimBruto

  const trecho = texto.slice(linhaInicial, linhaFinal)
  const recuado = trecho
    .split('\n')
    .map((linha) => RECUO + linha)
    .join('\n')

  view.dispatch(
    state.tr.insertText(recuado, inicio + linhaInicial, inicio + linhaFinal),
  )
  return true
}

/**
 * Tira até um recuo do começo de cada linha tocada.
 *
 * "Até um": a linha sem recuo fica como está, em vez de comer caractere de
 * código. Tolera um espaço solto porque desindentar código alheio, colado com
 * recuo ímpar, não deveria travar.
 */
function desindentar(view: VisaoEditor): boolean {
  const { state } = view
  const { inicio, texto } = limitesDoCodigo(state)
  const { from, to } = state.selection

  const linhaInicial = texto.lastIndexOf('\n', from - inicio - 1) + 1
  const fimBruto = texto.indexOf('\n', to - inicio)
  const linhaFinal = fimBruto === -1 ? texto.length : fimBruto

  const trecho = texto.slice(linhaInicial, linhaFinal)
  const cortado = trecho
    .split('\n')
    .map((linha) => {
      if (linha.startsWith(RECUO)) return linha.slice(RECUO.length)
      if (linha.startsWith(' ')) return linha.slice(1)
      return linha
    })
    .join('\n')

  /* Nada a tirar: não gasta uma entrada no histórico por um `Shift+Tab` inócuo. */
  if (cortado === trecho) return true

  view.dispatch(
    state.tr.insertText(cortado, inicio + linhaInicial, inicio + linhaFinal),
  )
  return true
}
