import { useEffect, useRef } from 'react'
import type { Editor } from '@milkdown/kit/core'
import { BlockProvider } from '@milkdown/kit/plugin/block'

/**
 * Alça de arrasto para reordenar blocos.
 *
 * A afordância do AFFiNE que mais se paga aqui: nota de estudo é reorganizada o
 * tempo todo — o que virou resumo de prova nasceu como anotação solta de aula, e
 * hoje reordenar exige recortar e colar.
 *
 * **É operação segura em Markdown.** Arrastar um parágrafo, uma cerca ou uma
 * fórmula muda a ordem das linhas, não o formato — nada aqui ameaça a fonte de
 * verdade.
 *
 * O `BlockProvider` do Milkdown cuida do resto: detectar o bloco sob o mouse,
 * posicionar a alça com floating-ui e conduzir o arrasto. O que falta é o
 * elemento, e é isso que este hook fornece e destrói na hora certa.
 *
 * **A dependência do efeito é o editor em si**, e isso importa: `destroy()` do
 * provider remove do DOM o elemento da alça, que é do React. Recriar o provider
 * a cada render arrancaria e reparentaria esse nó a cada tecla digitada.
 */
export function useAlcaArrasto(editor: Editor | undefined) {
  const alca = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const elemento = alca.current
    if (!elemento || !editor) return

    let provider: BlockProvider | null = null

    editor.action((ctx) => {
      provider = new BlockProvider({ ctx, content: elemento })
      provider.update()
    })

    /*
     * `destroy` é obrigatório: o provider registra listeners no documento e
     * mantém uma instância de floating-ui viva. Sem isto, cada navegação entre
     * notas deixa um provider ativo — e a alça começa a piscar em blocos que
     * não existem mais.
     */
    return () => provider?.destroy()
    /*
     * Depende do EDITOR, não de uma função que o busca.
     *
     * Antes chegava aqui um `() => editorRef.current`, arrow nova a cada
     * render — e como há um render por tecla, o efeito rodava a cada tecla.
     * Cada rodada chamava `provider.destroy()`, que faz `element.remove()`
     * sobre o `div` da alça — um nó gerenciado pelo React —, e em seguida o
     * novo provider o reanexava em outro lugar do DOM.
     *
     * Arrancar e reparentar um nó do React por fora dele, uma vez por tecla, é
     * receita de `insertBefore` sobre nó solto e de travamento aparente.
     */
  }, [editor])

  return alca
}
