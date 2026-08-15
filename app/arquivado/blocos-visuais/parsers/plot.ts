/**
 * Leitura da cerca ```plot (spec 14/08, seção 7).
 *
 * Formato, uma diretiva por linha:
 *
 *     x^2 - 3x
 *     sin(x)
 *     -5:5          <- domínio, opcional
 *     y: -2:8       <- contradomínio, opcional
 *
 * Puro e testado, pelo mesmo motivo de `markdown.ts`: a sintaxe do bloco é
 * decisão do sistema, e não pode depender da biblioteca que desenha. Trocar o
 * function-plot depois não muda nada aqui.
 */

/** Intervalo fechado de um eixo. */
export type Intervalo = { de: number; ate: number }

export type Plot = {
  /** Uma curva por expressão, na ordem em que foram escritas. */
  expressoes: string[]
  /** Ausente = o desenhista escolhe. Não inventamos um padrão aqui. */
  x: Intervalo | null
  y: Intervalo | null
  /** Linhas que não são expressão nem intervalo válido. */
  erros: string[]
}

/** `-5:5`, `-5 : 5`, `0:6.28`. O sinal negativo é parte do número. */
const RE_INTERVALO = /^(-?\d+(?:\.\d+)?)\s*:\s*(-?\d+(?:\.\d+)?)$/

export function lerPlot(codigo: string): Plot {
  const expressoes: string[] = []
  const erros: string[] = []
  let x: Intervalo | null = null
  let y: Intervalo | null = null

  for (const bruta of codigo.split('\n')) {
    const linha = bruta.trim()
    if (linha === '' || linha.startsWith('#')) continue

    const comEixo = /^([xy])\s*:\s*(.+)$/i.exec(linha)
    if (comEixo) {
      const intervalo = lerIntervalo(comEixo[2] ?? '')
      if (intervalo === null) {
        erros.push(linha)
        continue
      }
      if (comEixo[1]?.toLowerCase() === 'y') y = intervalo
      else x = intervalo
      continue
    }

    // Sem prefixo de eixo, um intervalo solto é o domínio: é o caso comum, e
    // escrever `x:` toda vez seria cerimônia.
    const solto = lerIntervalo(linha)
    if (solto !== null) {
      x = solto
      continue
    }

    expressoes.push(linha)
  }

  return { expressoes, x, y, erros }
}

function lerIntervalo(texto: string): Intervalo | null {
  const achado = RE_INTERVALO.exec(texto.trim())
  if (!achado) return null

  const de = Number(achado[1])
  const ate = Number(achado[2])
  // Intervalo invertido ou degenerado não desenha nada; melhor tratar como
  // linha inválida do que entregar um gráfico vazio sem explicação.
  if (!Number.isFinite(de) || !Number.isFinite(ate) || de >= ate) return null

  return { de, ate }
}
