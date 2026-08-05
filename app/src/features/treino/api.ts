import { supabase } from '@/lib/supabase'
import type { TablesInsert, TablesUpdate } from '@/types/database'
import type {
  ExecucaoAberta,
  ExecucaoTreino,
  ExercicioBaseComUso,
  ExercicioComBase,
  ExercicioPulado,
  FluxogramaTreino,
  PersonalRecordComNome,
  RegistroCorporal,
  RegistroLesao,
  SerieExecutada,
  TipoTreinoComUso,
  TreinoComTipo,
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

export async function listarTreinos(): Promise<TreinoComTipo[]> {
  const { data, error } = await supabase
    .from('treinos')
    // `tipos_treino` sem `!inner`: o tipo é opcional, e `!inner` esconderia
    // treinos sem classificação
    .select('*, tipos_treino(nome)')
    .order('nome')
  if (error) throw new Error(error.message)

  return (data ?? []).map(({ tipos_treino, ...treino }) => ({
    ...treino,
    tipo_nome: tipos_treino?.nome ?? null,
  }))
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

/**
 * Exercícios dos treinos, com nome e grupo vindos da biblioteca.
 *
 * A ordenação é feita no cliente: `order` do PostgREST não alcança coluna de
 * tabela relacionada de forma confiável, e a lista é pequena.
 */
export async function listarExercicios(): Promise<ExercicioComBase[]> {
  const { data, error } = await supabase
    .from('exercicios_treino')
    .select('*, biblioteca_exercicios!inner(nome, grupo_muscular)')
  if (error) throw new Error(error.message)

  return (data ?? [])
    .map(({ biblioteca_exercicios, ...exercicio }) => ({
      ...exercicio,
      nome: biblioteca_exercicios.nome,
      grupo_muscular: biblioteca_exercicios.grupo_muscular,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome))
}

// --- Biblioteca de exercícios (resolução 10.18) -----------------------------

/**
 * Biblioteca com a contagem de usos.
 *
 * A contagem alimenta o bloqueio da exclusão: a FK é `on delete restrict`, e
 * mostrar "usado em 2 treinos" é melhor que deixar o Postgres estourar um erro
 * de constraint na cara do usuário.
 */
export async function listarBiblioteca(): Promise<ExercicioBaseComUso[]> {
  const { data, error } = await supabase
    .from('biblioteca_exercicios')
    .select('*, exercicios_treino(id)')
    .order('nome')
  if (error) throw new Error(error.message)

  return (data ?? []).map(({ exercicios_treino, ...base }) => ({
    ...base,
    usos: exercicios_treino?.length ?? 0,
  }))
}

export async function criarExercicioBase(
  dados: TablesInsert<'biblioteca_exercicios'>,
): Promise<ExercicioBaseComUso> {
  const { data, error } = await supabase
    .from('biblioteca_exercicios')
    .insert(dados)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  // Devolve o registro para o formulário poder selecioná-lo na hora
  return { ...data, usos: 0 }
}

export async function atualizarExercicioBase(
  id: string,
  dados: TablesUpdate<'biblioteca_exercicios'>,
): Promise<void> {
  const { error } = await supabase
    .from('biblioteca_exercicios')
    .update(dados)
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function excluirExercicioBase(id: string): Promise<void> {
  const { error } = await supabase
    .from('biblioteca_exercicios')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// --- Tipos de treino --------------------------------------------------------

export async function listarTiposTreino(): Promise<TipoTreinoComUso[]> {
  const { data, error } = await supabase
    .from('tipos_treino')
    .select('*, treinos(id)')
    .order('nome')
  if (error) throw new Error(error.message)

  return (data ?? []).map(({ treinos, ...tipo }) => ({
    ...tipo,
    usos: treinos?.length ?? 0,
  }))
}

export async function criarTipoTreino(
  dados: TablesInsert<'tipos_treino'>,
): Promise<TipoTreinoComUso> {
  const { data, error } = await supabase
    .from('tipos_treino')
    .insert(dados)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return { ...data, usos: 0 }
}

export async function atualizarTipoTreino(
  id: string,
  dados: TablesUpdate<'tipos_treino'>,
): Promise<void> {
  const { error } = await supabase
    .from('tipos_treino')
    .update(dados)
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function excluirTipoTreino(id: string): Promise<void> {
  const { error } = await supabase.from('tipos_treino').delete().eq('id', id)
  if (error) throw new Error(error.message)
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
  const { error } = await supabase
    .from('exercicios_treino')
    .update(dados)
    .eq('id', id)
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

/**
 * Grava uma série e devolve o id, para a UI marcá-la como salva.
 *
 * Uma série por escrita é o que permite sair do app no meio do treino sem perder
 * nada (resolução 10.21). O trigger de PR dispara aqui, então o recorde fica
 * registrado no instante em que aconteceu, não no fim da sessão.
 */
export async function salvarSerie(serie: NovaSerie): Promise<string> {
  const { data, error } = await supabase
    .from('execucoes_exercicio')
    .insert(serie)
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return data.id
}

export async function atualizarSerie(
  id: string,
  dados: Omit<NovaSerie, 'execucao_treino_id' | 'exercicio_id'>,
): Promise<void> {
  const { error } = await supabase
    .from('execucoes_exercicio')
    .update(dados)
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function excluirSerie(id: string): Promise<void> {
  const { error } = await supabase
    .from('execucoes_exercicio')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}

/**
 * A sessão aberta, se houver, com as séries já gravadas.
 *
 * O índice único do banco garante no máximo uma — então `maybeSingle` aqui é
 * afirmação, não otimismo.
 */
export async function execucaoAberta(): Promise<ExecucaoAberta | null> {
  const { data, error } = await supabase
    .from('execucoes_treino')
    .select(
      'id, treino_id, data, created_at, hora_inicio, execucoes_exercicio(id, exercicio_id, carga_real, reps_reais, rpe), execucoes_pulados(exercicio_id)',
    )
    .is('finalizado_em', null)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null

  return {
    id: data.id,
    treino_id: data.treino_id,
    data: data.data,
    created_at: data.created_at,
    hora_inicio: data.hora_inicio,
    series: data.execucoes_exercicio,
    pulados: data.execucoes_pulados.map((linha) => linha.exercicio_id),
  }
}

// --- Exercício pulado (resolução 10.22) -------------------------------------

/**
 * Marca o exercício como pulado nesta sessão.
 *
 * O gatilho no banco recusa se já houver série gravada: fez 2 de 4 não é
 * "pulado", é "fez 2 de 4", e as duas marcas juntas apareceriam no histórico como
 * feito e pulado ao mesmo tempo.
 */
export async function pularExercicio(
  execucaoId: string,
  exercicioId: string,
): Promise<void> {
  const { error } = await supabase
    .from('execucoes_pulados')
    .insert({ execucao_treino_id: execucaoId, exercicio_id: exercicioId })
  if (error) throw new Error(error.message)
}

export async function desfazerPulo(
  execucaoId: string,
  exercicioId: string,
): Promise<void> {
  const { error } = await supabase
    .from('execucoes_pulados')
    .delete()
    .eq('execucao_treino_id', execucaoId)
    .eq('exercicio_id', exercicioId)
  if (error) throw new Error(error.message)
}

/** Exercícios pulados no intervalo, com o nome resolvido pela biblioteca. */
export async function listarPulados(
  de?: string,
  ate?: string,
): Promise<ExercicioPulado[]> {
  let consulta = supabase
    .from('execucoes_pulados')
    .select(
      'execucao_treino_id, exercicio_id, execucoes_treino!inner(data), exercicios_treino!inner(exercicio_base_id, biblioteca_exercicios!inner(nome, grupo_muscular))',
    )
  if (de) consulta = consulta.gte('execucoes_treino.data', de)
  if (ate) consulta = consulta.lte('execucoes_treino.data', ate)

  const { data, error } = await consulta
  if (error) throw new Error(error.message)

  return (data ?? []).map((linha) => ({
    execucao_treino_id: linha.execucao_treino_id,
    exercicio_id: linha.exercicio_id,
    exercicio_base_id: linha.exercicios_treino.exercicio_base_id,
    exercicio_nome: linha.exercicios_treino.biblioteca_exercicios.nome,
    grupo_muscular:
      linha.exercicios_treino.biblioteca_exercicios.grupo_muscular,
  }))
}

/**
 * Grava o horário real em que a sessão aconteceu (resolução 10.23).
 *
 * Independe do horário planejado no fluxograma: planejar às 18h e treinar às 11h
 * são dois fatos, e este registra o segundo. `null` limpa o campo.
 */
export async function atualizarHoraSessao(
  id: string,
  hora: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('execucoes_treino')
    .update({ hora_inicio: hora })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function finalizarExecucao(id: string): Promise<void> {
  const { error } = await supabase
    .from('execucoes_treino')
    .update({ finalizado_em: new Date().toISOString() })
    .eq('id', id)
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
  // Join em dois níveis: a série aponta para o exercício do treino, que aponta
  // para o exercício base — de onde vêm nome e grupo (resolução 10.18)
  let consulta = supabase
    .from('execucoes_exercicio')
    // `execucao_treino_id` é o que permite agrupar as séries por sessão. Sem ele
    // as séries chegavam soltas com a data, e dois treinos no mesmo dia viravam
    // uma massa indistinguível — não há unique em (treino_id, data).
    .select(
      'id, execucao_treino_id, exercicio_id, carga_real, reps_reais, rpe, execucoes_treino!inner(data, treino_id, created_at, finalizado_em, hora_inicio), exercicios_treino!inner(exercicio_base_id, biblioteca_exercicios!inner(nome, grupo_muscular))',
    )
  if (de) consulta = consulta.gte('execucoes_treino.data', de)
  if (ate) consulta = consulta.lte('execucoes_treino.data', ate)

  const { data, error } = await consulta
  if (error) throw new Error(error.message)

  return (data ?? []).map((linha) => ({
    id: linha.id,
    execucao_treino_id: linha.execucao_treino_id,
    exercicio_id: linha.exercicio_id,
    exercicio_base_id: linha.exercicios_treino.exercicio_base_id,
    carga_real: linha.carga_real,
    reps_reais: linha.reps_reais,
    rpe: linha.rpe,
    data: linha.execucoes_treino.data,
    treino_id: linha.execucoes_treino.treino_id,
    execucao_criada_em: linha.execucoes_treino.created_at,
    execucao_finalizada_em: linha.execucoes_treino.finalizado_em,
    execucao_hora_inicio: linha.execucoes_treino.hora_inicio,
    grupo_muscular:
      linha.exercicios_treino.biblioteca_exercicios.grupo_muscular,
    exercicio_nome: linha.exercicios_treino.biblioteca_exercicios.nome,
  }))
}

// --- Personal records -------------------------------------------------------

/**
 * PRs com o nome do exercício base.
 *
 * O PR agora pertence ao exercício, não ao exercício-dentro-de-um-treino, então
 * um recorde de Supino Inclinado vale para todos os treinos que o usam.
 */
export async function listarPersonalRecords(): Promise<
  PersonalRecordComNome[]
> {
  const { data, error } = await supabase
    .from('personal_records')
    .select('*, biblioteca_exercicios!inner(nome)')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)

  return (data ?? []).map(({ biblioteca_exercicios, ...pr }) => ({
    ...pr,
    exercicio_nome: biblioteca_exercicios.nome,
  }))
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
  const { error } = await supabase
    .from('registro_corporal')
    .delete()
    .eq('id', id)
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
  const { error } = await supabase
    .from('registro_lesoes')
    .update(dados)
    .eq('id', id)
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
  const { error } = await supabase
    .from('fluxograma_semanal')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}
