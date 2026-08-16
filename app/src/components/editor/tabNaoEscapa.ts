import { $prose } from '@milkdown/kit/utils'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'

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
 * `Shift+Tab` segue passando quando ninguém o trata: é a saída de teclado para
 * quem precisa sair do editor sem mouse, que prender as duas direções tiraria.
 */
export const tabNaoEscapa = $prose(
  () =>
    new Plugin({
      key: chave,
      props: {
        handleKeyDown: (_view, evento) => {
          if (evento.key !== 'Tab' || evento.shiftKey) return false
          evento.preventDefault()
          return true
        },
      },
    }),
)
