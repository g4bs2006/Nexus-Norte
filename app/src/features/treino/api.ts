import { supabase } from '@/lib/supabase'
import type { TablesInsert, TablesUpdate } from '@/types/database'
import type {
  ExecucaoTreino,
  ExercicioTreino,
  FluxogramaTreino,
  PersonalRecord,
  RegistroCorporal,
  RegistroLesao,
  SerieExecutada,
  Treino,
} from './types'

/** Bucket definido na migration da Fase 3 (resolução 10.10). */
export const BUCKET_PROGRESSO = 'progresso-treino'

function lancarSeErro<T>(resultado: {
  data: T | null
  error: { message: string } | null
}): T {
  if (resultado.error) throw new Error(resultado.error.message)
  if (resultado.data === null) throw new Error('Consulta sem retorno')
  return resultado.data
}

// --- Treinos e exercícios ---------------------------------------------------

export async function listarTreinos(): Promise<Treino[]> {
  return lancarSeErro(await supabase.from('treinos').select('*').order('nome'))
}

export async function criarTreino(
  dados: TablesInsert<'treinos'>,
): Promise<void> {
  const { error } = await supabase.from('treinos').insert(dados)
  if (error) throw new Error(error.message)
}

export async function atualizarTreino(
  id: string,
  dados: TablesUpdate<'treinos'>,
): Promise<void> {
  const { error } = await supabase.from('treinos').update(dados).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function excluirTreino(id: string): Promise<void> {
  const { error } = await supabase.from('treinos').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function listarExercicios(): Promise<ExercicioTreino[]> {
  return lancarSeErro(
    await supabase.from('exercicios_treino').select('*').order('nome'),
  )
}

export async function criarExercicio(
  dados: TablesInsert<'exercicios_treino'>,
): Promise<void> {
  const { error } = await supabase.from('exercicios_treino').insert(dados)
  if (error) throw new Error(error.message)
}

export async function atualizarExercicio(
  id: string,
  dados: TablesUpdate<'exercicios_treino'>,
): Promise<void> {
  const { error } = await supabase.from('exercicios_treino').update(dados).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function excluirExercicio(id: string): Promise<void> {
  const { error } = await supabase
    .from('exercicios_treino')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// --- Execuções --------------------------------------------------------------

export async function listarExecucoes(
  de?: string,
  ate?: string,
): Promise<ExecucaoTreino[]> {
  let consulta = supabase.from('execucoes_treino').select('*')
  if (de) consulta = consulta.gte('data', de)
  if (ate) consulta = consulta.lte('data', ate)
  return lancarSeErro(await consulta.order('data', { ascending: false }))
}

/**
 * Cria a execução do treino e devolve seu id, para que as séries possam ser
 * anexadas em seguida.
 */
export async function iniciarExecucao(
  treinoId: string,
  data: string,
): Promise<string> {
  const { data: linha, error } = await supabase
    .from('execucoes_treino')
    .insert({ treino_id: treinoId, data })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return linha.id
}

export async function excluirExecucao(id: string): Promise<void> {
  const { error } = await supabase
    .from('execucoes_treino')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export interface NovaSerie {
  execucao_treino_id: string
  exercicio_id: string
  carga_real: number
  reps_reais: number
  rpe: number | null
}

/** Registra as séries. O PR é gravado pelo trigger no banco (plano 4.2). */
export async function registrarSeries(series: readonly NovaSerie[]): Promise<void> {
  if (series.length === 0) return
  // Cópia mutável: o insert do supabase-js não aceita array readonly
  const { error } = await supabase
    .from('execucoes_exercicio')
    .insert([...series])
  if (error) throw new Error(error.message)
}

/**
 * Séries executadas com os dados do exercício e a data da execução.
 *
 * O join é feito aqui para que os cálculos de volume e progressão recebam tudo
 * pronto e continuem sendo funções puras.
 */
export async function listarSeries(
  de?: string,
  ate?: string,
): Promise<SerieExecutada[]> {
  let consulta = supabase
    .from('execucoes_exercicio')
    .select(
      'id, exercicio_id, carga_real, reps_reais, rpe, execucoes_treino!inner(data), exercicios_treino!inner(nome, grupo_muscular)',
    )
  if (de) consulta = consulta.gte('execucoes_treino.data', de)
  if (ate) consulta = consulta.lte('execucoes_treino.data', ate)

  const { data, error } = await consulta
  if (error) throw new Error(error.message)

  return (data ?? []).map((linha) => ({
    id: linha.id,
    exercicio_id: linha.exercicio_id,
    carga_real: linha.carga_real,
    reps_reais: linha.reps_reais,
    rpe: linha.rpe,
    data: linha.execucoes_treino.data,
    grupo_muscular: linha.exercicios_treino.grupo_muscular,
    exercicio_nome: linha.exercicios_treino.nome,
  }))
}

// --- Personal records -------------------------------------------------------

export async function listarPersonalRecords(): Promise<PersonalRecord[]> {
  return lancarSeErro(
    await supabase
      .from('personal_records')
      .select('*')
      .order('created_at', { ascending: false }),
  )
}

// --- Registro corporal ------------------------------------------------------

export async function listarRegistroCorporal(): Promise<RegistroCorporal[]> {
  return lancarSeErro(
    await supabase
      .from('registro_corporal')
      .select('*')
      .order('data', { ascending: false }),
  )
}

/** Um registro por dia: reenviar no mesmo dia atualiza o existente. */
export async function salvarRegistroCorporal(
  dados: TablesInsert<'registro_corporal'>,
): Promise<void> {
  const { error } = await supabase
    .from('registro_corporal')
    .upsert(dados, { onConflict: 'data' })
  if (error) throw new Error(error.message)
}

export async function excluirRegistroCorporal(id: string): Promise<void> {
  const { error } = await supabase.from('registro_corporal').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function enviarFotoProgresso(
  data: string,
  arquivo: File,
): Promise<string> {
  const sufixo = crypto.randomUUID().slice(0, 8)
  const caminho = `${data}/${sufixo}-${arquivo.name}`
  const { error } = await supabase.storage
    .from(BUCKET_PROGRESSO)
    .upload(caminho, arquivo)
  if (error) throw new Error(error.message)
  return caminho
}

export async function urlFotoProgresso(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_PROGRESSO)
    .createSignedUrl(storagePath, 60 * 10)
  if (error) throw new Error(error.message)
  return data.signedUrl
}

// --- Lesões -----------------------------------------------------------------

export async function listarLesoes(): Promise<RegistroLesao[]> {
  return lancarSeErro(
    await supabase
      .from('registro_lesoes')
      .select('*')
      .order('data', { ascending: false }),
  )
}

export async function criarLesao(
  dados: TablesInsert<'registro_lesoes'>,
): Promise<void> {
  const { error } = await supabase.from('registro_lesoes').insert(dados)
  if (error) throw new Error(error.message)
}

export async function atualizarLesao(
  id: string,
  dados: TablesUpdate<'registro_lesoes'>,
): Promise<void> {
  const { error } = await supabase.from('registro_lesoes').update(dados).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function excluirLesao(id: string): Promise<void> {
  const { error } = await supabase.from('registro_lesoes').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// --- Fluxograma de treinos --------------------------------------------------

/** Só as entradas de treino — a tabela é compartilhada com Estudos (10.6). */
export async function listarFluxogramaTreino(): Promise<FluxogramaTreino[]> {
  const resultado = await supabase
    .from('fluxograma_semanal')
    .select('*')
    .not('treino_id', 'is', null)
    .order('dia_semana')
    .order('horario_inicio')
  return lancarSeErro(resultado) as FluxogramaTreino[]
}

export async function criarFluxogramaTreino(
  dados: TablesInsert<'fluxograma_semanal'>,
): Promise<void> {
  const { error } = await supabase.from('fluxograma_semanal').insert(dados)
  if (error) throw new Error(error.message)
}

export async function excluirFluxogramaTreino(id: string): Promise<void> {
  const { error } = await supabase.from('fluxograma_semanal').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
