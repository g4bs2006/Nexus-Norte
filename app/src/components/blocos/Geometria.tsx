import { useEffect, useId, useRef, useState } from 'react'
import JXG from 'jsxgraph'
import './geometria.css'
import { compile } from 'mathjs'
import { resolverTema, useUIStore } from '@/stores/ui'

export interface GeometriaDados {
  sliders: readonly {
    nome: string
    min: number
    max: number
    valor: number
  }[]
  curvas: readonly { nome: string; expressao: string }[]
  x: { de: number; ate: number } | null
  y: { de: number; ate: number } | null
}

interface GeometriaProps {
  geometria: GeometriaDados
}

const LIMITE_PADRAO = { de: -5, ate: 5 }

/**
 * Geometria interativa — cerca ```` ```geometria ````.
 *
 * O bloco de maior retorno no curso (spec 14/08, seção 7): arrastar o parâmetro
 * e ver a reta tangente mudar, ou a soma de Riemann refinando, é o que
 * transforma nota em material que ensina — e é o que nenhum caderno de papel
 * faz.
 *
 * A expressão é COMPILADA pelo mathjs, não executada como JavaScript. O
 * `compile` do mathjs avalia só a árvore aritmética que ele mesmo montou, então
 * o conteúdo de uma nota não vira código com acesso ao app.
 */
export default function Geometria({ geometria }: GeometriaProps) {
  const alvo = useRef<HTMLDivElement>(null)
  const [erro, setErro] = useState<string | null>(null)
  const id = useId().replace(/:/g, '')
  const escuro = resolverTema(useUIStore((estado) => estado.tema)) === 'escuro'

  const chave = JSON.stringify(geometria)

  useEffect(() => {
    const elemento = alvo.current
    if (!elemento) return

    const x = geometria.x ?? LIMITE_PADRAO
    const y = geometria.y ?? LIMITE_PADRAO

    let quadro: ReturnType<typeof JXG.JSXGraph.initBoard> | null = null

    try {
      quadro = JXG.JSXGraph.initBoard(elemento, {
        // `boundingbox` é [esquerda, topo, direita, base] — o topo vem antes.
        boundingbox: [x.de, y.ate, x.ate, y.de],
        axis: true,
        showCopyright: false,
        showNavigation: false,
        keepAspectRatio: false,
      })

      const controles = new Map<string, { Value: () => number }>()

      geometria.sliders.forEach((slider, indice) => {
        // Empilhados no canto superior esquerdo, um abaixo do outro, em
        // coordenadas do gráfico — é onde não cobrem a curva.
        const altura = y.ate - (y.ate - y.de) * (0.08 + indice * 0.07)
        const inicio = x.de + (x.ate - x.de) * 0.05
        const fim = x.de + (x.ate - x.de) * 0.35

        const controle = quadro!.create(
          'slider',
          [
            [inicio, altura],
            [fim, altura],
            [slider.min, slider.valor, slider.max],
          ],
          { name: slider.nome, snapWidth: -1, strokeColor: '#888' },
        )
        controles.set(slider.nome, controle as { Value: () => number })
      })

      for (const curva of geometria.curvas) {
        const compilada = compile(curva.expressao)

        quadro.create(
          'functiongraph',
          [
            (valorX: number) => {
              const escopo: Record<string, number> = { x: valorX }
              for (const [nome, controle] of controles) {
                escopo[nome] = controle.Value()
              }
              const resultado: unknown = compilada.evaluate(escopo)
              return typeof resultado === 'number' ? resultado : NaN
            },
            x.de,
            x.ate,
          ],
          { strokeWidth: 2, name: curva.nome, withLabel: true },
        )
      }

      setErro(null)
    } catch (falha) {
      setErro(
        falha instanceof Error ? falha.message : 'Não consegui montar o gráfico',
      )
    }

    return () => {
      if (quadro) JXG.JSXGraph.freeBoard(quadro)
    }
    // `chave` cobre a geometria inteira; `id` só muda se o componente remontar.
  }, [chave, geometria, id, escuro])

  if (erro !== null) {
    return (
      <p className="text-muted-foreground border-status-risco/40 my-2 rounded-md border border-dashed p-3 text-xs">
        {erro}
      </p>
    )
  }

  return (
    <div
      ref={alvo}
      id={`jxg-${id}`}
      className="my-2 h-72 w-full overflow-hidden rounded-md border"
    />
  )
}
