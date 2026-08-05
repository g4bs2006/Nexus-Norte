import { supabase } from '@/lib/supabase'
import type {
  FonteAvaliacao,
  FonteConta,
  FonteFluxograma,
  FonteMarco,
  FontePlanejamentoSono,
} from './eventos'
import type { FonteSonoRealizado } from './carga'

/**
 * Leitura das fontes do calendário (plano 6.1).
 *
 * Nenhuma tabela nova: cada consulta lê a fonte original do pilar. Os joins com
 * `categorias` e `projetos` acontecem aqui para que o construtor de eventos
 * receba tudo pronto e continue puro.
 */

export async function avaliacoesComData(): Promise<FonteAvaliacao[]> {
  const { data, error } = await supabase
    .from('avaliacoes')
    .select('id, nome, data, nota, materia_id')
    .not('data', 'is', null)
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Aulas e treinos — a tabela é compartilhada (resolução 10.6). */
export async function fluxogramaCompleto(): Promise<FonteFluxograma[]> {
  const { data, error } = await supabase
    .from('fluxograma_semanal')
    .select(
      'id, dia_semana, horario_inicio, horario_fim, materia_id, treino_id',
    )
    .order('dia_semana')
  if (error) throw new Error(error.message)
  return data ?? []
}

/**
 * Reexporta a leitura compartilhada (resolução 10.19).
 *
 * Antes havia duas implementações da mesma consulta, e esta ignorava as colunas
 * de destino da remarcação — o calendário mostraria a ocorrência remarcada
 * ainda no dia antigo.
 */
export { listarExcecoes as excecoesNoIntervalo } from '@/features/fluxograma/api'

/**
 * Lançamentos com o tipo e a natureza da categoria, para que o construtor
 * consiga isolar as despesas fixas (contas a pagar).
 */
export async function lancamentosParaContas(): Promise<FonteConta[]> {
  const { data, error } = await supabase
    .from('lancamentos')
    // categoria_id vem junto para o evento saber para onde navegar ao ser clicado
    .select(
      'id, descricao, valor, data, data_vencimento, categoria_id, categorias!inner(tipo, natureza)',
    )
  if (error) throw new Error(error.message)

  return (data ?? []).map((linha) => ({
    id: linha.id,
    descricao: linha.descricao,
    valor: linha.valor,
    data: linha.data,
    data_vencimento: linha.data_vencimento,
    categoria_id: linha.categoria_id,
    categoria_tipo: linha.categorias.tipo,
    categoria_natureza: linha.categorias.natureza,
  }))
}

export async function planejamentoSono(): Promise<FontePlanejamentoSono[]> {
  const { data, error } = await supabase
    .from('planejamento_sono')
    .select('id, dia_semana, hora_dormir_alvo, hora_acordar_alvo')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function marcosComData(): Promise<FonteMarco[]> {
  const { data, error } = await supabase
    .from('marcos_projeto')
    .select('id, nome, data_prevista, projeto_id, projetos!inner(nome)')
    .not('data_prevista', 'is', null)
  if (error) throw new Error(error.message)

  return (data ?? []).map((linha) => ({
    id: linha.id,
    nome: linha.nome,
    data_prevista: linha.data_prevista,
    projeto_id: linha.projeto_id,
    projeto_nome: linha.projetos.nome,
  }))
}

/**
 * Sono realizado no intervalo, para a faixa de carga cruzar carga com
 * recuperação. `horas_calculadas` é coluna gerada — o cálculo que atravessa a
 * meia-noite já está no banco.
 */
export async function sonoRealizado(
  de: string,
  ate: string,
): Promise<FonteSonoRealizado[]> {
  const { data, error } = await supabase
    .from('registro_sono')
    .select('data, horas_calculadas')
    .gte('data', de)
    .lte('data', ate)
  if (error) throw new Error(error.message)
  return data ?? []
}

/**
 * Pares `fluxograma_id@data` concluídos no intervalo.
 *
 * Presença = concluído (resolução 10.15). A faixa usa para marcar o dia em que a
 * rotina estava prevista e o check não saiu.
 */
export async function conclusoesNoIntervalo(
  de: string,
  ate: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('conclusoes_fluxograma')
    .select('fluxograma_id, data')
    .gte('data', de)
    .lte('data', ate)
  if (error) throw new Error(error.message)
  return (data ?? []).map((linha) => `${linha.fluxograma_id}@${linha.data}`)
}

export async function nomesMaterias(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from('materias').select('id, nome')
  if (error) throw new Error(error.message)
  return new Map((data ?? []).map((linha) => [linha.id, linha.nome]))
}

export async function nomesTreinos(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from('treinos').select('id, nome')
  if (error) throw new Error(error.message)
  return new Map((data ?? []).map((linha) => [linha.id, linha.nome]))
}
