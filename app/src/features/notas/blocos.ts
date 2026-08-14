import type { ResultadoEscolha } from '@/components/editor/useGatilho'

/** Um bloco que o `/` oferece. */
interface Bloco {
  chave: string
  rotulo: string
  amostra: string
  /** Termos extras para a busca achar. */
  sinonimos?: string
  /**
   * A linguagem da cerca. Ausente quando o bloco abre um diálogo — desenho e
   * fórmula visual precisam de uma tela antes de virar bloco.
   */
  linguagem?: string
  /** Exemplo mínimo que nasce dentro da cerca. */
  corpo?: string
}

/**
 * Os blocos que a feature Notas acrescenta ao `/`.
 *
 * Título, lista, citação e divisor NÃO estão aqui: são Markdown puro, servem a
 * qualquer texto, e por isso moram no catálogo do kernel. Aqui fica só o que é
 * de nota de estudo.
 *
 * Divisão com o `//`: aqui ficam as coisas que **ocupam a linha inteira**; lá,
 * os símbolos que entram no meio da frase.
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
    linguagem: 'mermaid',
    corpo: 'graph TD\n  A[Início] --> B[Fim]',
  },
  {
    chave: 'grafico',
    rotulo: 'Gráfico de função',
    amostra: '∿',
    sinonimos: 'plot curva funcao desenhar',
    linguagem: 'plot',
    corpo: 'x^2\n-5:5',
  },
  {
    chave: 'geometria',
    rotulo: 'Geometria interativa',
    amostra: '⊹',
    sinonimos: 'jsxgraph slider parametro tangente riemann',
    linguagem: 'geometria',
    corpo: 'slider a: -3:3 = 1\nf(x) = a*x^2\nx: -5:5',
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
      if (bloco?.linguagem === undefined) return { tipo: 'acao' }

      /*
       * Comando, e não texto. Foi o `insertText` que quebrou o `/` antes: uma
       * cerca escrita como texto nunca vira `code_block`, então o gráfico não
       * chegava a existir.
       */
      return {
        tipo: 'comando',
        comando: { tipo: 'cerca', linguagem: bloco.linguagem },
        ...(bloco.corpo ? { corpo: bloco.corpo } : {}),
      }
    },
  }
}
