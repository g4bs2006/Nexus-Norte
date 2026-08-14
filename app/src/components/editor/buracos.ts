import { $prose } from '@milkdown/kit/utils'
import { Plugin, PluginKey, TextSelection } from '@milkdown/kit/prose/state'

const chave = new PluginKey('buracos-latex')

/**
 * `Tab` anda pelos buracos `{}` da fórmula recém-inserida.
 *
 * É o que separa o gatilho `//` de útil a enfeite. Sem isto, `//int` insere
 * `\int_{}^{}` e ainda é preciso clicar em cada chave — o que devolve a mão ao
 * mouse e anula a razão de o atalho existir.
 *
 * ## Por que procura o buraco no texto, e não guarda uma lista
 *
 * Guardar as posições exigiria mapeá-las por toda transação subsequente: cada
 * caractere digitado desloca tudo à frente. O ProseMirror tem `mapping` para
 * isso, mas o resultado seria estado a sincronizar por um ganho nenhum —
 * procurar o próximo `{}` a partir do cursor dá a mesma resposta e não guarda
 * nada que possa dessincronizar.
 *
 * Também é mais honesto com o que o usuário vê: se ele apagou um `{}`, ele
 * some da navegação, porque a navegação lê o documento.
 */
export const navegarBuracos = $prose(
  () =>
    new Plugin({
      key: chave,
      props: {
        handleKeyDown: (view, evento) => {
          if (evento.key !== 'Tab') return false

          const { selection, doc } = view.state
          if (!selection.empty) return false

          const bloco = selection.$from.parent
          if (!bloco.isTextblock) return false

          const inicio = selection.$from.start()
          const texto = bloco.textContent
          const cursorNoBloco = selection.from - inicio

          /*
           * Procura só DEPOIS do cursor. `Tab` avança; voltar seria
           * `Shift+Tab`, e ninguém pediu — enquanto não pedirem, o
           * comportamento previsível vale mais que o completo.
           */
          const proximo = texto.indexOf('{}', cursorNoBloco)
          if (proximo === -1) return false

          evento.preventDefault()
          view.dispatch(
            view.state.tr.setSelection(
              // +1 põe o cursor ENTRE as chaves, que é onde se digita.
              TextSelection.create(doc, inicio + proximo + 1),
            ),
          )
          return true
        },
      },
    }),
)
