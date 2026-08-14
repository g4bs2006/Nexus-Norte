import { Fragment } from 'react'

interface TrechoBuscaProps {
  /** Trecho vindo de `ts_headline`, com o termo entre `<<` e `>>`. */
  texto: string
}

/**
 * O pedaço da nota que casou com a busca, com o termo destacado.
 *
 * Existe para a lista responder POR QUE cada nota apareceu — sem isso, buscar
 * "convergência" devolve seis títulos e obriga a abrir os seis para descobrir
 * qual serve.
 *
 * O destaque chega como `<<termo>>`, marcador em texto, e é fatiado aqui. O
 * banco poderia devolver `<mark>` pronto, mas aí exibir exigiria
 * `dangerouslySetInnerHTML` — criar um caminho de injeção de HTML só para
 * pintar de amarelo não se paga.
 */
export function TrechoBusca({ texto }: TrechoBuscaProps) {
  if (texto.trim() === '') return null

  const pedacos = texto.split(/<<(.*?)>>/g)

  return (
    <p className="text-muted-foreground text-xs">
      {pedacos.map((pedaco, indice) =>
        // Índice ímpar é o que estava entre os marcadores: o `split` com grupo
        // de captura intercala texto e captura.
        indice % 2 === 1 ? (
          <mark
            key={indice}
            className="bg-estudos/20 text-foreground rounded-sm px-0.5"
          >
            {pedaco}
          </mark>
        ) : (
          <Fragment key={indice}>{pedaco}</Fragment>
        ),
      )}
    </p>
  )
}
