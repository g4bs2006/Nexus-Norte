import { Suspense, lazy, useMemo } from 'react'
import { lerGeometria } from '../geometria'
import { lerPlot } from '../plot'

const Diagrama = lazy(() => import('@/components/blocos/Diagrama'))
const GraficoFuncao = lazy(() => import('@/components/blocos/GraficoFuncao'))
const Geometria = lazy(() => import('@/components/blocos/Geometria'))

interface CercaProps {
  linguagem: string
  codigo: string
}

/**
 * Uma cerca de código na leitura da nota.
 *
 * `mermaid` e `plot` viram bloco renderizado; qualquer outra linguagem (ou
 * nenhuma) segue sendo código exibido como código, que é o comportamento
 * correto de Markdown.
 *
 * Cada engine entra por `lazy` e um por vez (spec 14/08, seção 7): abrir uma
 * nota que só tem um diagrama não pode baixar o desenhista de função junto.
 */
export function Cerca({ linguagem, codigo }: CercaProps) {
  const plot = useMemo(
    () => (linguagem === 'plot' ? lerPlot(codigo) : null),
    [linguagem, codigo],
  )

  const geometria = useMemo(
    () => (linguagem === 'geometria' ? lerGeometria(codigo) : null),
    [linguagem, codigo],
  )

  if (linguagem === 'mermaid') {
    return (
      <Suspense fallback={<Espera />}>
        <Diagrama codigo={codigo} />
      </Suspense>
    )
  }

  if (plot !== null) {
    if (plot.expressoes.length === 0) {
      return (
        <p className="text-muted-foreground my-2 text-xs">
          Bloco de gráfico sem expressão nenhuma.
        </p>
      )
    }
    return (
      <Suspense fallback={<Espera />}>
        <GraficoFuncao plot={plot} />
      </Suspense>
    )
  }

  if (geometria !== null) {
    if (geometria.curvas.length === 0) {
      return (
        <p className="text-muted-foreground my-2 text-xs">
          Bloco de geometria sem curva nenhuma.
        </p>
      )
    }
    return (
      <Suspense fallback={<Espera />}>
        <Geometria geometria={geometria} />
      </Suspense>
    )
  }

  return (
    <pre className="bg-muted my-2 overflow-x-auto rounded-md p-3 font-mono text-xs">
      {codigo}
    </pre>
  )
}

function Espera() {
  return (
    <div className="bg-muted/40 my-2 h-40 animate-pulse rounded-md" />
  )
}
