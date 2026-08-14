/**
 * Id único no documento inteiro, para bibliotecas que exigem um.
 *
 * Existe porque `useId` do React **não serve aqui**: ele é único dentro de uma
 * árvore React, e as node views do editor montam um root próprio por bloco.
 * Dois diagramas em roots diferentes podem receber o mesmo id, e o mermaid
 * escreve um por cima do outro.
 *
 * Contador de módulo é o mais simples que resolve: monotônico, sem colisão, e
 * sem depender de aleatoriedade.
 */
let proximo = 0

export function idUnico(prefixo: string): string {
  proximo += 1
  return `${prefixo}-${proximo}`
}
