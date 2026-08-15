import type { ResultadoEscolha } from '@/components/editor/useGatilho'

/** Um bloco que o `/` oferece. */
interface Bloco {
  chave: string
  rotulo: string
  amostra: string
  /** Termos extras para a busca achar. */
  sinonimos?: string
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
 * **Diagrama, gráfico e geometria saíram em 14/08** — travavam a página. Estão
 * em `app/arquivado/blocos-visuais/`, com o relato do que se sabe e o que
 * fazer para retomar. Escrever ```` ```mermaid ```` à mão continua válido: a
 * cerca só aparece como código em vez de diagrama.
 */
const BLOCOS: readonly Bloco[] = [
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
 * Monta a fonte do `/`, ligada às telas que os blocos precisam abrir.
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

    /*
     * Os dois blocos restantes abrem uma tela antes de virar conteúdo, então
     * ambos são ação. Quando os blocos visuais voltarem, aqui volta também o
     * ramo que devolve `{ tipo: 'comando', comando: { tipo: 'cerca', … } }`.
     */
    montar: (item: { chave: string }): ResultadoEscolha => {
      if (item.chave === 'desenho') acoes.abrirDesenho()
      if (item.chave === 'formula') acoes.abrirFormula()
      return { tipo: 'acao' }
    },
  }
}
