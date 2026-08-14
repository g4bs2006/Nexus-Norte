import { supabase } from '@/lib/supabase'
import type { Referencia } from '@/components/SeletorReferencia'
import { gerarSlug, removerMatematica } from './markdown'
import { planejarArestas, planejarPropagacao, planejarTopicos } from './grafo'
import type { DesenhoExportavel, NotaExportavel } from './exportacao'
import type { Json } from '@/types/database'
import type {
  AchadoNota,
  Backlink,
  Desenho,
  LinkQuebrado,
  Nota,
  NotaListada,
  Topico,
} from './types'

/**
 * `NonNullable` no retorno, e não `T`, porque `.single()` tipa `data` como já
 * nulável — sem isso o chamador teria que checar de novo o que esta função
 * acabou de garantir.
 */
function lancarSeErro<T>(resultado: {
  data: T
  error: { message: string } | null
}): NonNullable<T> {
  if (resultado.error) throw new Error(resultado.error.message)
  if (resultado.data === null || resultado.data === undefined) {
    throw new Error('Consulta sem retorno')
  }
  return resultado.data
}

function lancar(resultado: { error: { message: string } | null }): void {
  if (resultado.error) throw new Error(resultado.error.message)
}

// --- Leitura ----------------------------------------------------------------

/**
 * Colunas da nota mais o nome da matéria e os tópicos, em uma consulta só.
 *
 * O tópico é pedido atravessando `notas_topicos` explicitamente. PostgREST
 * infere o muitos-para-muitos e aceitaria só `topicos(*)`, mas a inferência
 * depende do formato da tabela de junção — e ela vai mudar quando
 * `registro_listas.topico` migrar para FK.
 */
const SELECT_LISTAGEM = '*, materias(nome), notas_topicos(topicos(*))'

type LinhaListagem = Nota & {
  materias: { nome: string } | null
  notas_topicos: { topicos: Topico | null }[] | null
}

function montarListada(linha: LinhaListagem): NotaListada {
  const { materias, notas_topicos, ...nota } = linha
  return {
    ...nota,
    materia_nome: materias?.nome ?? '—',
    topicos: (notas_topicos ?? [])
      .map((juncao) => juncao.topicos)
      .filter((topico) => topico !== null),
  }
}

/**
 * Notas da matéria, fixadas primeiro.
 *
 * A ordem é a mesma do índice: `fixada desc, atualizada_em desc`. Quem fixou
 * uma nota quer ela no topo mesmo depois de mexer em outras cinco; entre as não
 * fixadas, a que mudou por último é a que está em uso.
 */
export async function listarNotasDaMateria(
  materiaId: string,
): Promise<NotaListada[]> {
  const linhas = lancarSeErro(
    await supabase
      .from('notas_estudo')
      .select(SELECT_LISTAGEM)
      .eq('materia_id', materiaId)
      .order('fixada', { ascending: false })
      .order('atualizada_em', { ascending: false }),
  )
  return (linhas as LinhaListagem[]).map(montarListada)
}

/**
 * Índice global, sem escopo de semestre (seção 9).
 *
 * Sem ele, achar nota antiga exige lembrar em que semestre foi escrita —
 * exatamente o que ninguém lembra. O filtro por matéria, tópico e semestre é
 * feito no cliente: a base é de uma pessoa, e trazer tudo permite filtrar sem
 * ida ao servidor a cada tecla.
 */
export async function listarNotas(): Promise<NotaListada[]> {
  const linhas = lancarSeErro(
    await supabase
      .from('notas_estudo')
      .select(SELECT_LISTAGEM)
      .order('atualizada_em', { ascending: false }),
  )
  return (linhas as LinhaListagem[]).map(montarListada)
}

/** A nota da rota `/notas/:slug`. Nulo quando o slug não existe. */
export async function obterNotaPorSlug(
  slug: string,
): Promise<NotaListada | null> {
  const { data, error } = await supabase
    .from('notas_estudo')
    .select(SELECT_LISTAGEM)
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data === null ? null : montarListada(data as LinhaListagem)
}

/**
 * Quem aponta para esta nota.
 *
 * O grafo só tem valor se a volta for visível: sem backlink, um link é um beco
 * sem saída, e a nota citada nunca fica sabendo que virou referência.
 */
