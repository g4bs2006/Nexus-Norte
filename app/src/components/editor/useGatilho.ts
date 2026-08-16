import { useCallback, useMemo, useRef, useState } from 'react'
import type { Editor } from '@milkdown/kit/core'
import { editorViewCtx } from '@milkdown/kit/core'
import { TextSelection } from '@milkdown/kit/prose/state'
import {
  aplicarComando,
  converteOBloco,
  type ComandoEscrita,
} from './comandos'
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
  montar: (item: ItemMenu, emMatematica: boolean) => ResultadoEscolha
}

/**
 * O que acontece ao escolher um item.
 *
 * `acao` existe porque nem todo item vira texto: "Desenho" abre o Excalidraw e
 * "Fórmula" abre o MathLive. Quem fornece a fonte cuida do efeito; o editor só
 * apaga o gatilho digitado e sai da frente.
 */
export type ResultadoEscolha =
  | { tipo: 'inserir'; texto: string; buracos: number[] }
  /**
   * Vira um nó de fórmula, já renderizado.
   *
   * Existe porque texto cru NÃO renderiza: as input rules do `plugin-math` só
   * disparam em digitação real, e `insertText` não é digitação. Inserir o nó é
   * o que faz `//int` mostrar a integral desenhada na hora — que é o ponto.
   */
  | { tipo: 'formula'; latex: string; buracos: number[] }
  /**
   * Executa um comando de escrita — título, lista, cerca, divisor.
   *
   * É o que conserta o `/`: antes ele inseria a cerca como TEXTO, e texto cru
   * nunca vira `code_block`. O gráfico não aparecia porque o bloco nunca
   * chegava a ser bloco.
   */
  | { tipo: 'comando'; comando: ComandoEscrita; corpo?: string }
  | { tipo: 'acao' }

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
  opcoes: { apenasInicioDeLinha?: boolean } = {},
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
        const resultado = fonteRef.current.montar(item, posicao.emMatematica)

        // Ação: o gatilho digitado sai, e o efeito é de quem forneceu a fonte.
        if (resultado.tipo === 'acao') {
          view.dispatch(view.state.tr.delete(posicao.de, posicao.ate))
          view.focus()
          return
        }

        if (resultado.tipo === 'comando') {
          /*
           * O gatilho digitado sai ANTES do comando: comandos como "virar
           * título" agem sobre o bloco inteiro, e deixar `/tit` no texto o
           * transformaria em parte do título.
           */
          const transacao = view.state.tr.delete(posicao.de, posicao.ate)

          /*
           * Havendo texto antes do gatilho, o bloco é PARTIDO ali.
           *
           * `setBlockType` e os `wrapIn…` convertem o bloco inteiro, sem olhar
           * onde o cursor está dentro dele — então "revisão de cálculo
           * /titulo1" virava um título com a frase toda dentro. O `/` é um
           * comando sobre o que vem A SEGUIR: o que já estava escrito continua
           * sendo o parágrafo de cima, e o comando cai no bloco novo, vazio.
           */
          const $inicio = transacao.doc.resolve(posicao.de)
          if (
            converteOBloco(resultado.comando) &&
            $inicio.parentOffset > 0
          ) {
            transacao.split(posicao.de)
            // +1 entra no bloco recém-criado, que é onde o comando deve cair.
            transacao.setSelection(
              TextSelection.create(transacao.doc, posicao.de + 1),
            )
          }

          view.dispatch(transacao)
          aplicarComando(resultado.comando)(ctx)

          /*
           * O corpo de exemplo entra depois de o bloco existir. A cerca nasce
           * vazia, e uma cerca vazia obriga a lembrar a sintaxe de cabeça —
           * que é justamente o que o menu veio evitar.
           */
          if (resultado.corpo) {
            const depois = ctx.get(editorViewCtx)
            const { $from } = depois.state.selection
            depois.dispatch(
              depois.state.tr.insertText(resultado.corpo, $from.pos),
            )
          }
          view.focus()
          return
        }

        if (resultado.tipo === 'formula') {
          const tipoNo = view.state.schema.nodes.math_inline
          if (!tipoNo) return

          const no = tipoNo.create(
            null,
            resultado.latex === ''
              ? undefined
              : view.state.schema.text(resultado.latex),
          )
          const transacao = view.state.tr.replaceWith(
            posicao.de,
            posicao.ate,
            no,
          )

          /*
           * O cursor entra DENTRO da fórmula, no primeiro buraco.
           *
           * Antes isto selecionava o nó, e nesse estado a próxima tecla o
           * substituía — parecia que apagava. Como o nó deixou de ser atom, o
           * miolo é texto comum e o cursor pode morar nele: continua-se
           * escrevendo, com `//` e `Tab` valendo lá dentro, e `Enter` sai.
           *
           * `+1` entra no conteúdo do nó; o buraco é medido no LaTeX.
           */
          const dentro = posicao.de + 1 + (resultado.buracos[0] ?? resultado.latex.length)
          transacao.setSelection(
            TextSelection.create(transacao.doc, dentro),
          )
          view.dispatch(transacao)
          /*
           * Sem `view.focus()` aqui: o editor já tem o foco (foi dele que veio
           * a digitação), e chamá-lo depois do dispatch era o que atropelava a
           * seleção recém-posta.
           */
          return
        }

        const { texto, buracos } = resultado
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
      apenasInicioDeLinha: opcoes.apenasInicioDeLinha,
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
