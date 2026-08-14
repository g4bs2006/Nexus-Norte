/**
 * Leitura da cerca ```geometria (spec 14/08, seção 7, item 4).
 *
 * Formato, uma diretiva por linha:
 *
 *     slider a: -3:3 = 1
 *     f(x) = a*x^2
 *     g(x) = 2*a*x - a^2
 *     x: -5:5
 *     y: -5:10
 *
 * **Sintaxe declarativa, e não JavaScript.** O JSXGraph é dirigido por JS, e
 * seria mais curto passar o corpo da cerca para um `Function()` — mas isso
 * tornaria o conteúdo de uma nota código executável. Numa base sem
 * autenticação, com exportação e importação de `.md` previstas, é uma porta que
 * não vale abrir por conveniência de sintaxe.
 *
 * O preço é cobrir menos que o JSXGraph inteiro. Cobre o que o spec pediu:
 * arrastar o parâmetro e ver a curva mudar.
 */

export type Slider = {
  nome: string
  min: number
  max: number
  /** Onde o slider começa. */
  valor: number
}

export type Curva = {
  /** Nome da função: o `f` de `f(x) = …`. */
  nome: string
  /** Expressão em `x`, podendo citar os sliders pelo nome. */
  expressao: string
}

export type Intervalo = { de: number; ate: number }

export type Geometria = {
  sliders: Slider[]
  curvas: Curva[]
  x: Intervalo | null
  y: Intervalo | null
  erros: string[]
}

const RE_SLIDER =
  /^slider\s+([a-z]\w*)\s*:\s*(-?\d+(?:\.\d+)?)\s*:\s*(-?\d+(?:\.\d+)?)\s*(?:=\s*(-?\d+(?:\.\d+)?))?$/i
const RE_CURVA = /^([a-z]\w*)\s*\(\s*x\s*\)\s*=\s*(.+)$/i
const RE_EIXO = /^([xy])\s*:\s*(-?\d+(?:\.\d+)?)\s*:\s*(-?\d+(?:\.\d+)?)$/i

export function lerGeometria(codigo: string): Geometria {
  const sliders: Slider[] = []
  const curvas: Curva[] = []
  const erros: string[] = []
  let x: Intervalo | null = null
  let y: Intervalo | null = null

  for (const bruta of codigo.split('\n')) {
    const linha = bruta.trim()
    if (linha === '' || linha.startsWith('#')) continue

    const slider = RE_SLIDER.exec(linha)
    if (slider) {
      const min = Number(slider[2])
      const max = Number(slider[3])
      if (min >= max) {
        erros.push(linha)
        continue
      }
      // Sem valor inicial, começa no meio: é o que faz o gráfico abrir mostrando
      // algo, em vez de colado num extremo.
      const valor =
        slider[4] === undefined ? (min + max) / 2 : Number(slider[4])
      sliders.push({
        nome: slider[1] as string,
        min,
        max,
        // Valor fora do intervalo travaria o slider num canto sem explicação.
        valor: Math.min(Math.max(valor, min), max),
      })
      continue
    }

    const eixo = RE_EIXO.exec(linha)
    if (eixo) {
      const de = Number(eixo[2])
      const ate = Number(eixo[3])
      if (de >= ate) {
        erros.push(linha)
        continue
      }
      if (eixo[1]?.toLowerCase() === 'y') y = { de, ate }
      else x = { de, ate }
      continue
    }

    const curva = RE_CURVA.exec(linha)
    if (curva) {
      curvas.push({
        nome: curva[1] as string,
        expressao: (curva[2] as string).trim(),
      })
      continue
    }

    erros.push(linha)
  }

  return { sliders, curvas, x, y, erros }
}
