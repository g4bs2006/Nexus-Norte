import { supabase } from '@/lib/supabase'
import { listarEventosFinanceiros, listarLancamentosCaixa, listarCartoes } from '@/features/financeiro/caixa-api'
import { pendenciasEventos } from '../../../supabase/functions/_shared/eventos-financeiros'
import type {
  FonteAtividade,
  FonteAvaliacao,
  FonteConta,
  FonteExecucaoTreino,
  FonteFluxograma,
  FonteMarco,
  FontePlanejamentoSono,
  FonteSessaoEstudo,
  FonteSessaoPlanejada,
  FonteTreinoAgendado,
} from './eventos'
import type { FonteSonoRealizado } from './carga'

/**
 * Leitura das fontes do calendário (plano 6.1).
 *
 * Nenhuma tabela nova: cada consulta lê a fonte original do pilar. Os joins com
 * `categorias` e `projetos` acontecem aqui para que o construtor de eventos
 * receba tudo pronto e continue puro.
 */

/**
 * Entregas do intervalo. Diferente de `avaliacoesComData`, filtra por data em
 * vez de trazer tudo: `data_entrega` é `not null`, então a lista inteira
 * cresceria sem teto ao longo dos semestres.
 */
export async function atividadesNoIntervalo(
  de: string,
  ate: string,
): Promise<FonteAtividade[]> {
  const { data, error } = await supabase
    .from('atividades')
    .select('id, titulo, data_entrega, hora_entrega, concluida_em, materia_id')
    .gte('data_entrega', de)
    .lte('data_entrega', ate)
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function avaliacoesComData(): Promise<FonteAvaliacao[]> {
  const { data, error } = await supabase
    .from('avaliacoes')
    .select('id, nome, data, nota, materia_id')
    .not('data', 'is', null)
  if (error) throw new Error(error.message)
  return data ?? []
}

/**
 * Aulas e blocos de trabalho/rótulo livre **recorrentes** — a tabela é
 * compartilhada (resolução 10.6, 10.48.0).
 *
 * Treino não lê mais daqui (chat 2026-08-14): ver `treinosAgendadosNoIntervalo`.
 * Bloco avulso (data própria) também não: `.is('data', null)` deixa aqui só o
 * padrão semanal — ver `fluxogramaAvulsoNoIntervalo` (chat 2026-09-02).
 */
export async function fluxogramaCompleto(): Promise<FonteFluxograma[]> {
  const { data, error } = await supabase
    .from('fluxograma_semanal')
    .select('id, dia_semana, horario_inicio, horario_fim, materia_id, rotulo')
    .is('data', null)
    .order('dia_semana')
  if (error) throw new Error(error.message)
  return data ?? []
}

/**
 * Reexporta a leitura do bloco avulso (chat 2026-09-02) — mesmo motivo de
 * `excecoesNoIntervalo`: a tabela é do fluxograma, duplicar a query aqui só
 * criaria uma segunda fonte de verdade.
 */
export { listarBlocoAvulso as fluxogramaAvulsoNoIntervalo } from '@/features/fluxograma/api'

/**
 * Reexporta a leitura compartilhada (resolução 10.19).
 *
 * Antes havia duas implementações da mesma consulta, e esta ignorava as colunas
 * de destino da remarcação — o calendário mostraria a ocorrência remarcada
 * ainda no dia antigo.
 */
export { listarExcecoes as excecoesNoIntervalo } from '@/features/fluxograma/api'

/**
 * Reexporta a leitura do módulo `eventos` (resolução "criar eventos",
 * ago/2026). O shape já bate com `FonteEventoLivre`; duplicar a query aqui
 * só criaria duas fontes de verdade para a mesma tabela.
 */
export { listarEventosLivres as eventosLivresNoIntervalo } from '@/features/eventos/api'

/**
 * Lançamentos com o tipo e a natureza da categoria, para que o construtor
 * consiga isolar as despesas fixas (contas a pagar).
 */
export async function lancamentosParaContas(de: string, ate: string): Promise<FonteConta[]> {
  const [eventos, lancamentos, cartoes] = await Promise.all([listarEventosFinanceiros(), listarLancamentosCaixa(ate), listarCartoes()])
  const pendentes: FonteConta[] = pendenciasEventos(eventos, lancamentos, de, ate).map(o => ({ id: `${o.evento_id}:${o.data}`, descricao: o.descricao, valor: o.valor, data: o.data, data_vencimento: o.data, categoria_id: o.categoria_id, categoria_tipo: 'fixo', categoria_natureza: o.categoria_natureza }))
  const faturas = new Map<string, FonteConta>()
  for (const l of lancamentos) {
    if (!l.cartao_id || l.data_caixa < de || l.data_caixa > ate || l.categoria_natureza !== 'despesa') continue
    const chave = `${l.cartao_id}:${l.data_caixa}`
    const anterior = faturas.get(chave)
    if (anterior) anterior.valor += l.valor
    else faturas.set(chave, { id: `fatura:${chave}`, descricao: `Fatura · ${cartoes.find(c => c.id === l.cartao_id)?.nome ?? 'Cartão'}`, valor: l.valor, data: l.data_caixa, data_vencimento: l.data_caixa, categoria_id: l.categoria_id, categoria_tipo: 'fixo', categoria_natureza: 'despesa' })
  }
  return [...pendentes, ...faturas.values()]
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

/**
 * Treinos realizados no intervalo (resolução 10.31).
 *
 * `hora_inicio` e `duracao_minutos` vêm porque são informados pelo usuário;
 * `finalizado_em` vem só para distinguir sessão concluída de abandonada. O filtro
 * de finalizada fica no construtor de eventos, junto da regra que a explica.
 */
export async function execucoesTreinoNoIntervalo(
  de: string,
  ate: string,
): Promise<FonteExecucaoTreino[]> {
  const { data, error } = await supabase
    .from('execucoes_treino')
    .select('id, treino_id, data, finalizado_em, hora_inicio, duracao_minutos')
    .gte('data', de)
    .lte('data', ate)
  if (error) throw new Error(error.message)
  return data ?? []
}

/**
 * Treinos agendados no intervalo (chat 2026-08-14) — cada linha já tem a
 * própria data, sem regra semanal para expandir.
 */
export async function treinosAgendadosNoIntervalo(
  de: string,
  ate: string,
): Promise<FonteTreinoAgendado[]> {
  const { data, error } = await supabase
    .from('treinos_agendados')
    .select('id, treino_id, data, horario_inicio, horario_fim')
    .gte('data', de)
    .lte('data', ate)
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Sessões de estudo registradas no intervalo (resolução 10.31). */
export async function sessoesEstudoNoIntervalo(
  de: string,
  ate: string,
): Promise<FonteSessaoEstudo[]> {
  const { data, error } = await supabase
    .from('sessoes_estudo')
    .select('id, materia_id, data, hora_inicio, duracao_minutos')
    .gte('data', de)
    .lte('data', ate)
  if (error) throw new Error(error.message)
  return data ?? []
}

/**
 * Sessões de estudo planejadas no intervalo (chat 2026-08-14) — cada linha já
 * tem a própria data, sem regra semanal para expandir.
 */
export async function sessoesEstudoPlanejadasNoIntervalo(
  de: string,
  ate: string,
): Promise<FonteSessaoPlanejada[]> {
  const { data, error } = await supabase
    .from('sessoes_estudo_planejadas')
    .select('id, materia_id, data, hora_inicio, duracao_minutos')
    .gte('data', de)
    .lte('data', ate)
  if (error) throw new Error(error.message)
  return data ?? []
}

/** O que o calendário precisa saber de uma matéria. */
export interface MateriaCalendario {
  nome: string
  /**
   * Hex da paleta fixa (`lib/cores.ts`), ou nulo para cair na cor da camada.
   * É o que faz cada matéria se distinguir das outras dentro de "estudos" —
   * sem ela, aula de Cálculo e aula de Física têm a mesma cor.
   */
  cor: string | null
  /** Início/fim das aulas, para restringir a ocorrência ao período (06/08). */
  data_inicio: string | null
  data_fim: string | null
}

/**
 * Uma leitura só de `materias` para o calendário.
 *
 * Eram duas funções (`nomesMaterias` e `periodoMaterias`) batendo na mesma
 * tabela para colher colunas diferentes. Quando a `cor` entrou no jogo, manter
 * o padrão significaria uma terceira leitura da mesma tabela — então as três
 * viraram esta, e quem consome fatia nos mapas que precisar (ver `hooks.ts`).
 */
export async function materiasDoCalendario(): Promise<
  Map<string, MateriaCalendario>
> {
  const { data, error } = await supabase
    .from('materias')
    .select('id, nome, cor, data_inicio, data_fim')
  if (error) throw new Error(error.message)
  return new Map(
    (data ?? []).map((linha) => [
      linha.id,
      {
        nome: linha.nome,
        cor: linha.cor,
        data_inicio: linha.data_inicio,
        data_fim: linha.data_fim,
      },
    ]),
  )
}

export async function nomesTreinos(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from('treinos').select('id, nome')
  if (error) throw new Error(error.message)
  return new Map((data ?? []).map((linha) => [linha.id, linha.nome]))
}
