import { $prose } from '@milkdown/kit/utils'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'

/** Onde a barra aparece, em coordenadas de viewport. */
export interface AncoraSelecao {
  esquerda: number
  topo: number
}

const chave = new PluginKey('barra-selecao')

/**
 * Avisa quando há texto selecionado, e onde ele está.
 *
 * É o segundo gesto do Notion, e o que o `/` não resolve: `/` **insere** o que
 * vem a seguir; a barra **formata** o que já está escrito. Negrito não é algo
 * que se insere, é algo que se aplica — por isso ele nunca esteve na lista do
 * `/`, nem lá nem aqui.
 *
 * O plugin só mede e reporta; quem desenha é React. Separar assim é o que
 * permite a barra usar os mesmos botões do resto do app.
 */
export function criarBarraSelecao(
  aoMudar: (ancora: AncoraSelecao | null) => void,
) {
  return $prose(
    () =>
      new Plugin({
        key: chave,
        view: () => ({
          update: (view) => {
            const { selection } = view.state

            /*
             * Sem barra quando não há o que formatar: seleção vazia, ou dentro
             * de código, onde marca de Markdown não vale — `**` dentro de uma
             * cerca é literal, e oferecer negrito ali seria mentira.
             */
            if (selection.empty || selection.$from.parent.type.spec.code) {
              aoMudar(null)
              return
            }

            // Sem foco no editor a seleção fica cinza e a barra seria ruído.
            if (!view.hasFocus()) {
              aoMudar(null)
              return
            }

            const inicio = view.coordsAtPos(selection.from)
            const fim = view.coordsAtPos(selection.to)

            aoMudar({
              // Centraliza sobre a seleção, e não sobre o começo dela.
              esquerda: (inicio.left + fim.right) / 2,
              topo: Math.min(inicio.top, fim.top),
            })
          },
          destroy: () => aoMudar(null),
        }),
      }),
  )
}
