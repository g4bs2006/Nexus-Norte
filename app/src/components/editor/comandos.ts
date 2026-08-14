import { callCommand } from '@milkdown/kit/utils'
import {
  createCodeBlockCommand,
  insertHrCommand,
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  toggleStrongCommand,
  turnIntoTextCommand,
  wrapInBlockquoteCommand,
  wrapInBulletListCommand,
  wrapInHeadingCommand,
  wrapInOrderedListCommand,
} from '@milkdown/kit/preset/commonmark'
import {
  insertTableCommand,
  toggleStrikethroughCommand,
} from '@milkdown/kit/preset/gfm'
import type { Ctx } from '@milkdown/kit/ctx'

/**
 * Os comandos de escrita do editor.
 *
 * **Isto é conhecimento de EDITOR, não de nota.** Título, lista, citação e
 * divisor são Markdown — servem a qualquer texto, e por isso moram no kernel
 * junto do editor, e não em `features/notas`. O que a feature acrescenta são
 * os blocos dela: diagrama, gráfico, geometria, desenho.
 *
 * Cada entrada é um comando do Milkdown, e não texto inserido. A diferença é a
 * que quebrou o `/` antes de existir este arquivo: `insertText` grava texto
 * cru, e uma cerca ```` ```plot ```` escrita como texto nunca vira `code_block`
 * — o gráfico não aparecia porque o bloco nunca chegou a ser bloco.
 */

/** O que o `/` pode fazer, além de inserir texto. */
export type ComandoEscrita =
  | { tipo: 'titulo'; nivel: 1 | 2 | 3 }
  | { tipo: 'texto' }
  | { tipo: 'lista' }
  | { tipo: 'listaNumerada' }
  | { tipo: 'citacao' }
  | { tipo: 'divisor' }
  | { tipo: 'tabela' }
  /** Cerca com linguagem. É como diagrama, gráfico e geometria nascem. */
  | { tipo: 'cerca'; linguagem: string; corpo?: string }

/** Marcas aplicadas sobre a seleção. */
export type MarcaEscrita = 'negrito' | 'italico' | 'codigo' | 'riscado'

/**
 * Executa o comando no editor.
 *
 * Devolvido como função de `Ctx` porque é assim que o Milkdown expõe ação
 * sobre o documento — quem chama já está dentro de um `editor.action`.
 */
export function aplicarComando(comando: ComandoEscrita) {
  return (ctx: Ctx) => {
    switch (comando.tipo) {
      case 'titulo':
        callCommand(wrapInHeadingCommand.key, comando.nivel)(ctx)
        return
      case 'texto':
        callCommand(turnIntoTextCommand.key)(ctx)
        return
      case 'lista':
        callCommand(wrapInBulletListCommand.key)(ctx)
        return
      case 'listaNumerada':
        callCommand(wrapInOrderedListCommand.key)(ctx)
        return
      case 'citacao':
        callCommand(wrapInBlockquoteCommand.key)(ctx)
        return
      case 'divisor':
        callCommand(insertHrCommand.key)(ctx)
        return
      case 'tabela':
        callCommand(insertTableCommand.key)(ctx)
        return
      case 'cerca':
        /*
         * Vira `code_block` de verdade, com a linguagem no atributo. O corpo
         * de exemplo entra depois, por transação, porque o comando só troca o
         * tipo do bloco — quem preenche é `inserirCorpoDaCerca`.
         */
        callCommand(createCodeBlockCommand.key, comando.linguagem)(ctx)
        return
    }
  }
}

/** As marcas que a barra de seleção aplica sobre o texto selecionado. */
export function aplicarMarca(marca: MarcaEscrita) {
  return (ctx: Ctx) => {
    if (marca === 'negrito') return callCommand(toggleStrongCommand.key)(ctx)
    if (marca === 'italico') return callCommand(toggleEmphasisCommand.key)(ctx)
    if (marca === 'codigo') return callCommand(toggleInlineCodeCommand.key)(ctx)
    return callCommand(toggleStrikethroughCommand.key)(ctx)
  }
}
