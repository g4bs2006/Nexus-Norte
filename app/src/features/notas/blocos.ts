import type { ResultadoEscolha } from '@/components/editor/useGatilho'

/** Um bloco que o `/` oferece. */
interface Bloco {
  chave: string
  rotulo: string
  amostra: string
  /** Termos extras para a busca achar. */
  sinonimos?: string
  /**
   * O Markdown inserido. Ausente quando o bloco abre um diálogo — desenho e
   * fórmula visual precisam de uma tela antes de virar texto.
   */
  markdown?: string
}

/**
 * O catálogo do `/`.
 *
 * Divisão com o `//`: aqui ficam as coisas que **ocupam a linha inteira**; lá,
 * os símbolos que entram no meio da frase. É a mesma divisão que o Notion e o
 * AFFiNE fazem, e ela se paga porque uma lista só misturaria "∫" com "diagrama
 * de estados".
 *
 * O corpo de cada cerca vem com um exemplo mínimo já preenchido. Cerca vazia
 * obrigaria a lembrar a sintaxe de cabeça, que é exatamente o que o menu veio
 * evitar — e um exemplo errado é mais fácil de corrigir que uma página em
 * branco.
 */
const BLOCOS: readonly Bloco[] = [
  {
    chave: 'diagrama',
    rotulo: 'Diagrama',
    amostra: '◇',
    sinonimos: 'mermaid fluxo estados grafo processo',
    markdown: '```mermaid\ngraph TD\n  A[Início] --> B[Fim]\n```',
  },
  {
    chave: 'grafico',
    rotulo: 'Gráfico de função',
    amostra: '∿',
    sinonimos: 'plot curva funcao desenhar',
    markdown: '```plot\nx^2\n-5:5\n```',
  },
  {
    chave: 'geometria',
    rotulo: 'Geometria interativa',
    amostra: '⊹',
    sinonimos: 'jsxgraph slider parametro tangente riemann',
    markdown: '```geometria\nslider a: -3:3 = 1\nf(x) = a*x^2\nx: -5:5\n```',
  },
  {
    chave: 'desenho',
    rotulo: 'Desenho',
    amostra: '✎',
    sinonimos: 'excalidraw diagrama mao livre esboco',
  },
  {
    chave: 'formula',
    rotulo: 'Fórmula (visual)',
    amostra: '∑',
    sinonimos: 'mathlive latex matriz equacao',
  },
  {
    chave: 'tabela',
    rotulo: 'Tabela',
    amostra: '▦',
    sinonimos: 'tabela grade linhas colunas',
    markdown: '| | |\n|---|---|\n| | |',
  },
  {
    chave: 'codigo',
    rotulo: 'Código',
    amostra: '⌗',
    sinonimos: 'codigo bloco programa',
    markdown: '```\n\n```',
  },
]

/**
 * Monta a fonte do `/`, ligada às telas que alguns blocos precisam abrir.
 *
 * Recebe os gatilhos por parâmetro porque abrir o Excalidraw e o MathLive é
 * decisão de quem monta a página — este arquivo sabe QUE existe um desenho,
 * não COMO ele é desenhado.
 */
export function criarFonteBlocos(acoes: {
  abrirDesenho: () => void
  abrirFormula: () => void
}) {
  return {
    filtrar: (termo: string) => {
      const busca = termo.trim().toLowerCase()
      const casa = (bloco: Bloco) =>
        busca === '' ||
        bloco.chave.startsWith(busca) ||
        `${bloco.rotulo} ${bloco.sinonimos ?? ''}`.toLowerCase().includes(busca)

      return BLOCOS.filter(casa).map((bloco) => ({
        chave: bloco.chave,
        rotulo: bloco.rotulo,
        amostra: bloco.amostra,
      }))
    },

    montar: (item: { chave: string }): ResultadoEscolha => {
      if (item.chave === 'desenho') {
        acoes.abrirDesenho()
        return { tipo: 'acao' }
      }
      if (item.chave === 'formula') {
        acoes.abrirFormula()
        return { tipo: 'acao' }
      }

      const bloco = BLOCOS.find((candidato) => candidato.chave === item.chave)
      if (!bloco?.markdown) return { tipo: 'acao' }

      /*
       * Sem buracos: o cursor para no fim do bloco. Navegar dentro de uma cerca
       * com `Tab` conflitaria com o `Tab` que indenta código, e a cerca já vem
       * com exemplo — corrigir um exemplo é clicar nele.
       */
      return { tipo: 'inserir', texto: bloco.markdown, buracos: [] }
    },
  }
}
