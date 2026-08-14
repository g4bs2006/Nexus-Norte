import { useCallback, useMemo, useRef, useState } from 'react'
import type { Editor } from '@milkdown/kit/core'
import { editorViewCtx } from '@milkdown/kit/core'
import { TextSelection } from '@milkdown/kit/prose/state'
import { criarGatilhoMenu, type EstadoGatilho } from './gatilhoMenu'
import type { ItemMenu } from './MenuSimbolos'

/** O que quem usa o gatilho precisa fornecer. */
export interface FonteItens {
  /** Filtra pelo que foi digitado depois do gatilho. */
  filtrar: (termo: string) => ItemMenu[]
  /**
   * O texto a inserir e onde o cursor pode parar.
   *
   * `buracos` são deslocamentos dentro de `texto`. Se vier mais de um, `Tab`
   * anda por eles — é o que separa o atalho de útil a enfeite: sem isso se
   * insere `\int_{}^{}` e ainda é preciso clicar em cada chave.
   */
  montar: (
    item: ItemMenu,
    emMatematica: boolean,
  ) => { texto: string; buracos: number[] }
}

/**
 * Liga o gatilho digitado ao editor: detecção, teclado, lista e inserção.
 *
 * Devolve o plugin (que entra na configuração do Milkdown) e o que a lista
 * precisa para se desenhar. O React nunca toca no ProseMirror direto — quem
 * mexe no documento é a função `escolher` daqui, com uma transação só.
 */
export function useGatilho(
  gatilho: string,
  fonte: FonteItens,
  obterEditor: () => Editor | undefined,
) {
  const [estado, setEstado] = useState<EstadoGatilho | null>(null)
  const [indice, setIndice] = useState(0)

  /*
   * `fonte` costuma chegar como literal, então mudaria de identidade a cada
   * render. Guardada em ref, ela sai das dependências e nada aqui remonta por
   * causa disso.
   */
  const fonteRef = useRef(fonte)
  fonteRef.current = fonte

  const itens = useMemo(
    () => (estado ? fonteRef.current.filtrar(estado.termo) : []),
    [estado],
  )

  /*
   * O teclado é lido dentro do ProseMirror, que corre fora do ciclo do React.
   * Ler `itens` e `indice` de lá pegaria valores de um render atrás, então as
   * refs carregam o valor atual.
   */
  const itensRef = useRef<ItemMenu[]>([])
  const indiceRef = useRef(0)
  const estadoRef = useRef<EstadoGatilho | null>(null)
  itensRef.current = itens
  indiceRef.current = indice
  estadoRef.current = estado

  const escolher = useCallback(
    (item: ItemMenu) => {
      const posicao = estadoRef.current
      const editor = obterEditor()
      if (!posicao || !editor) return

      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx)
        const { texto, buracos } = fonteRef.current.montar(
          item,
          posicao.emMatematica,
        )

        const transacao = view.state.tr.insertText(texto, posicao.de, posicao.ate)
        /*
         * O cursor vai para o primeiro buraco, ou para o fim quando não há —
         * `\pi` não tem onde continuar, e parar no meio dele seria pior que
         * parar depois.
         */
        const destino = posicao.de + (buracos[0] ?? texto.length)
        transacao.setSelection(
          TextSelection.create(transacao.doc, destino),
        )
        view.dispatch(transacao)
        view.focus()
      })

      setEstado(null)
      setIndice(0)
    },
    [obterEditor],
  )

  const aoTeclar = useCallback(
    (tecla: string): boolean => {
      const lista = itensRef.current
      if (lista.length === 0) return false

      if (tecla === 'Escape') {
        setEstado(null)
        return true
      }
      if (tecla === 'ArrowDown') {
        setIndice((atual) => (atual + 1) % lista.length)
        return true
      }
      if (tecla === 'ArrowUp') {
        setIndice((atual) => (atual - 1 + lista.length) % lista.length)
        return true
      }
      if (tecla === 'Enter' || tecla === 'Tab') {
        const item = lista[indiceRef.current]
        if (item) escolher(item)
        return true
      }
      return false
    },
    [escolher],
  )

  /* Declarada ANTES do plugin: o plugin a lê, e ler antes de existir quebraria. */
  const aoTeclarRef = useRef(aoTeclar)
  aoTeclarRef.current = aoTeclar

  /*
   * O plugin é criado UMA vez. Recriá-lo mudaria a configuração do editor, e o
   * Milkdown responde a isso remontando tudo — cursor no começo, undo perdido.
   * Por isso ele fala com o React só através de refs.
   */
  const plugin = useRef(
    criarGatilhoMenu({
      gatilho,
      aoMudar: (novo) => {
        setEstado(novo)
        setIndice(0)
      },
      aoTeclar: (tecla) => aoTeclarRef.current(tecla),
    }),
  )

  return {
    plugin: plugin.current,
    estado,
    itens,
    indice,
    escolher,
  }
}
