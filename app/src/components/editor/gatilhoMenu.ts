import { $prose } from '@milkdown/kit/utils'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'
import type { EditorView } from '@milkdown/kit/prose/view'

/** Onde desenhar o menu, em coordenadas de viewport. */
export interface Ancora {
  esquerda: number
  topo: number
  base: number
}

export interface EstadoGatilho {
  /** O que foi digitado depois do gatilho. */
  termo: string
  /** Posição do início do gatilho no documento — onde a substituição começa. */
  de: number
  /** Posição do cursor. */
  ate: number
  ancora: Ancora
  /** O cursor está dentro de uma fórmula? Decide se o LaTeX sai cru. */
  emMatematica: boolean
}

interface Opcoes {
  /** `//` para símbolo, `/` para bloco. */
  gatilho: string
  /**
   * Só dispara no começo da linha.
   *
   * Vale para o `/` de bloco: um diagrama não entra no meio de uma frase, e
   * exigir a linha vazia evita que escrever "e/ou" abra o menu.
   */
  apenasInicioDeLinha?: boolean
  /**
   * Gatilho mais específico que tem precedência sobre este.
   *
   * `/` e `//` casam no mesmo ponto do texto: digitar `//` satisfaz os dois
   * padrões, e sem isto os dois menus abrem juntos. O mais LONGO vence, porque
   * é o mais específico — quem digitou a segunda barra pediu o de símbolos.
   */
  excluir?: string
  /** Chamado a cada mudança: estado ou `null` quando o menu deve fechar. */
  aoMudar: (estado: EstadoGatilho | null) => void
  /**
   * Devolve `true` se a tecla foi consumida pelo menu.
   *
   * Quem decide é o React, que é dono da lista e do índice selecionado. O
   * plugin só garante que a tecla chegue lá ANTES do editor — sem isso, seta
   * para baixo moveria o cursor em vez de andar na lista.
   */
  aoTeclar: (tecla: string) => boolean
}

/**
 * Menu por gatilho digitado, sem sair do teclado.
 *
 * A exigência que molda tudo aqui: **não pode ser um diálogo**. Um modal tira a
 * mão do lugar e os olhos da frase, e transforma "escrever uma integral" em
 * "executar um comando". A lista aparece junto do cursor, filtra conforme se
 * digita, e `Enter` continua a frase.
 *
 * Foi escrito em cima do ProseMirror direto, e não do `SlashProvider` do
 * Milkdown, para o posicionamento e o teclado ficarem sob controle daqui —
 * `coordsAtPos` já dá a posição exata do cursor, e o resto seria uma camada de
 * floating-ui para o mesmo resultado.
 */
export function criarGatilhoMenu(opcoes: Opcoes) {
  const chave = new PluginKey(`gatilho-${opcoes.gatilho}`)

  /*
   * Por instância, nunca no módulo: `//` e `/` são dois menus, e um `aberto`
   * compartilhado faria um consumir as teclas do outro.
   *
   * Fora do estado do plugin porque `handleKeyDown` corre ANTES de `update` no
   * mesmo evento — ler de lá daria o valor de um passo atrás.
   */
  let aberto = false
  /** O último estado reportado, para não avisar o React à toa. */
  let ultimo: EstadoGatilho | null = null

  /** Lê o gatilho imediatamente antes do cursor, se houver. */
  function ler(view: EditorView, gatilho: string): EstadoGatilho | null {
    const { selection } = view.state
    if (!selection.empty) return null

    const posicao = selection.$from
    // Nó de código não recebe menu: ali `//` é comentário, não comando.
    if (posicao.parent.type.spec.code) return null

    const inicioDoBloco = posicao.start()
    const antes = posicao.parent.textBetween(
      0,
      posicao.pos - inicioDoBloco,
      undefined,
      '￼',
    )

    /*
     * Concatenação, e não template literal: num template `\s` e `\p` são
     * escapes inválidos e viram `s` e `p`, o que produziria a regex
     * `(?:^|s)//([pLpN]*)$` — silenciosamente errada. Foi o lint que apontou.
     *
     * O gatilho só vale no começo do bloco ou depois de espaço: sem isso,
     * `http://exemplo` abriria o menu no meio de uma URL. Com
     * `apenasInicioDeLinha`, nem depois de espaço — é o caso do `/` de bloco,
     * onde ele também impede que "e/ou" abra o menu.
     */
    const prefixo = opcoes.apenasInicioDeLinha ? '^' : '(?:^|\\s)'
    const padrao = new RegExp(
      prefixo + escapar(gatilho) + '([^\\n\\]]*)$',
      'u',
    )
    const achado = padrao.exec(antes)
    if (!achado) return null

    const termo = achado[1] ?? ''

    /*
     * Cede a vez ao gatilho mais longo quando ele também casa aqui. Sem isto,
     * `//int` abriria o menu de blocos com o termo `/int` ao lado do menu de
     * símbolos com o termo `int`.
     */
    if (opcoes.excluir !== undefined) {
      const maisLongo = new RegExp(
        prefixo + escapar(opcoes.excluir) + '([^\\n\\]]*)$',
        'u',
      )
      if (maisLongo.test(antes)) return null
    }

    const de = posicao.pos - termo.length - gatilho.length
    const coords = view.coordsAtPos(de)

    return {
      termo,
      de,
      ate: posicao.pos,
      ancora: {
        esquerda: coords.left,
        topo: coords.top,
        base: coords.bottom,
      },
      emMatematica: /math/i.test(posicao.parent.type.name),
    }
  }

  return $prose(
    () =>
      new Plugin({
        key: chave,
        props: {
          handleKeyDown: (_view, evento) => {
            if (!aberto) return false
            /*
             * Só as teclas de navegação são consumidas. Letra e Backspace
             * seguem para o editor, porque é digitando que se filtra — o menu
             * acompanha o texto, não o substitui.
             */
            const teclas = ['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape']
            if (!teclas.includes(evento.key)) return false
            const consumiu = opcoes.aoTeclar(evento.key)
            if (consumiu) evento.preventDefault()
            return consumiu
          },
        },
        view: () => ({
          update: (view) => {
            const estado = ler(view, opcoes.gatilho)
            aberto = estado !== null

            /*
             * Só avisa o React quando algo MUDOU de verdade.
             *
             * `update` roda a cada transação do editor, e `ler` devolve objeto
             * novo sempre que o gatilho casa — então o React re-renderizava a
             * cada tecla, nas duas instâncias (`//` e `/`), mesmo com a lista
             * idêntica. Além do desperdício, era esse render por tecla que
             * fazia efeitos vizinhos rodarem sem necessidade.
             */
            if (mesmoEstado(ultimo, estado)) return
            ultimo = estado
            opcoes.aoMudar(estado)
          },
          destroy: () => {
            aberto = false
            ultimo = null
            opcoes.aoMudar(null)
          },
        }),
      }),
  )

}

/** Igualdade por valor: posição e termo são o que a lista consome. */
function mesmoEstado(
  a: EstadoGatilho | null,
  b: EstadoGatilho | null,
): boolean {
  if (a === null || b === null) return a === b
  return (
    a.termo === b.termo &&
    a.de === b.de &&
    a.ate === b.ate &&
    a.emMatematica === b.emMatematica &&
    a.ancora.esquerda === b.ancora.esquerda &&
    a.ancora.base === b.ancora.base
  )
}

function escapar(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
