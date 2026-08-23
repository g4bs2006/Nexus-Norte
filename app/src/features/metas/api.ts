import { supabase } from '@/lib/supabase'
import type { TablesUpdate } from '@/types/database'
import type { AtualizacaoOrdem } from './ordenacao'
import type { CategoriaMeta, Meta, MetaCheckin } from './types'

function lancarSeErro<T>(resultado: {
  data: T | null
  error: { message: string } | null
}): T {
  if (resultado.error) throw new Error(resultado.error.message)
  if (resultado.data === null) throw new Error('Consulta sem retorno')
  return resultado.data
}

// --- Categorias de Metas ----------------------------------------------------

export async function listarCategoriasMetas(): Promise<CategoriaMeta[]> {
  const resultado = await supabase
    .from('categorias_metas')
    .select('*')
    .order('ordem', { ascending: true })
    .order('criada_em', { ascending: true })
  return lancarSeErro(resultado) as CategoriaMeta[]
}

export async function criarCategoriaMeta(dados: {
  nome: string
  cor?: string
  ordem?: number
}): Promise<CategoriaMeta> {
  const resultado = await supabase
    .from('categorias_metas')
    .insert(dados)
    .select()
    .single()
  return lancarSeErro(resultado) as CategoriaMeta
}

export async function atualizarCategoriaMeta(
  id: string,
  dados: { nome?: string; cor?: string; ordem?: number },
): Promise<void> {
  const { error } = await supabase
    .from('categorias_metas')
    .update(dados)
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function excluirCategoriaMeta(id: string): Promise<void> {
  const { error } = await supabase
    .from('categorias_metas')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// --- Metas ------------------------------------------------------------------

export async function listarMetas(): Promise<Meta[]> {
  const resultado = await supabase
    .from('metas')
    .select('*')
    .order('ordem', { ascending: true })
    .order('criada_em', { ascending: true })
  return lancarSeErro(resultado) as Meta[]
}

/**
 * Grava as novas posições calculadas em `ordenacao.ts`.
 *
 * `Promise.all` é seguro aqui porque cada item toca uma linha diferente, mas o
 * cliente do Supabase **não rejeita** em erro de update — devolve `{ error }`. A
 * versão anterior descartava esses objetos e um reorder recusado pelo banco
 * passava por bem-sucedido: a lista voltava ao lugar no próximo refetch, sem
 * nenhum aviso.
 */
export async function reordenarMetas(
  itens: AtualizacaoOrdem[],
): Promise<void> {
  if (itens.length === 0) return

  const resultados = await Promise.all(
    itens.map((item) => {
      const payload: { ordem: number; categoria_meta_id?: string | null } = {
        ordem: item.ordem,
      }
      if (item.categoria_meta_id !== undefined) {
        payload.categoria_meta_id = item.categoria_meta_id
      }
      return supabase.from('metas').update(payload).eq('id', item.id)
    }),
  )

  const falha = resultados.find((resultado) => resultado.error)
  if (falha?.error) throw new Error(falha.error.message)
}

/**
 * `ordem` vem do chamador porque a posição é relativa à categoria escolhida, e
 * só o cliente já tem a lista em mão para saber onde é o fim dela. Sem isso a
 * meta nasce com o default do banco (`0`) e aparece empatada com a primeira da
 * categoria, em posição imprevisível.
 */
export async function criarMeta(dados: {
  titulo: string
  descricao?: string | null
  categoria_meta_id?: string | null
  pilar?: string | null
  data_alvo?: string | null
  no_check_diario?: boolean
  ordem?: number
}): Promise<void> {
  const { error } = await supabase.from('metas').insert(dados)
  if (error) throw new Error(error.message)
}

export async function atualizarMeta(
  id: string,
  dados: TablesUpdate<'metas'>,
): Promise<void> {
  const { error } = await supabase.from('metas').update(dados).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function encerrarMeta(id: string): Promise<void> {
  const { error } = await supabase
    .from('metas')
    .update({ concluida: true, concluida_em: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function excluirMeta(id: string): Promise<void> {
  const { error } = await supabase.from('metas').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// --- Check-ins Diários ----------------------------------------------------

export async function listarCheckins(metaId: string): Promise<MetaCheckin[]> {
  const resultado = await supabase
    .from('metas_checkins')
    .select('*')
    .eq('meta_id', metaId)
    .order('data', { ascending: false })
  return (resultado.data ?? []) as MetaCheckin[]
}

export async function listarCheckinsDoDia(
  data: string,
): Promise<MetaCheckin[]> {
  const resultado = await supabase
    .from('metas_checkins')
    .select('*')
    .eq('data', data)
  return (resultado.data ?? []) as MetaCheckin[]
}

export async function alternarCheckin(
  metaId: string,
  data: string,
  feito: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('metas_checkins')
    .upsert({ meta_id: metaId, data, feito }, { onConflict: 'meta_id,data' })
  if (error) throw new Error(error.message)
}
