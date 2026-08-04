import { supabase } from '@/lib/supabase'
import type { TablesInsert, TablesUpdate } from '@/types/database'
import type { LogProgresso, MarcoProjeto, Projeto } from './types'

function lancarSeErro<T>(resultado: {
  data: T | null
  error: { message: string } | null
}): T {
  if (resultado.error) throw new Error(resultado.error.message)
  if (resultado.data === null) throw new Error('Consulta sem retorno')
  return resultado.data
}

// --- Projetos ---------------------------------------------------------------

export async function listarProjetos(): Promise<Projeto[]> {
  const resultado = await supabase
    .from('projetos')
    .select('*')
    .order('created_at', { ascending: false })
  return lancarSeErro(resultado) as Projeto[]
}

export async function criarProjeto(
  dados: TablesInsert<'projetos'>,
): Promise<void> {
  const { error } = await supabase.from('projetos').insert(dados)
  if (error) throw new Error(error.message)
}

export async function atualizarProjeto(
  id: string,
  dados: TablesUpdate<'projetos'>,
): Promise<void> {
  const { error } = await supabase.from('projetos').update(dados).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function excluirProjeto(id: string): Promise<void> {
  const { error } = await supabase.from('projetos').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// --- Marcos -----------------------------------------------------------------

export async function listarMarcos(): Promise<MarcoProjeto[]> {
  const resultado = await supabase
    .from('marcos_projeto')
    .select('*')
    .order('created_at')
  return lancarSeErro(resultado) as MarcoProjeto[]
}

export async function criarMarco(
  dados: TablesInsert<'marcos_projeto'>,
): Promise<void> {
  const { error } = await supabase.from('marcos_projeto').insert(dados)
  if (error) throw new Error(error.message)
}

export async function atualizarMarco(
  id: string,
  dados: TablesUpdate<'marcos_projeto'>,
): Promise<void> {
  const { error } = await supabase
    .from('marcos_projeto')
    .update(dados)
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function excluirMarco(id: string): Promise<void> {
  const { error } = await supabase.from('marcos_projeto').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// --- Log de progresso -------------------------------------------------------

export async function listarLogs(): Promise<LogProgresso[]> {
  return lancarSeErro(
    await supabase
      .from('log_progresso')
      .select('*')
      .order('data', { ascending: false }),
  )
}

export async function criarLog(
  dados: TablesInsert<'log_progresso'>,
): Promise<void> {
  const { error } = await supabase.from('log_progresso').insert(dados)
  if (error) throw new Error(error.message)
}

export async function excluirLog(id: string): Promise<void> {
  const { error } = await supabase.from('log_progresso').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
