/**
 * O catálogo de símbolos matemáticos. Um só, para os três caminhos.
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
 * ## Por que é UM catálogo (e mora no kernel)
 *
 * Havia três, independentes: este (o `//`), `ATALHOS_INLINE_GREGOS` em
 * `CampoMatematico` (o Tab do MathLive) e `SIMBOLOS_GREGOS`/`SIMBOLOS_OPERADORES`
 * em `DialogFormula` (a barra rápida). Listas diferentes davam respostas
 * diferentes para "esse símbolo existe?": `gamma` estava em duas e faltava
 * nesta, então `//gama` nunca funcionou enquanto `gamma`+Tab e o botão γ
 * funcionavam. Não era um bug com três sintomas — eram três verdades.
 *
 * Mora no kernel, ao lado de `catalogoEscrita.ts` (que é o análogo exato, o
 * catálogo do `/`), porque quem o consome é kernel: `DialogFormula` e
 * `CampoMatematico` são `components/`, e componente do kernel não pode importar
 * de feature. `features/notas/simbolos.ts` segue sendo a ponte que liga o
 * catálogo ao gatilho `//` — ela lê daqui, que é a direção permitida.
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
  /**
   * Aparece na barra de botões do `DialogFormula`.
   *
   * A barra é uma fileira de botões, não uma busca: cabem ~20 antes de virar
   * parede. O catálogo inteiro continua alcançável ali pelo Tab — este campo só
   * escolhe o que fica à vista para quem prefere o mouse.
   */
  rapido?: 'grega' | 'operador'
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
    rapido: 'operador',
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
    rapido: 'operador',
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
    rapido: 'operador',
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
    rapido: 'operador',
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
    rapido: 'operador',
  },
  {
    gatilho: 'pi',
    rotulo: 'pi',
    amostra: 'π',
    latex: '\\pi',
    rapido: 'grega',
  },
  {
    gatilho: 'theta',
    rotulo: 'teta',
    amostra: 'θ',
    latex: '\\theta',
    sinonimos: 'angulo teta',
    rapido: 'grega',
  },
  {
    gatilho: 'alpha',
    rotulo: 'alfa',
    amostra: 'α',
    latex: '\\alpha',
    rapido: 'grega',
  },
  {
    gatilho: 'beta',
    rotulo: 'beta',
    amostra: 'β',
    latex: '\\beta',
    rapido: 'grega',
  },
  {
    gatilho: 'omega',
    rotulo: 'ômega',
    amostra: 'ω',
    latex: '\\omega',
    sinonimos: 'omega frequencia angular',
    rapido: 'grega',
  },
  /*
   * `delta` é a MINÚSCULA. Ele produzia `\Delta` com rótulo "delta" e amostra
   * `Δ` — divergindo do Tab do MathLive, onde `delta` sempre foi `\delta` e a
   * maiúscula tinha entrada própria. A unificação dos catálogos é o que tornou
   * a discordância visível; escolher a minúscula segue a convenção de todo o
   * resto da lista, onde o gatilho minúsculo dá a letra minúscula.
   */
  {
    gatilho: 'delta',
    rotulo: 'delta',
    amostra: 'δ',
    latex: '\\delta',
    sinonimos: 'delta',
    rapido: 'grega',
  },
  {
    gatilho: 'Delta',
    rotulo: 'Delta maiúsculo',
    amostra: 'Δ',
    latex: '\\Delta',
    sinonimos: 'delta variacao diferenca',
    rapido: 'grega',
  },
  {
    gatilho: 'approx',
    rotulo: 'aproximadamente',
    amostra: '≈',
    latex: '\\approx',
    sinonimos: 'aproximado quase igual',
    rapido: 'operador',
  },
  {
    gatilho: 'neq',
    rotulo: 'diferente',
    amostra: '≠',
    latex: '\\neq',
    sinonimos: 'diferente nao igual',
    rapido: 'operador',
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

  /*
   * As gregas que só existiam no Tab do MathLive.
   *
   * Vinham de `ATALHOS_INLINE_GREGOS`, que era um catálogo paralelo — por isso
   * `gamma`+Tab funcionava no diálogo e `//gama` não achava nada. Entram aqui
   * embaixo, e não no meio, porque a ordem da lista é de FREQUÊNCIA: as que já
   * estavam acima são as que se usam toda semana, e empurrá-las para baixo por
   * simetria alfabética pioraria o menu para ganhar arrumação.
   */
  { gatilho: 'gamma', rotulo: 'gama', amostra: 'γ', latex: '\\gamma', rapido: 'grega' },
  { gatilho: 'epsilon', rotulo: 'épsilon', amostra: 'ε', latex: '\\epsilon', sinonimos: 'epsilon erro', rapido: 'grega' },
  { gatilho: 'lambda', rotulo: 'lambda', amostra: 'λ', latex: '\\lambda', sinonimos: 'lambda autovalor comprimento onda', rapido: 'grega' },
  { gatilho: 'mu', rotulo: 'mi', amostra: 'μ', latex: '\\mu', sinonimos: 'mu media micro', rapido: 'grega' },
  { gatilho: 'sigma', rotulo: 'sigma', amostra: 'σ', latex: '\\sigma', sinonimos: 'sigma desvio padrao tensao', rapido: 'grega' },
  { gatilho: 'phi', rotulo: 'fi', amostra: 'φ', latex: '\\phi', sinonimos: 'phi fase fluxo' },
  { gatilho: 'rho', rotulo: 'rô', amostra: 'ρ', latex: '\\rho', sinonimos: 'rho densidade resistividade' },
  { gatilho: 'tau', rotulo: 'tau', amostra: 'τ', latex: '\\tau', sinonimos: 'tau torque constante tempo' },
  { gatilho: 'eta', rotulo: 'eta', amostra: 'η', latex: '\\eta', sinonimos: 'eta rendimento eficiencia' },
  { gatilho: 'nu', rotulo: 'ni', amostra: 'ν', latex: '\\nu', sinonimos: 'nu frequencia' },
  { gatilho: 'zeta', rotulo: 'zeta', amostra: 'ζ', latex: '\\zeta', sinonimos: 'zeta amortecimento' },
  { gatilho: 'xi', rotulo: 'csi', amostra: 'ξ', latex: '\\xi', sinonimos: 'xi' },
  { gatilho: 'kappa', rotulo: 'capa', amostra: 'κ', latex: '\\kappa', sinonimos: 'kappa condutividade' },
  { gatilho: 'iota', rotulo: 'iota', amostra: 'ι', latex: '\\iota' },
  { gatilho: 'chi', rotulo: 'qui', amostra: 'χ', latex: '\\chi', sinonimos: 'chi qui quadrado' },
  { gatilho: 'psi', rotulo: 'psi', amostra: 'ψ', latex: '\\psi', sinonimos: 'psi onda' },

  /*
   * As maiúsculas que têm desenho PRÓPRIO.
   *
   * Só estas seis: `\Alpha` e `\Beta` não existem em LaTeX justamente porque
   * seriam idênticas a `A` e `B` — quem quer o A maiúsculo digita `A`.
   */
  { gatilho: 'Gamma', rotulo: 'Gama maiúsculo', amostra: 'Γ', latex: '\\Gamma' },
  { gatilho: 'Theta', rotulo: 'Teta maiúsculo', amostra: 'Θ', latex: '\\Theta' },
  { gatilho: 'Lambda', rotulo: 'Lambda maiúsculo', amostra: 'Λ', latex: '\\Lambda' },
  { gatilho: 'Sigma', rotulo: 'Sigma maiúsculo', amostra: 'Σ', latex: '\\Sigma', sinonimos: 'somatorio simbolo' },
  { gatilho: 'Phi', rotulo: 'Fi maiúsculo', amostra: 'Φ', latex: '\\Phi', sinonimos: 'phi fluxo' },
  { gatilho: 'Omega', rotulo: 'Ômega maiúsculo', amostra: 'Ω', latex: '\\Omega', sinonimos: 'ohm resistencia', rapido: 'grega' },
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
    /*
     * Prefixo comparado em minúsculas dos DOIS lados, desde que o catálogo
     * ganhou gatilhos com maiúscula (`Delta`, `Gamma`). Comparando cru,
     * `//delta` nunca alcançaria `Delta` pelo prefixo e ele ficaria enterrado
     * no fim da lista — enquanto o que se quer é justamente ver os dois lado a
     * lado e escolher. O `Tab` do MathLive segue exato: lá não há lista para
     * desempatar, então `delta` tem que dar a minúscula.
     */
    if (simbolo.gatilho.toLowerCase().startsWith(busca)) {
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

/** Os símbolos que a barra de botões do diálogo mostra, por grupo. */
export function simbolosRapidos(grupo: 'grega' | 'operador'): Simbolo[] {
  return SIMBOLOS.filter((simbolo) => simbolo.rapido === grupo)
}

/** Maior gatilho existente, para saber quanto texto olhar para trás. */
const MAIOR_GATILHO = SIMBOLOS.reduce(
  (maior, simbolo) => Math.max(maior, simbolo.gatilho.length),
  0,
)

/**
 * O símbolo que a palavra imediatamente antes do cursor nomeia.
 *
 * É o que sustenta o `Tab` do `CampoMatematico`: digitar `alpha` e apertar
 * `Tab` vira α. Recebe o TEXTO QUE ESTÁ NO CAMPO, não uma reconstrução das
 * teclas digitadas — e essa é a diferença que importa.
 *
 * ## Por que não um buffer de teclas
 *
 * A versão anterior mantinha um `bufferRef` alimentado pelo `keydown`, e ele
 * dessincronizava do campo por três caminhos, todos comuns:
 *
 * - só letras entravam e só espaço/Enter/setas zeravam, então `x+alpha`
 *   acumulava `xalpha` e não casava com nada — bastava ter digitado uma letra
 *   antes na fórmula para o atalho nunca mais funcionar;
 * - clicar para reposicionar o cursor não zerava nada, e o `deleteBackward`
 *   seguinte apagava caracteres no lugar errado, corrompendo a fórmula;
 * - `/` e `^` (os atalhos de ABNT2) inseriam sem tocar no buffer.
 *
 * Nenhum desses é um caso exótico, e a lista de exceções a tratar não fecha.
 * Lendo o campo, não há segundo estado para divergir do primeiro.
 *
 * ## Por que o MAIOR sufixo
 *
 * `x+alpha` tem que devolver `alpha`, e `Delta` tem que devolver `Delta` e não
 * `delta` — daí o casamento ser sensível à caixa e ir do mais longo para o mais
 * curto. Sem isso, `Delta` casaria com `elta`... se `elta` existisse, e é o tipo
 * de bug que só aparece quando o catálogo cresce.
 */
export function simboloPorPalavra(
  textoAntesDoCursor: string,
): Simbolo | undefined {
  // Só a cauda alfabética interessa: em `2 \frac{}{}alpha`, a palavra é `alpha`.
  const cauda = /[A-Za-z]+$/.exec(textoAntesDoCursor)?.[0]
  if (cauda === undefined) return undefined

  const limite = Math.min(cauda.length, MAIOR_GATILHO)
  for (let tamanho = limite; tamanho > 0; tamanho -= 1) {
    const candidato = cauda.slice(cauda.length - tamanho)
    const simbolo = simboloPorGatilho(candidato)
    if (simbolo) return simbolo
  }
  return undefined
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