export async function listarBacklinks(notaId: string): Promise<Backlink[]> {
  const linhas = lancarSeErro(
    await supabase
      .from('links_nota')
      .select(
        'origem:notas_estudo!links_nota_origem_id_fkey(id, slug, titulo, materias(nome))',
      )
      .eq('destino_id', notaId),
  ) as {
    origem: {
      id: string
      slug: string
      titulo: string
      materias: { nome: string } | null
    } | null
  }[]

  return linhas
    .map((linha) => linha.origem)
    .filter((origem) => origem !== null)
    .map((origem) => ({
      id: origem.id,
      slug: origem.slug,
      titulo: origem.titulo,
      materia_nome: origem.materias?.nome ?? '—',
    }))
}

/**
 * Slugs que esta nota cita e que ainda não têm nota do outro lado.
 *
 * Não é lista de erro, é lista de próxima nota a escrever — e é assim que a
 * página apresenta (seção 6).
 */
export async function listarLinksQuebrados(
  notaId: string,
): Promise<LinkQuebrado[]> {
  const linhas = lancarSeErro(
    await supabase
      .from('links_nota')
      .select('destino_slug')
      .eq('origem_id', notaId)
      .is('destino_id', null),
  )
  return linhas.map((linha) => ({ slug: linha.destino_slug }))
}

/**
 * Notas que o `[[` pode citar, ordenadas por semelhança de título.
 *
 * Vai por RPC (`buscar_notas_por_titulo`, migration de 14/08) porque
 * `similarity()` precisa aparecer no `order by` — e PostgREST não expressa
 * isso. A regra de relevância morar no banco também garante que qualquer outro
 * consumidor ordene igual.
 *
 * Termo vazio devolve as últimas mexidas: abrir o seletor sem digitar nada tem
 * que mostrar no que se estava trabalhando, não uma lista em branco.
 */
export async function buscarReferencias(termo: string): Promise<Referencia[]> {
  if (termo.trim() === '') {
    const recentes = lancarSeErro(
      await supabase
        .from('notas_estudo')
        .select('slug, titulo, materias(nome)')
        .order('atualizada_em', { ascending: false })
        .limit(8),
    ) as { slug: string; titulo: string; materias: { nome: string } | null }[]

    return recentes.map((nota) => ({
      slug: nota.slug,
      titulo: nota.titulo,
      contexto: nota.materias?.nome ?? '—',
    }))
  }

  const achados = lancarSeErro(
    await supabase.rpc('buscar_notas_por_titulo', { termo, limite: 8 }),
  )

  return achados.map((nota) => ({
    slug: nota.slug,
    titulo: nota.titulo,
    contexto: nota.materia_nome,
  }))
}

/**
 * Busca literal no conteúdo das notas (seção 8).
 *
 * Responde "sei que anotei isso em algum lugar" — pergunta diferente da que o
 * autocomplete resolve: lá se procura a nota a CITAR, pelo nome; aqui a nota a
 * REENCONTRAR, pelo que foi escrito nela.
 *
 * O `trecho` volta com o termo entre `<<` e `>>`. Marcadores em texto, e não
 * HTML, porque quem exibe é React — receber HTML do banco só para injetar com
 * `dangerouslySetInnerHTML` seria criar um caminho de injeção onde não precisa.
 */
export async function buscarNotas(termo: string): Promise<AchadoNota[]> {
  if (termo.trim() === '') return []

  const achados = lancarSeErro(
    await supabase.rpc('buscar_notas', { termo, limite: 30 }),
  )

  return achados.map((nota) => ({
    id: nota.id,
    slug: nota.slug,
    titulo: nota.titulo,
    materia_nome: nota.materia_nome,
    trecho: nota.trecho,
  }))
}

/**
 * Um desenho pelo id que a referência `![[desenho:uuid]]` carrega.
 *
 * A leitura pede as colunas todas porque quem abre o editor precisa de `cena`,
 * e quem só lê precisa de `svg` — separar em duas consultas faria a segunda
 * acontecer sempre no clique, que é justamente quando a espera incomoda.
 */
