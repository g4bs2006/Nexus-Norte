/**
 * Catálogo de símbolos do gatilho `//`.
 *
 * ## Por que existe
 *
 * Digitar `\int_{0}^{\infty}` às cegas é lento o suficiente para se desistir de
 * anotar no app — e fricção é o que matou as tentativas anteriores de manter um
 * sistema pessoal. O diálogo do MathLive resolve isso para a fórmula difícil,
 * mas quebra a escrita: tira a mão do teclado, tira os olhos da frase, e
 * transforma "escrever uma integral" em "executar um comando".
 *
 * `//int` resolve sem sair da linha.
 *
 * ## Por que é dado puro
 *
 * Mesma razão de `markdown.ts`: a sintaxe é decisão do sistema, não da
 * biblioteca que a renderiza. Trocar o editor não toca neste arquivo, e ele
 * roda sem DOM — então tem teste.
 */

export interface Simbolo {
  /** O que se digita depois de `//`. Também é a chave da lista. */
  gatilho: string
  /** Como se lê na lista. */
  rotulo: string
  /** Amostra renderizada ao lado — ajuda a escolher sem ler. */
  amostra: string
  /**
   * LaTeX inserido. `{}` vazios são os buracos por onde o `Tab` anda; a ordem
   * é a de leitura da fórmula, não a de escrita do LaTeX.
   */
  latex: string
  /** Termos extras para a busca achar. `soma` acha `\sum`, que ninguém digita. */
  sinonimos?: string
}

/**
 * Ordenado por frequência em Engenharia, não alfabeticamente.
 *
 * A lista é curta de propósito. Um catálogo com 200 símbolos vira busca dentro
 * da busca; quem precisa de `\aleph` sabe digitar `\aleph`, e para isso o LaTeX
 * cru continua funcionando em qualquer lugar do texto.
 */
export const SIMBOLOS: readonly Simbolo[] = [
  /*
   * Primeiro da lista de propósito: `//` + Enter abre uma fórmula para
   * escrever dentro.
   *
   * É o buraco que faltava. O catálogo resolve o símbolo que não se lembra, e
   * o diálogo do MathLive resolve a matriz — mas escrever `x^2 + 3x`, que não
   * tem símbolo nenhum, obrigava a digitar os `$` na mão ou a abrir um diálogo
   * para uma conta trivial.
   *
   * O corpo é UM BURACO, e não vazio. Um nó inline sem conteúdo nenhum não
   * recebe cursor: o navegador não põe caret dentro de elemento inline vazio
   * num `contenteditable` e joga a seleção para o texto mais próximo — o que
   * fazia o que se digitava sair FORA da fórmula. Com o buraco, esta entrada
   * passa a ser exatamente o que toda outra já é: um LaTeX com `{}` onde o
   * cursor pousa e por onde o `Tab` anda. A chave vazia é grupo em LaTeX, e
   * não muda o que o KaTeX desenha.
   */
  {
    gatilho: 'formula',
    rotulo: 'fórmula em branco',
    amostra: '𝑥',
    latex: '{}',
    sinonimos: 'vazia nova equacao conta escrever matematica',
  },
  {
    gatilho: 'int',
    rotulo: 'integral',
    amostra: '∫',
    latex: '\\int_{}^{}{}',
    sinonimos: 'integral primitiva area',
  },
  {
    gatilho: 'iint',
    rotulo: 'integral dupla',
    amostra: '∬',
    latex: '\\iint_{}{}',
    sinonimos: 'integral dupla superficie',
  },
  {
    gatilho: 'oint',
    rotulo: 'integral de linha',
    amostra: '∮',
    latex: '\\oint_{}{}',
    sinonimos: 'integral linha fechada contorno circulacao',
  },
  {
    gatilho: 'sum',
    rotulo: 'somatório',
    amostra: '∑',
    latex: '\\sum_{}^{}{}',
    sinonimos: 'soma somatorio serie',
  },
  {
    gatilho: 'prod',
    rotulo: 'produtório',
    amostra: '∏',
    latex: '\\prod_{}^{}{}',
    sinonimos: 'produto produtorio',
  },
  {
    gatilho: 'lim',
    rotulo: 'limite',
    amostra: 'lim',
    latex: '\\lim_{ \\to }{}',
    sinonimos: 'limite tende',
  },
  {
    gatilho: 'frac',
    rotulo: 'fração',
    amostra: 'a/b',
    latex: '\\frac{}{}',
    sinonimos: 'fracao divisao razao quociente',
  },
  {
    gatilho: 'sqrt',
    rotulo: 'raiz',
    amostra: '√',
    latex: '\\sqrt{}',
    sinonimos: 'raiz quadrada',
  },
  {
    gatilho: 'nroot',
    rotulo: 'raiz n-ésima',
    amostra: 'ⁿ√',
    latex: '\\sqrt[]{}',
    sinonimos: 'raiz enesima indice',
  },
  {
    gatilho: 'deriv',
    rotulo: 'derivada',
    amostra: 'd/dx',
    latex: '\\frac{d}{dx}{}',
    sinonimos: 'derivada taxa variacao',
  },
  {
    gatilho: 'partial',
    rotulo: 'derivada parcial',
    amostra: '∂',
    latex: '\\frac{\\partial }{\\partial }{}',
    sinonimos: 'parcial derivada gradiente',
  },
  {
    gatilho: 'matrix',
    rotulo: 'matriz',
    amostra: '[ ]',
    latex: '\\begin{bmatrix} & \\\\ & \\end{bmatrix}',
    sinonimos: 'matriz vetor colchete',
  },
  {
    gatilho: 'vec',
    rotulo: 'vetor',
    amostra: 'v⃗',
    latex: '\\vec{}',
    sinonimos: 'vetor seta',
  },
  {
    gatilho: 'infty',
    rotulo: 'infinito',
    amostra: '∞',
    latex: '\\infty',
    sinonimos: 'infinito',
  },
  {
    gatilho: 'pi',
    rotulo: 'pi',
    amostra: 'π',
    latex: '\\pi',
  },
  {
    gatilho: 'theta',
    rotulo: 'teta',
    amostra: 'θ',
    latex: '\\theta',
    sinonimos: 'angulo teta',
  },
  {
    gatilho: 'alpha',
    rotulo: 'alfa',
    amostra: 'α',
    latex: '\\alpha',
  },
  {
    gatilho: 'beta',
    rotulo: 'beta',
    amostra: 'β',
    latex: '\\beta',
  },
  {
    gatilho: 'omega',
    rotulo: 'ômega',
    amostra: 'ω',
    latex: '\\omega',
    sinonimos: 'omega frequencia angular',
  },
  {
    gatilho: 'delta',
    rotulo: 'delta',
    amostra: 'Δ',
    latex: '\\Delta',
    sinonimos: 'delta variacao',
  },
  {
    gatilho: 'approx',
    rotulo: 'aproximadamente',
    amostra: '≈',
    latex: '\\approx',
    sinonimos: 'aproximado quase igual',
  },
  {
    gatilho: 'neq',
    rotulo: 'diferente',
    amostra: '≠',
    latex: '\\neq',
    sinonimos: 'diferente nao igual',
  },
  {
    gatilho: 'leq',
    rotulo: 'menor ou igual',
    amostra: '≤',
    latex: '\\leq',
  },
  {
    gatilho: 'geq',
    rotulo: 'maior ou igual',
    amostra: '≥',
    latex: '\\geq',
  },
]

