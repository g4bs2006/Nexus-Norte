import { filtrarSimbolos, montarInsercao, simboloPorGatilho } from './latex'

/**
 * O catálogo do `//`, no formato que o editor do kernel entende.
 *
 * O editor só devolve `{ chave, rotulo, amostra }` — ele não sabe o que é
 * LaTeX, e não deve saber. A ponte é a CHAVE: aqui ela é resolvida de volta
 * para o símbolo, e toda a regra continua em `latex.ts`, que é puro e testado.
 *
 * Resolver por chave em vez de carregar o símbolo dentro do item também evita
 * um problema de tipo real: uma função que recebe o item rico não é
 * substituível por uma que recebe o item simples, e a fronteira do kernel
 * precisa do simples.
 */
export const fonteSimbolos = {
  filtrar: (termo: string) =>
    filtrarSimbolos(termo).map((simbolo) => ({
      chave: simbolo.gatilho,
      rotulo: simbolo.rotulo,
      amostra: simbolo.amostra,
    })),

  montar: (item: { chave: string }, emMatematica: boolean) => {
    const simbolo = simboloPorGatilho(item.chave)
    if (!simbolo) return { tipo: 'acao' as const }

    /*
     * A fórmula em branco (`latex` vazio) é a única entrada sem conteúdo, e
     * por isso não passa pelo caminho normal: já estando DENTRO de uma
     * fórmula não há o que abrir — o gatilho digitado sai e o menu fecha,
     * porque abrir fórmula dentro de fórmula não existe.
     */
    if (simbolo.latex === '') {
      if (emMatematica) return { tipo: 'acao' as const }
      return { tipo: 'formula' as const, latex: '', buracos: [] }
    }

    /*
     * Dentro de uma fórmula, o LaTeX entra como texto: já se está no nó, e
     * aninhar fórmula em fórmula não existe.
     *
     * Fora dela, vira NÓ — e não `$...$` em texto. Texto cru não renderiza,
     * porque as input rules do plugin-math só disparam em digitação real e
     * `insertText` não conta. Era isto que fazia `//int` deixar a integral
     * escrita em vez de desenhada.
     */
    if (emMatematica) {
      const { texto, buracos } = montarInsercao(simbolo, true)
      return { tipo: 'inserir' as const, texto, buracos }
    }
    /*
     * Os buracos são medidos no LaTeX cru, sem o `$` — dentro do nó não há
     * delimitador, o nó É a fórmula.
     */
    const buracos: number[] = []
    for (let i = 0; i < simbolo.latex.length - 1; i += 1) {
      if (simbolo.latex[i] === '{' && simbolo.latex[i + 1] === '}') {
        buracos.push(i + 1)
      }
    }
    return { tipo: 'formula' as const, latex: simbolo.latex, buracos }
  },
}
