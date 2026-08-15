import { $prose } from '@milkdown/kit/utils'
import { Plugin, PluginKey, TextSelection } from '@milkdown/kit/prose/state'
import { Decoration, DecorationSet } from '@milkdown/kit/prose/view'
import type { EditorState } from '@milkdown/kit/prose/state'
import type { EditorView } from '@milkdown/kit/prose/view'

/** Envia o arquivo e devolve a URL pública. Injetado: o kernel não sabe subir. */
export type EnviarImagem = (arquivo: File) => Promise<string>

const chave = new PluginKey<DecorationSet>('imagens-nota')

/** Identidade de um upload em curso. Objeto vazio serve: só a referência importa. */
type Bilhete = Record<string, never>

interface Acao {
  adicionar?: { id: Bilhete; posicao: number }
  remover?: { id: Bilhete }
}

/**
 * Colar e arrastar imagem no editor.
 *
 * `Ctrl+V` é o gesto que importa: o caso real é print de slide e foto do
 * quadro, e ambos chegam pela área de transferência. Obrigar a salvar em
 * arquivo antes seriam três passos para o que deveria ser um.
 *
 * ## Por que isto é seguro, ao contrário dos blocos arquivados
 *
 * `<img>` não é engine imperativa: dá-se um `src` e o browser desenha. Não há
 * node view com React, nem ciclo de vida manual, nem biblioteca disputando o
 * DOM com o ProseMirror. É exatamente a diferença entre o que funciona e o que
 * precisou ser arquivado.
 *
 * O nó `image` vem do preset commonmark e serializa para `![](url)` — Markdown
 * padrão, que a exportação leva sem tradução.
 *
 * ## O marcador é uma DECORAÇÃO, e isso não é detalhe
 *
 * Upload demora, e quem colou continua escrevendo. Um marcador de texto com
 * posição guardada apontaria para o lugar errado assim que uma letra fosse
 * digitada antes dele — e a imagem substituiria o texto de outra pessoa.
 *
 * Decoração é o mecanismo que o ProseMirror tem para isto: ela é remapeada por
 * `tr.mapping` a cada transação, então acompanha o documento sozinha. Ao fim do
 * upload se pergunta onde ela FOI PARAR, e é ali que a imagem entra.
 */
export function criarPluginImagens(enviar: EnviarImagem) {
  /** Onde o marcador daquele upload está agora, ou `null` se sumiu. */
  function ondeEsta(estado: EditorState, id: Bilhete): number | null {
    const conjunto = chave.getState(estado)
    const achados = conjunto?.find(
      undefined,
      undefined,
      (spec) => spec.id === id,
    )
    return achados && achados.length > 0 ? (achados[0] as Decoration).from : null
  }

  function inserir(view: EditorView, arquivo: File) {
    const tipoImagem = view.state.schema.nodes.image
    if (!tipoImagem) return

    const id: Bilhete = {}
    const transacao = view.state.tr
    if (!transacao.selection.empty) transacao.deleteSelection()

    const acao: Acao = {
      adicionar: { id, posicao: transacao.selection.from },
    }
    view.dispatch(transacao.setMeta(chave, acao))

    void enviar(arquivo)
      .then((url) => {
        const posicao = ondeEsta(view.state, id)
        // Sumiu: desfizeram ou apagaram o trecho enquanto subia. Nada a fazer.
        if (posicao === null) return

        view.dispatch(
          view.state.tr
            .replaceWith(
              posicao,
              posicao,
              tipoImagem.create({ src: url, alt: arquivo.name }),
            )
            .setMeta(chave, { remover: { id } } satisfies Acao),
        )
      })
      .catch(() => {
        view.dispatch(
          view.state.tr.setMeta(chave, { remover: { id } } satisfies Acao),
        )
      })
  }

  /** Só imagem. Arrastar um PDF para a nota não deve virar `![](…)`. */
  function imagensDe(lista: FileList | null | undefined): File[] {
    return [...(lista ?? [])].filter((arquivo) =>
      arquivo.type.startsWith('image/'),
    )
  }

  return $prose(
    () =>
      new Plugin<DecorationSet>({
        key: chave,

        state: {
          init: () => DecorationSet.empty,
          apply: (transacao, conjunto) => {
            // Remapeia com o documento: é isto que faz o marcador acompanhar o
            // texto digitado enquanto o upload acontece.
            let atual = conjunto.map(transacao.mapping, transacao.doc)
            const acao = transacao.getMeta(chave) as Acao | undefined

            if (acao?.adicionar) {
              const marcador = document.createElement('span')
              marcador.className = 'imagem-enviando'
              atual = atual.add(transacao.doc, [
                Decoration.widget(acao.adicionar.posicao, marcador, {
                  id: acao.adicionar.id,
                }),
              ])
            }

            if (acao?.remover) {
              const alvo = acao.remover.id
              atual = atual.remove(
                atual.find(undefined, undefined, (spec) => spec.id === alvo),
              )
            }

            return atual
          },
        },

        props: {
          decorations: (estado) => chave.getState(estado),

          handlePaste: (view, evento) => {
            const imagens = imagensDe(evento.clipboardData?.files)
            /*
             * Só assume o evento quando há imagem. Devolver `true` sempre
             * roubaria o colar de texto, que é o uso muito mais comum.
             */
            if (imagens.length === 0) return false

            evento.preventDefault()
            imagens.forEach((arquivo) => inserir(view, arquivo))
            return true
          },

          handleDrop: (view, evento) => {
            const imagens = imagensDe(evento.dataTransfer?.files)
            if (imagens.length === 0) return false

            evento.preventDefault()

            /*
             * Solta onde o mouse está, e não onde o cursor estava: arrastar tem
             * alvo visível, e ignorá-lo seria contraintuitivo.
             */
            const alvo = view.posAtCoords({
              left: evento.clientX,
              top: evento.clientY,
            })
            if (alvo) {
              view.dispatch(
                view.state.tr.setSelection(
                  TextSelection.near(view.state.doc.resolve(alvo.pos)),
                ),
              )
            }

            imagens.forEach((arquivo) => inserir(view, arquivo))
            return true
          },
        },
      }),
  )
}
