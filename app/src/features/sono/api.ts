import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert } from '@/types/database'

export type RegistroSono = Tables<'registro_sono'>
export type PlanejamentoSono = Tables<'planejamento_sono'>

/**
 * Sono — schema criado na Fase 0 (plano 1.3), consumido pela Home (7.1) e pelo
 * Calendário (6.1).
 *
 * `horas_calculadas` é coluna gerada no Postgres: nunca é escrita pelo cliente.
 */

export async function registroDoDia(
  data: string,
): Promise<RegistroSono | null> {
  const { data: linha, error } = await supabase
    .from('registro_sono')
    .select('*')
    .eq('data', data)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return linha
}

export async function planejamentoDoDia(
  diaSemana: number,
): Promise<PlanejamentoSono | null> {
  const { data, error } = await supabase
    .from('planejamento_sono')
    .select('*')
    .eq('dia_semana', diaSemana)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function salvarRegistroSono(
  dados: TablesInsert<'registro_sono'>,
): Promise<void> {
  const { error } = await supabase
    .from('registro_sono')
    .upsert(dados, { onConflict: 'data' })
  if (error) throw new Error(error.message)
}

export async function excluirRegistroSono(data: string): Promise<void> {
  const { error } = await supabase.from('registro_sono').delete().eq('data', data)
  if (error) throw new Error(error.message)
}

export async function listarPlanejamentoSono(): Promise<PlanejamentoSono[]> {
  const { data, error } = await supabase
    .from('planejamento_sono')
    .select('*')
    .order('dia_semana')
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Um alvo por dia da semana — reenviar o mesmo dia atualiza o existente. */
export async function salvarPlanejamentoSono(
  dados: TablesInsert<'planejamento_sono'>,
): Promise<void> {
  const { error } = await supabase
    .from('planejamento_sono')
    .upsert(dados, { onConflict: 'dia_semana' })
  if (error) throw new Error(error.message)
}

export async function excluirPlanejamentoSono(diaSemana: number): Promise<void> {
  const { error } = await supabase
    .from('planejamento_sono')
    .delete()
    .eq('dia_semana', diaSemana)
  if (error) throw new Error(error.message)
}
