import { supabase } from '@/lib/supabase'
import type { TablesUpdate } from '@/types/database'
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
  return (resultado.data ?? []) as CategoriaMeta[]
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
    .order('criada_em', { ascending: false })
  return (resultado.data ?? []) as Meta[]
}

export async function criarMeta(dados: {
  titulo: string
  descricao?: string | null
  categoria_meta_id?: string | null
  pilar?: string | null
  data_alvo?: string | null
  no_check_diario?: boolean
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
