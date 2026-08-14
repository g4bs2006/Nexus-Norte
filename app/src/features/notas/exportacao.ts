import { extrairReferenciasDesenho, gerarSlug } from './markdown'

/**
 * Montagem do dump de notas (spec 14/08, seção 10).
 *
 * **É a única rede de segurança contra perda de dado que o sistema tem.** Não
 * há autenticação nem backup (resolução 10.0), então um `.zip` de `.md`
 * legíveis é o que faz o conteúdo sobreviver ao Nexus, ao Supabase e a uma
 * troca de editor.
 *
 * Puro e testado, como o resto da camada: quem escreve o arquivo é o navegador,
 * quem decide o que vai dentro é isto.
 */

/** Nota como a exportação precisa vê-la. */
export type NotaExportavel = {
  slug: string
  titulo: string
  conteudo: string
  materia_nome: string
  atualizada_em: string
}

/** Desenho pronto para virar arquivo. */
export type DesenhoExportavel = {
  id: string
  svg: string | null
}

/** Caminho dentro do zip e o conteúdo do arquivo. */
export type Arquivo = {
  caminho: string
  texto: string
}

/** Pasta dos SVGs, relativa à raiz do zip. */
const PASTA_DESENHOS = 'desenhos'

/**
 * Os arquivos do dump.
 *
 * Um `.md` por nota, agrupado por matéria, mais um `.svg` por desenho. A
 * referência `![[desenho:uuid]]` é trocada pelo caminho do arquivo — sem isso o
 * `.md` exportado teria um marcador opaco que nenhum editor entende, e a
 * portabilidade que justifica Markdown como fonte de verdade seria mentira.
 *
 * Cada nota ganha um cabeçalho YAML com o que o nome do arquivo não carrega.
 * É o formato que Obsidian e afins já leem, então a pasta abre em outro editor
 * sem conversão.
 */
export function montarArquivos(
  notas: readonly NotaExportavel[],
  desenhos: readonly DesenhoExportavel[],
): Arquivo[] {
  const svgPorId = new Map(
    desenhos
      .filter((desenho) => desenho.svg !== null)
      .map((desenho) => [desenho.id, desenho.svg as string]),
  )

  const arquivos: Arquivo[] = []
  const usados = new Set<string>()

  for (const nota of notas) {
    // Slug já é único global, mas a pasta da matéria entra no caminho e o
    // conjunto pasta+arquivo precisa ser único do mesmo jeito.
    const pasta = gerarSlug(nota.materia_nome)
    const caminho = `${pasta}/${nota.slug}.md`
    if (usados.has(caminho)) continue
    usados.add(caminho)

    arquivos.push({
      caminho,
      texto: montarMarkdown(nota, svgPorId),
    })
  }

  for (const desenho of desenhos) {
    if (desenho.svg === null) continue
    arquivos.push({
      caminho: `${PASTA_DESENHOS}/${desenho.id}.svg`,
      texto: desenho.svg,
    })
  }

  return arquivos
}

function montarMarkdown(
  nota: NotaExportavel,
  svgPorId: ReadonlyMap<string, string>,
): string {
  const cabecalho = [
    '---',
    `titulo: ${escaparYaml(nota.titulo)}`,
    `materia: ${escaparYaml(nota.materia_nome)}`,
    `slug: ${nota.slug}`,
    `atualizada_em: ${nota.atualizada_em}`,
    '---',
    '',
  ].join('\n')

  return cabecalho + trocarReferencias(nota.conteudo, svgPorId)
}

/**
 * Troca `![[desenho:uuid]]` pela imagem Markdown apontando para o `.svg`.
 *
 * O caminho sobe um nível porque a nota vive na pasta da matéria e os desenhos
 * ficam na raiz — um só lugar para o SVG, mesmo quando duas notas o citam.
 *
 * Referência sem SVG guardado vira comentário, e não some: o texto citava um
 * desenho, e apagar a citação esconderia a perda.
 */
export function trocarReferencias(
  conteudo: string,
  svgPorId: ReadonlyMap<string, string>,
): string {
  let saida = conteudo

  for (const id of extrairReferenciasDesenho(conteudo)) {
    const referencia = new RegExp(`!\\[\\[desenho:${id}\\]\\]`, 'gi')
    saida = svgPorId.has(id)
      ? saida.replace(referencia, `![desenho](../${PASTA_DESENHOS}/${id}.svg)`)
      : saida.replace(referencia, `<!-- desenho ${id} sem render exportado -->`)
  }
  return saida
}

/**
 * Valor de YAML entre aspas quando pode ser mal lido.
 *
 * Título com `:` é comum ("Cálculo 2: séries") e quebraria o cabeçalho — o
 * leitor entenderia `Cálculo 2` como chave.
 */
function escaparYaml(valor: string): string {
  if (!/[:#\n"']/.test(valor)) return valor
  return `"${valor.replace(/"/g, '\\"')}"`
}
