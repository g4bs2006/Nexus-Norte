import { useEffect, useRef, useState } from 'react'
import functionPlot from 'function-plot'
import { parse } from 'mathjs'

export interface PlotDados {
  expressoes: readonly string[]
  x: { de: number; ate: number } | null
  y: { de: number; ate: number } | null
}

interface GraficoFuncaoProps {
  plot: PlotDados
}

/**
 * Gráfico de função — cerca ```` ```plot ````.
 *
 * **function-plot e não o Recharts já instalado** (spec 14/08, seção 7), por um
 * motivo concreto: o Recharts liga pontos consecutivos, então `1/x` e `tan(x)`
 * ganham uma reta vertical falsa na assíntota. Em Cálculo isso aparece toda
 * semana, e um gráfico que mente sobre a assíntota é pior que gráfico nenhum.
 *
 * **O Recharts continua o padrão do resto do app**: function-plot é para função
 * matemática, Recharts é para dado — e é por isso que este componente não se
 * chama `Grafico`, que já é o de Recharts no kernel.
 *
 * `mathjs` valida a expressão antes de desenhar. Sem isso, `x^` derruba o
 * function-plot com um erro sem contexto no meio da nota.
 */
export default function GraficoFuncao({ plot }: GraficoFuncaoProps) {
  const alvo = useRef<HTMLDivElement>(null)
  const [erro, setErro] = useState<string | null>(null)

  const { expressoes, x, y } = plot
  /* Serializado para a dependência do efeito não mudar a cada render do pai. */
  const chave = JSON.stringify(plot)

  useEffect(() => {
    const elemento = alvo.current
    if (!elemento) return

    const invalida = expressoes.find((expressao) => !avaliavel(expressao))
    if (invalida !== undefined) {
      setErro(`Não consegui ler: ${invalida}`)
      return
    }

    try {
      elemento.innerHTML = ''
      functionPlot({
        target: elemento,
        width: elemento.clientWidth,
        height: 260,
        grid: true,
        ...(x ? { xAxis: { domain: [x.de, x.ate] } } : {}),
        ...(y ? { yAxis: { domain: [y.de, y.ate] } } : {}),
        data: expressoes.map((expressao) => ({ fn: expressao })),
      })
      setErro(null)
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não consegui desenhar')
    }
    // `chave` cobre expressoes/x/y de uma vez; os três estão dentro dela.
  }, [chave, expressoes, x, y])

  if (erro !== null) {
    return (
      <p className="text-muted-foreground border-status-risco/40 my-2 rounded-md border border-dashed p-3 text-xs">
        {erro}
      </p>
    )
  }

  return <div ref={alvo} className="my-2 overflow-x-auto" />
}

/**
 * A expressão é sintaxe válida?
 *
 * `parse` do mathjs só monta a árvore — não avalia, então não há como uma
 * expressão da nota executar nada. Serve para separar erro de digitação de
 * erro do desenhista.
 */
function avaliavel(expressao: string): boolean {
  try {
    parse(expressao)
    return true
  } catch {
    return false
  }
}
