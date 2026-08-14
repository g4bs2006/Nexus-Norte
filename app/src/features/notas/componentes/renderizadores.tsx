import { Suspense, lazy, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { lerGeometria } from '../geometria'
import { lerPlot } from '../plot'
import { Desenho } from './Desenho'

const Diagrama = lazy(() => import('@/components/blocos/Diagrama'))
const GraficoFuncao = lazy(() => import('@/components/blocos/GraficoFuncao'))
const Geometria = lazy(() => import('@/components/blocos/Geometria'))

/**
 * O que cada construção da nota vira na tela.
 *
 * **Um lugar só, usado por dois consumidores**: a leitura (`Cerca`,
 * `ConteudoNota`) e as node views do editor. Era o risco óbvio de ter editor e
 * leitura desenhando as mesmas coisas — duas listas de "mermaid vira
 * Diagrama" divergiriam na primeira linguagem nova.
 *
 * O kernel não importa nada disto: ele recebe estas funções por prop, porque
 * saber que `plot` vira gráfico é conhecimento de Notas.
 */

function Espera() {
  return <div className="bg-muted/40 my-2 h-40 animate-pulse rounded-md" />
}

/**
 * A cerca renderizada, ou `null` quando a linguagem não é nossa.
 *
 * `null` é resposta legítima e importante: significa "isto é código, mostre
 * como código". Quem chama decide como — a leitura desenha um `<pre>`, e o
 * editor já tem o dele, editável.
 */
export function renderizarBloco(
  linguagem: string,
  codigo: string,
): ReactNode | null {
  if (linguagem === 'mermaid') {
    return (
      <Suspense fallback={<Espera />}>
        <Diagrama codigo={codigo} />
      </Suspense>
    )
  }

  if (linguagem === 'plot') {
    const plot = lerPlot(codigo)
    if (plot.expressoes.length === 0) return null
    return (
      <Suspense fallback={<Espera />}>
        <GraficoFuncao plot={plot} />
      </Suspense>
    )
  }

  if (linguagem === 'geometria') {
    const geometria = lerGeometria(codigo)
    if (geometria.curvas.length === 0) return null
    return (
      <Suspense fallback={<Espera />}>
        <Geometria geometria={geometria} />
      </Suspense>
    )
  }

  return null
}

/**
 * O desenho, embrulhado no `QueryClientProvider`.
 *
 * O embrulho é exigência de onde isto é montado: a node view usa `createRoot`,
 * que cria uma ÁRVORE REACT NOVA — fora da do app, e portanto sem nenhum
 * provider. Sem isto, `useDesenho` estouraria com "No QueryClient set" dentro
 * do editor, e só ali.
 *
 * O `queryClient` é singleton de módulo, então o cache continua sendo o mesmo:
 * salvar o desenho pelo editor invalida a leitura da página junto.
 */
export function renderizarDesenho(id: string): ReactNode {
  return (
    <QueryClientProvider client={queryClient}>
      <Desenho id={id} />
    </QueryClientProvider>
  )
}