export async function obterDesenho(id: string): Promise<Desenho | null> {
  const { data, error } = await supabase
    .from('desenhos')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

export type EntradaDesenho = {
  /** Ausente cria o desenho; presente atualiza. */
  id?: string
  notaId: string
  titulo?: string | null
  cena: Json
  svg: string
}

/**
 * Grava cena e SVG JUNTOS, sempre.
 *
 * `cena` é a fonte editável e `svg` é o render. Deixar os dois divergirem faria
 * a leitura mostrar um desenho e a edição abrir outro — e como o SVG é o que
 * sobrevive a uma troca de biblioteca e o que a exportação leva (seção 10),
 * um SVG velho é perda de dado silenciosa.
 */
export async function salvarDesenho(entrada: EntradaDesenho): Promise<string> {
  if (entrada.id) {
    lancar(
      await supabase
        .from('desenhos')
        // `atualizado_em` fica de fora: o trigger carimba.
        .update({ cena: entrada.cena, svg: entrada.svg })
        .eq('id', entrada.id),
    )
    return entrada.id
  }

  const criado = lancarSeErro(
    await supabase
      .from('desenhos')
      .insert({
        nota_id: entrada.notaId,
        cena: entrada.cena,
        svg: entrada.svg,
        ...(entrada.titulo ? { titulo: entrada.titulo } : {}),
      })
      .select('id')
      .single(),
  )
  return criado.id
}

/**
 * Tudo que a exportação precisa, em duas consultas (seção 10).
 *
 * Traz a base inteira de propósito: um dump parcial não é rede de segurança, e
 * esta é a única que o sistema tem — não há autenticação nem backup
 * (resolução 10.0).
 *
 * Do desenho vem só o `svg`, nunca a `cena`: o JSONB do Excalidraw é grande e
 * ilegível fora dele, e quem abre o `.zip` quer ver o desenho, não a estrutura
 * interna de quem o desenhou.
 */
export async function carregarParaExportar(): Promise<{
  notas: NotaExportavel[]
  desenhos: DesenhoExportavel[]
}> {
  const [linhas, desenhos] = await Promise.all([
    supabase
      .from('notas_estudo')
      .select('slug, titulo, conteudo, atualizada_em, materias(nome)')
      .order('atualizada_em', { ascending: false }),
    supabase.from('desenhos').select('id, svg'),
  ])

  const erro = linhas.error ?? desenhos.error
  if (erro) throw new Error(erro.message)

  return {
    notas: (
      (linhas.data ?? []) as {
        slug: string
        titulo: string
        conteudo: string
        atualizada_em: string
        materias: { nome: string } | null
      }[]
    ).map((nota) => ({
      slug: nota.slug,
      titulo: nota.titulo,
      conteudo: nota.conteudo,
      atualizada_em: nota.atualizada_em,
      materia_nome: nota.materias?.nome ?? 'sem-materia',
    })),
    desenhos: desenhos.data ?? [],
  }
}

export async function listarTopicos(): Promise<Topico[]> {
  return lancarSeErro(await supabase.from('topicos').select('*').order('nome'))
}

// --- Escrita ----------------------------------------------------------------

export type EntradaNota = {
  /** Ausente cria a nota; presente edita. */
  id?: string
  materiaId: string
  sessaoId?: string | null
  titulo: string
  conteudo: string
}

/**
 * O ÚNICO caminho que grava `conteudo` (spec 14/08, seção 3).
 *
 * `links_nota` e `notas_topicos` são derivados do conteúdo. Se existir qualquer
 * outro caminho que escreva a nota sem re-derivar, o grafo passa a mentir — e
 * backlink errado é pior que backlink ausente, porque parece correto. Nenhum
 * componente chama `update` em `conteudo` direto; todos passam por aqui.
 *
 * A ordem importa. Grava-se a nota primeiro para o id existir, e só depois as
 * arestas: o contrário deixaria aresta apontando para uma nota que a falha
 * seguinte impediria de nascer. Não há transação porque PostgREST não expõe
 * uma — o preço, numa base de uma pessoa, é um grafo momentaneamente
 * desatualizado, que a próxima gravação conserta.
 */
/**
 * Grava SÓ o conteúdo. Uma consulta, sem tocar no grafo.
 *
 * É o que o autosave chama a cada pausa de digitação. `salvarNota` faz ~6 idas
 * ao servidor — carrega slugs, grava, apaga e reinsere arestas, apaga e
 * reinsere tópicos, resolve pendentes — e chamar aquilo a cada 2 segundos seria
 * insustentável.
 *
 * **Só é seguro porque quem chama pergunta antes.** `grafoMudou` (puro,
 * testado) diz se o conjunto de links ou tópicos mudou; mudou, vai pelo
 * caminho completo. A invariante do spec continua de pé: o grafo é re-derivado
 * sempre que o conjunto muda. O que não acontece mais é re-derivar quando nada
 * mudou.
 *
 * O título fica de fora de propósito: renomear muda o slug e propaga escrita
 * em outras notas, e isso nunca deve acontecer a cada tecla.
 */
export async function salvarConteudo(
  id: string,
  conteudo: string,
): Promise<void> {
  lancar(
    await supabase
      .from('notas_estudo')
      // `atualizada_em` fica de fora: o trigger carimba (resolução 10.9).
      .update({ conteudo, conteudo_busca: removerMatematica(conteudo) })
      .eq('id', id),
  )
}

export async function salvarNota(entrada: EntradaNota): Promise<Nota> {
  const notas = lancarSeErro(
    await supabase.from('notas_estudo').select('id, slug, conteudo'),
  )

  const anterior = entrada.id
    ? (notas.find((nota) => nota.id === entrada.id) ?? null)
    : null

  // O próprio slug sai da lista de tomados: renomear "Limites" para "Limites"
  // não pode virar "limites-2".
  const tomados = notas
    .filter((nota) => nota.id !== entrada.id)
    .map((nota) => nota.slug)
  const slug = gerarSlug(entrada.titulo, tomados)
  const renomeou = anterior !== null && anterior.slug !== slug

  /*
   * O texto que alimenta o índice de busca (seção 8).
   *
   * Sai daqui, e não de uma expressão em SQL, porque a regra de remover
   * matemática já existe testada em `markdown.ts` e conhece cerca, código
   * inline e escape — coisas que uma regex de `$...$` no banco erraria. Só é
   * seguro porque esta função é o único caminho que grava conteúdo.
   */
  const conteudoBusca = removerMatematica(entrada.conteudo)

  const nota = entrada.id
    ? lancarSeErro(
        await supabase
          .from('notas_estudo')
          // `atualizada_em` fica de fora: o trigger carimba (resolução 10.9).
          .update({
            titulo: entrada.titulo,
            conteudo: entrada.conteudo,
            conteudo_busca: conteudoBusca,
            slug,
          })
          .eq('id', entrada.id)
          .select('*')
          .single(),
      )
    : lancarSeErro(
        await supabase
          .from('notas_estudo')
          .insert({
            materia_id: entrada.materiaId,
            titulo: entrada.titulo,
            conteudo: entrada.conteudo,
            conteudo_busca: conteudoBusca,
            slug,
            ...(entrada.sessaoId ? { sessao_id: entrada.sessaoId } : {}),
          })
          .select('*')
          .single(),
      )

  // O resolver precisa conhecer a nota recém-criada: uma nota que se cita
  // indiretamente, ou que outra acabou de citar, resolve no mesmo salvamento.
  const resolver = new Map(notas.map((item) => [item.slug, item.id]))
  // O slug antigo deixa de resolver: quem ainda o citar fica com link quebrado,
  // que é a verdade até a propagação reescrever o texto.
  if (renomeou && anterior) resolver.delete(anterior.slug)
  resolver.set(slug, nota.id)

  if (renomeou && anterior) {
    await propagarRenomeacao(anterior.slug, slug, notas, resolver)
  }

  await regravarArestas(nota.id, entrada.conteudo, resolver, slug)
  await regravarTopicos(nota.id, entrada.conteudo)
  await resolverPendentes(nota.id, slug)

  return nota
}

/**
 * Reescreve as notas que citavam o slug antigo (seção 3).
 *
 * O link é persistido por slug, não por id: id sobreviveria a renomeação de
 * graça, mas deixaria o `.md` ilegível fora do app, e portabilidade é o
 * argumento que sustenta Markdown como fonte de verdade. Este é o preço, e numa
 * base de uma pessoa é um punhado de `update`.
 */
async function propagarRenomeacao(
  de: string,
  para: string,
  notas: readonly { id: string; slug: string; conteudo: string }[],
  resolver: ReadonlyMap<string, string>,
): Promise<void> {
  const citantes = lancarSeErro(
    await supabase
      .from('links_nota')
      .select('origem_id')
      .eq('destino_slug', de),
  )

  const ids = new Set(citantes.map((linha) => linha.origem_id))
  const alvos = notas.filter((nota) => ids.has(nota.id))

  for (const reescrita of planejarPropagacao(alvos, de, para)) {
    lancar(
      await supabase
        .from('notas_estudo')
        // `conteudo_busca` acompanha SEMPRE que `conteudo` muda. Deixar de
        // fora aqui faria o índice guardar o texto com o link antigo.
        .update({
          conteudo: reescrita.conteudo,
          conteudo_busca: removerMatematica(reescrita.conteudo),
        })
        .eq('id', reescrita.id),
    )
    const slugDoCitante = alvos.find((nota) => nota.id === reescrita.id)?.slug
    await regravarArestas(reescrita.id, reescrita.conteudo, resolver, slugDoCitante)
  }
}

/**
 * Substitui as arestas de origem desta nota pelas que o conteúdo produz.
 *
 * Apaga e insere em vez de comparar antes e depois: o plano é sempre a lista
 * completa, e um diff aqui seria código a mais para o mesmo resultado — com a
 * chance extra de esquecer o caso "link removido".
 */
async function regravarArestas(
  notaId: string,
  conteudo: string,
  resolver: ReadonlyMap<string, string>,
  slugDaPropria?: string,
): Promise<void> {
  lancar(await supabase.from('links_nota').delete().eq('origem_id', notaId))

  const arestas = planejarArestas(conteudo, resolver, slugDaPropria)
  if (arestas.length === 0) return

  lancar(
    await supabase
      .from('links_nota')
      .insert(arestas.map((aresta) => ({ origem_id: notaId, ...aresta }))),
  )
}

/**
 * Substitui os tópicos da nota pelos que o conteúdo marca.
 *
 * O tópico é criado se ainda não existir — o vocabulário nasce do uso. Quem
 * cuida de "regra da cadeia" e "Regra da Cadeia" serem a mesma coisa é a
 * unicidade do slug na tabela, e é por isso que tópico é tabela e não `text[]`.
 */
async function regravarTopicos(notaId: string, conteudo: string): Promise<void> {
  lancar(await supabase.from('notas_topicos').delete().eq('nota_id', notaId))

  const citados = planejarTopicos(conteudo)
  if (citados.length === 0) return

  lancar(
    await supabase
      .from('topicos')
      .upsert(citados, { onConflict: 'slug', ignoreDuplicates: true }),
  )

  const existentes = lancarSeErro(
    await supabase
      .from('topicos')
      .select('id, slug')
      .in(
        'slug',
        citados.map((topico) => topico.slug),
      ),
  )

  lancar(
    await supabase.from('notas_topicos').insert(
      existentes.map((topico) => ({ nota_id: notaId, topico_id: topico.id })),
    ),
  )
}

/**
 * Resolve as arestas que apontavam para este slug sem nota do outro lado.
 *
 * É o fecho do ciclo do link quebrado: escrever `[[series-de-taylor]]` antes de
 * a nota existir deixa a aresta pendente, e criar a nota depois a religa
 * sozinha — sem isso, o link só funcionaria se as notas nascessem na ordem
 * certa, que não é como se estuda.
 */
async function resolverPendentes(notaId: string, slug: string): Promise<void> {
  lancar(
    await supabase
      .from('links_nota')
      .update({ destino_id: notaId })
      .eq('destino_slug', slug)
      .is('destino_id', null),
  )
}

/**
 * Fixar não passa por `salvarNota`: não toca `conteudo`, então não há o que
 * re-derivar. A regra do ponto único é sobre o conteúdo, não sobre a linha.
 */
export async function fixarNota(id: string, fixada: boolean): Promise<void> {
  lancar(await supabase.from('notas_estudo').update({ fixada }).eq('id', id))
}

/**
 * As arestas de origem somem por cascade; as que APONTAVAM para ela viram
 * `destino_id` nulo, e não desaparecem — quem a citava passa a ter um link
 * quebrado, que é a verdade: o texto ainda cita.
 */
export async function excluirNota(id: string): Promise<void> {
  lancar(await supabase.from('notas_estudo').delete().eq('id', id))
}
