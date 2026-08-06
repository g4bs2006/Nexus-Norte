import { supabase } from '@/lib/supabase'
import type { TablesInsert, TablesUpdate } from '@/types/database'
import type { Meta, MetaCheckin } from './types'

function lancarSeErro<T>(resultado: {
  data: T | null
  error: { message: string } | null
}): T {
  if (resultado.error) throw new Error(resultado.error.message)
  if (resultado.data === null) throw new Error('Consulta sem retorno')
  return resultado.data
}

// --- Metas --------------------------------------------------------------

export async function listarMetas(): Promise<Meta[]> {
  const resultado = await supabase
    .from('metas')
    .select('*')
    .order('criada_em', { ascending: false })
  return lancarSeErro(resultado) as Meta[]
}

export async function criarMeta(dados: TablesInsert<'metas'>): Promise<void> {
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

export async function excluirMeta(id: string): Promise<void> {
  const { error } = await supabase.from('metas').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/**
 * Progresso calculado no banco. Só retorna número para meta numérica com
 * link de pilar; para as demais o RPC devolve `null` (ver progresso_meta()).
 */
export async function progressoMeta(metaId: string): Promise<number | null> {
  const { data, error } = await supabase.rpc('progresso_meta', {
    p_meta_id: metaId,
  })
  if (error) throw new Error(error.message)
  return data
}

// --- Check-ins de hábito --------------------------------------------------

export async function listarCheckins(metaId: string): Promise<MetaCheckin[]> {
  const resultado = await supabase
    .from('metas_checkins')
    .select('*')
    .eq('meta_id', metaId)
    .order('data', { ascending: false })
  return lancarSeErro(resultado) as MetaCheckin[]
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