/**
 * Filtra o catálogo pelo que já se digitou depois de `//`.
 *
 * Casa por PREFIXO no gatilho, e por conteúdo nos sinônimos e no rótulo. O
 * prefixo no gatilho é o que faz `//in` mostrar `int` no topo em vez de
 * enterrá-lo entre tudo que contém "in".
 *
 * Termo vazio devolve o catálogo inteiro, na ordem de frequência: abrir a lista
 * sem digitar tem que mostrar o que mais se usa.
 */
export function filtrarSimbolos(termo: string): Simbolo[] {
  const busca = termo.trim().toLowerCase()
  if (busca === '') return [...SIMBOLOS]

  const porPrefixo: Simbolo[] = []
  const porTexto: Simbolo[] = []

  for (const simbolo of SIMBOLOS) {
    if (simbolo.gatilho.startsWith(busca)) {
      porPrefixo.push(simbolo)
      continue
    }
    const texto = `${simbolo.gatilho} ${simbolo.rotulo} ${simbolo.sinonimos ?? ''}`
    if (texto.toLowerCase().includes(busca)) porTexto.push(simbolo)
  }

  return [...porPrefixo, ...porTexto]
}

/** O símbolo de um gatilho, ou `undefined` se não existir. */
export function simboloPorGatilho(gatilho: string): Simbolo | undefined {
  return SIMBOLOS.find((simbolo) => simbolo.gatilho === gatilho)
}

/** Onde o cursor para, e o texto sem os marcadores de buraco. */
export interface Insercao {
  texto: string
  /** Índices, relativos ao início de `texto`, de cada `{}` vazio. */
  buracos: number[]
}

/**
 * Monta o que vai ser inserido, e onde o `Tab` vai parar.
 *
 * `dentroDeMatematica` decide se o LaTeX sai cru ou embrulhado em `$`. Sem
 * isso, digitar `//int` já dentro de uma fórmula produziria `$...$` aninhado,
 * que o KaTeX não renderiza — e quem está escrevendo uma fórmula longa é
 * justamente quem mais usa o atalho.
 */
export function montarInsercao(
  simbolo: Simbolo,
  dentroDeMatematica: boolean,
): Insercao {
  const corpo = simbolo.latex
  const prefixo = dentroDeMatematica ? '' : '$'
  const texto = dentroDeMatematica ? corpo : `$${corpo}$`

  const buracos: number[] = []
  for (let i = 0; i < corpo.length - 1; i += 1) {
    if (corpo[i] === '{' && corpo[i + 1] === '}') {
      // Aponta ENTRE as chaves, que é onde se digita.
      buracos.push(prefixo.length + i + 1)
    }
  }

  return { texto, buracos }
}
