import type { CategoriaMeta, Meta } from './types'

/**
 * Ordenação e agrupamento de metas. Funções puras (mesma convenção de
 * `financeiro/calculos.ts` e `projetos/calculos.ts`).
 *
 * **Por que mover é uma função pura e não um handler de arrasto.** A primeira
 * versão desta feature reordenava por HTML5 drag-and-drop — `draggable`,
 * `onDragStart`, `onDrop`. Esses eventos não disparam no toque, e o app é feito
 * pra rodar no bolso (plano, seção 8): a reordenação simplesmente não existia no
 * celular, que é onde a Home mais é usada. Mover por ação explícita ("mover para
 * cima", "mover para categoria") funciona igual nos dois lados, é alcançável por
 * teclado, e a lógica sai do componente para cá, onde dá pra testar.
 *
 * **`ordem` é escopada por categoria.** O valor só tem significado entre metas da
 * mesma categoria; comparar `ordem` de metas de categorias diferentes não quer
 * dizer nada. Toda função aqui renumera a categoria inteira de 0 a n-1 em vez de
 * trocar dois valores: metas antigas nasceram todas com `ordem = 0` (a criação
 * nunca preencheu o campo), e trocar dois zeros não move nada. Renumerar
 * normaliza esse legado no primeiro movimento.
 */

/** Uma atualização de posição pronta para `reordenarMetas`. */
export interface AtualizacaoOrdem {
  id: string
  ordem: number
  /** Só vai quando a meta troca de categoria — evita reescrever o campo à toa. */
  categoria_meta_id?: string | null
}

/** Chave do grupo das metas sem categoria. */
export const SEM_CATEGORIA = 'sem_categoria'

export interface GrupoMetas {
  /** `null` no grupo das metas sem categoria. */
  categoria: CategoriaMeta | null
  metas: Meta[]
}

function ordenar(metas: Meta[]): Meta[] {
  return [...metas].sort(
    (a, b) => a.ordem - b.ordem || a.criada_em.localeCompare(b.criada_em),
  )
}

/** Metas de uma categoria (ou sem categoria, com `null`), na ordem de exibição. */
export function metasDaCategoria(
  metas: Meta[],
  categoriaId: string | null,
): Meta[] {
  return ordenar(metas.filter((m) => (m.categoria_meta_id ?? null) === categoriaId))
}

/**
 * Agrupa metas por categoria, na ordem das categorias, com as sem categoria por
 * último.
 *
 * Categorias vazias entram no resultado: o grupo vazio é o que dá ao usuário um
 * destino visível para mover uma meta — sem ele a categoria recém-criada fica
 * invisível e inalcançável.
 */
export function agruparPorCategoria(
  metas: Meta[],
  categorias: CategoriaMeta[],
): GrupoMetas[] {
  const ordenadas = [...categorias].sort(
    (a, b) => a.ordem - b.ordem || a.criada_em.localeCompare(b.criada_em),
  )

  const grupos: GrupoMetas[] = ordenadas.map((categoria) => ({
    categoria,
    metas: metasDaCategoria(metas, categoria.id),
  }))

  const soltas = metasDaCategoria(metas, null)
  if (soltas.length > 0) grupos.push({ categoria: null, metas: soltas })

  return grupos
}

/** Posição da meta dentro da própria categoria — alimenta o estado do menu. */
export function posicaoNaCategoria(
  metas: Meta[],
  metaId: string,
): { indice: number; total: number } {
  const meta = metas.find((m) => m.id === metaId)
  if (!meta) return { indice: -1, total: 0 }

  const irmas = metasDaCategoria(metas, meta.categoria_meta_id ?? null)
  return {
    indice: irmas.findIndex((m) => m.id === metaId),
    total: irmas.length,
  }
}

/** Renumera uma lista já ordenada, emitindo só o que mudou de valor. */
function renumerar(
  lista: Meta[],
  categoriaId?: string | null,
): AtualizacaoOrdem[] {
  return lista.flatMap((meta, indice) => {
    const trocaDeCategoria =
      categoriaId !== undefined && (meta.categoria_meta_id ?? null) !== categoriaId

    if (meta.ordem === indice && !trocaDeCategoria) return []

    return [
      trocaDeCategoria
        ? { id: meta.id, ordem: indice, categoria_meta_id: categoriaId ?? null }
        : { id: meta.id, ordem: indice },
    ]
  })
}

/**
 * Move a meta uma posição para cima (`-1`) ou para baixo (`1`) dentro da própria
 * categoria.
 *
 * Devolve `[]` quando a meta já está na ponta — o chamador desabilita a ação em
 * vez de gravar um movimento que não move nada.
 */
export function moverNaCategoria(
  metas: Meta[],
  metaId: string,
  direcao: -1 | 1,
): AtualizacaoOrdem[] {
  const meta = metas.find((m) => m.id === metaId)
  if (!meta) return []

  const irmas = metasDaCategoria(metas, meta.categoria_meta_id ?? null)
  const de = irmas.findIndex((m) => m.id === metaId)
  const para = de + direcao
  if (de === -1 || para < 0 || para >= irmas.length) return []

  const aqui = irmas[de]
  const ali = irmas[para]
  if (!aqui || !ali) return []

  const reordenadas = [...irmas]
  reordenadas[de] = ali
  reordenadas[para] = aqui

  return renumerar(reordenadas)
}

/**
 * Move a meta direto para o topo ou o fim da própria categoria.
 *
 * `moverNaCategoria` já resolve subir/descer um passo, mas levar uma meta do
 * fim ao topo de uma categoria longa exigiria repetir esse passo N vezes — um
 * clique por posição. Isso pula direto para a ponta.
 *
 * Devolve `[]` quando a meta já está na ponta pedida, mesma convenção de
 * `moverNaCategoria`.
 */
export function moverParaExtremo(
  metas: Meta[],
  metaId: string,
  extremo: 'topo' | 'fim',
): AtualizacaoOrdem[] {
  const meta = metas.find((m) => m.id === metaId)
  if (!meta) return []

  const irmas = metasDaCategoria(metas, meta.categoria_meta_id ?? null)
  const de = irmas.findIndex((m) => m.id === metaId)
  if (de === -1) return []

  const para = extremo === 'topo' ? 0 : irmas.length - 1
  if (de === para) return []

  const reordenadas = [...irmas]
  reordenadas.splice(de, 1)
  reordenadas.splice(para, 0, meta)

  return renumerar(reordenadas)
}

/**
 * Move a meta para outra categoria (`null` = sem categoria), no fim da lista de
 * destino.
 *
 * Vai para o fim, e não para o começo, porque a lista é lida de cima pra baixo
 * como ordem de prioridade: uma meta que acabou de chegar na categoria não é
 * automaticamente a mais importante dela.
 *
 * Renumera **as duas** categorias: a de origem fica com um buraco na sequência,
 * e deixar o buraco faz o próximo movimento parecer que não fez nada.
 */
export function moverParaCategoria(
  metas: Meta[],
  metaId: string,
  destinoId: string | null,
): AtualizacaoOrdem[] {
  const meta = metas.find((m) => m.id === metaId)
  if (!meta) return []

  const origemId = meta.categoria_meta_id ?? null
  if (origemId === destinoId) return []

  const origem = metasDaCategoria(metas, origemId).filter((m) => m.id !== metaId)
  const destino = [...metasDaCategoria(metas, destinoId), meta]

  return [...renumerar(origem), ...renumerar(destino, destinoId)]
}
