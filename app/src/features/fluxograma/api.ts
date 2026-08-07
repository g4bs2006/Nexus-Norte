import { supabase } from '@/lib/supabase'
import type { TablesInsert, TablesUpdate } from '@/types/database'
import type { ExcecaoRecorrencia } from '@/lib/recorrencia'

/**
 * Exceções pontuais do fluxograma semanal (resolução 10.19).
 *
 * Mora num módulo próprio, e não em `estudos` ou `treino`, porque a tabela é
 * genuinamente dos dois: `fluxograma_semanal` tem `materia_id` OU `treino_id`, e
 * `excecoes_fluxograma` referencia a regra sem saber de qual pilar ela é. Deixar
 * a escrita em `estudos` obrigaria a página de Treino a importar de lá.
 */

// --- Bloco livre / trabalho (resolução 10.48.0) ------------------------------
//
// Terceiro "dono" possível de uma linha de `fluxograma_semanal`: nenhuma
// entidade, só um rótulo. Mora aqui pelo mesmo motivo das exceções acima —
// não pertence a Estudos nem a Treino, então não pode morar em nenhum dos
// dois sem criar uma dependência cruzada.

export interface FluxogramaLivre {
  id: string
  dia_semana: number
  horario_inicio: string
  horario_fim: string
  rotulo: string
}

export async function listarFluxogramaLivre(): Promise<FluxogramaLivre[]> {
  const { data, error } = await supabase
    .from('fluxograma_semanal')
    .select('id, dia_semana, horario_inicio, horario_fim, rotulo')
    .not('rotulo', 'is', null)
    .order('dia_semana')
    .order('horario_inicio')
  if (error) throw new Error(error.message)
  return (data ?? []).map((linha) => ({ ...linha, rotulo: linha.rotulo as string }))
}

export async function criarFluxogramaLivre(
  dados: TablesInsert<'fluxograma_semanal'>,
): Promise<void> {
  const { error } = await supabase.from('fluxograma_semanal').insert(dados)
  if (error) throw new Error(error.message)
}

export async function atualizarFluxogramaLivre(
  id: string,
  dados: TablesUpdate<'fluxograma_semanal'>,
): Promise<void> {
  const { error } = await supabase
    .from('fluxograma_semanal')
    .update(dados)
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function excluirFluxogramaLivre(id: string): Promise<void> {
  const { error } = await supabase
    .from('fluxograma_semanal')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}

/**
 * Exceções que afetam o intervalo.
 *
 * Filtra por `data` **ou** `nova_data`: uma ocorrência empurrada de 31/07 para
 * 02/08 tem data original fora de agosto, e sem o segundo termo ela
 * simplesmente não apareceria ao olhar agosto.
 */
export async function listarExcecoes(
  de: string,
  ate: string,
): Promise<ExcecaoRecorrencia[]> {
  const { data, error } = await supabase
    .from('excecoes_fluxograma')
    .select(
      'fluxograma_id, data, status, nova_data, novo_horario_inicio, novo_horario_fim',
    )
    .or(
      `and(data.gte.${de},data.lte.${ate}),and(nova_data.gte.${de},nova_data.lte.${ate})`,
    )
  if (error) throw new Error(error.message)

  return (data ?? []).map((linha) => ({
    fluxograma_id: linha.fluxograma_id,
    data: linha.data,
    status: linha.status as 'cancelado' | 'remarcado',
    nova_data: linha.nova_data,
    novo_horario_inicio: linha.novo_horario_inicio,
    novo_horario_fim: linha.novo_horario_fim,
  }))
}

export interface CancelarOcorrencia {
  fluxogramaId: string
  data: string
}

export interface RemarcarOcorrencia extends CancelarOcorrencia {
  novaData: string
  /** Nulos herdam o horário do padrão. */
  novoHorarioInicio: string | null
  novoHorarioFim: string | null
}

/**
 * Cancela a ocorrência daquela data.
 *
 * `upsert` sobre `(fluxograma_id, data)`: cancelar o que já estava remarcado
 * troca o status e limpa o destino, em vez de estourar no índice único. Os
 * nulos são explícitos por isso — sem eles o `nova_data` antigo permaneceria e
 * o CHECK do banco recusaria a linha.
 */
export async function cancelarOcorrencia({
  fluxogramaId,
  data,
}: CancelarOcorrencia): Promise<void> {
  const { error } = await supabase.from('excecoes_fluxograma').upsert(
    {
      fluxograma_id: fluxogramaId,
      data,
      status: 'cancelado',
      nova_data: null,
      novo_horario_inicio: null,
      novo_horario_fim: null,
    },
    { onConflict: 'fluxograma_id,data' },
  )
  if (error) throw new Error(error.message)
}

export async function remarcarOcorrencia({
  fluxogramaId,
  data,
  novaData,
  novoHorarioInicio,
  novoHorarioFim,
}: RemarcarOcorrencia): Promise<void> {
  const { error } = await supabase.from('excecoes_fluxograma').upsert(
    {
      fluxograma_id: fluxogramaId,
      data,
      status: 'remarcado',
      nova_data: novaData,
      novo_horario_inicio: novoHorarioInicio,
      novo_horario_fim: novoHorarioFim,
    },
    { onConflict: 'fluxograma_id,data' },
  )
  if (error) throw new Error(error.message)
}

/** Desfaz a exceção: a data volta a seguir o padrão. */
export async function limparExcecao({
  fluxogramaId,
  data,
}: CancelarOcorrencia): Promise<void> {
  const { error } = await supabase
    .from('excecoes_fluxograma')
    .delete()
    .eq('fluxograma_id', fluxogramaId)
    .eq('data', data)
  if (error) throw new Error(error.message)
}
