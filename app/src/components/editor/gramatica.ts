/**
 * A gramática do dialeto, num lugar só.
 *
 * ## Por que existe
 *
 * As mesmas regexes viviam DUPLICADAS em dois arquivos com donos diferentes —
 * `dialeto.ts` (o editor, que parseia e serializa) e `features/notas/markdown.ts`
 * (os extratores, que alimentam `links_nota` e `topicos`). Eram byte a byte
 * iguais, o que é pior que serem diferentes: parecia coordenação e era
 * coincidência.
 *
 * E divergiram, em comportamento e não em texto. O editor passou a produzir
 * `\[\[slug]]` e `\#topico` (o remark ESCAPA colchete e cerquilha ao serializar
 * texto solto), e os extratores seguiram procurando `[[slug]]` e `#topico` — que
 * é o que eles sempre procuraram, corretamente. Resultado medido: menção
 * inserida pelo menu sumia de `links_nota`, e tópico no começo do parágrafo
 * sumia de `topicos`. Silenciosamente, a cada nota.
 *
 * Uma gramática só é o que impede o próximo desalinhamento. Quem parseia e quem
 * extrai leem a MESMA definição, e passam a não poder divergir.
 *
 * ## Por que mora no kernel, e sem Milkdown
 *
 * `features/notas` importa daqui (feature lê kernel, é a direção permitida), e
 * `dialeto.ts` também. Se a gramática morasse em `dialeto.ts`, `markdown.ts`
 * teria de importar `@milkdown/kit/utils` para ler uma regex — arrastando o
 * editor inteiro para dentro de uma camada que hoje roda sem DOM e por isso tem
 * teste. Aqui não há import nenhum: é dado puro sobre texto.
 */

/**
 * `[[alvo]]`, `[[alvo|rótulo]]` e o embed `![[...]]`, num casamento só.
 *
 * O grupo 1 é o `!` do embed, e existe para quem lê poder separar aresta do
 * grafo (`[[nota]]`) de desenho embutido (`![[desenho:uuid]]`) sem uma segunda
 * passada.
 */
export const RE_WIKILINK = /(!?)\[\[([^[\]|\n]+)(?:\|([^[\]\n]*))?\]\]/g

/**
 * `#topico`, só no início do texto ou depois de espaço.
 *
 * O lookbehind é o que impede `http://exemplo/pagina#secao` de virar tópico —
 * âncora de URL não é vocabulário.
 *
 * Não colide com heading: `# Título` tem espaço depois do `#`, e aqui o
 * caractere seguinte é obrigatoriamente parte do tópico.
 */
export const RE_TOPICO = /(?<=^|\s)#([\p{L}\p{N}_-]+)/gu

/**
 * `desenho:uuid` — o miolo de um embed, já validado.
 *
 * Ancorada, para casar contra o alvo já extraído por `RE_WIKILINK` em vez de
 * varrer o texto de novo. Só uuid bem formado vira desenho: a referência vai
 * virar filtro numa coluna `uuid`, e um alvo torto tem que ser texto ignorado,
 * não erro de consulta.
 */
export const RE_ALVO_DESENHO =
  /^desenho:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i

/** `![[desenho:uuid]]` inteiro, para varrer o texto de uma vez. */
export const RE_DESENHO =
  /!\[\[desenho:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]\]/gi

/**
 * `==destaque==`.
 *
 * Markdown não tem cor, e é por isso que existe assim. Guardar cor exigiria
 * `<span style>`, e aí o `.md` exportado deixaria de ser Markdown legível —
 * derrubando o argumento que sustentou Milkdown, a exportação e a busca. Um
 * marca-texto resolve o caso real ("isto cai na prova") e o Obsidian já lê.
 */
export const RE_DESTAQUE = /==([^=\n]+)==/g

/**
 * Escreve um wikilink na forma canônica.
 *
 * Existe para que ninguém volte a montar a sintaxe por interpolação solta. Foi
 * assim que o menu de menções acabou inserindo `[[slug]]` como TEXTO — e texto
 * é exatamente o que o serializer escapa.
 */
export function escreverWikilink(alvo: string, rotulo?: string | null): string {
  return rotulo == null || rotulo === ''
    ? `[[${alvo}]]`
    : `[[${alvo}|${rotulo}]]`
}

/** Escreve a marcação de tópico na forma canônica. */
export function escreverTopico(slug: string): string {
  return `#${slug}`
}
