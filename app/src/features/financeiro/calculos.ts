import type { Categoria, PlanejamentoSemanal } from './types'

/**
 * Cálculos do Financeiro (plano, seção 2.2).
 *
 * Todas as funções aqui são PURAS: recebem dados já carregados e não tocam em
 * rede, data do sistema ou estado global. É essa separação que as torna
 * testáveis, conforme a seção 9 do plano — a data "hoje" sempre entra como
 * parâmetro, nunca é lida de dentro da função.
 */

/**
 * Resolve a meta da categoria em reais.
 *
 * `meta_tipo = 'percentual_renda'` guarda um percentual (0-100) que só vira
 * valor absoluto quando cruzado com a receita do mês (resolução 10.12).
 * Retorna `null` quando a categoria não tem meta definida.
 */
export function metaEfetiva(
  categoria: Pick<Categoria, 'meta_mensal' | 'meta_tipo'>,
  receitaDoMes: number,
): number | null {
  const { meta_mensal, meta_tipo } = categoria
  if (meta_mensal === null || meta_tipo === null) return null
  if (meta_tipo === 'valor') return meta_mensal
  return (meta_mensal / 100) * receitaDoMes
}

/**
 * Quanto ainda pode ser gasto por dia até o fim do mês, distribuindo o que
 * resta da meta total pelos dias restantes.
 *
 * `diasRestantes` inclui o dia atual e nunca é 0 (ver `diasRestantesNoMes`).
 * Retorna 0 quando a meta já estourou — nunca um valor negativo, que na UI
 * leria como "você pode gastar -R$ 50".
 */
export function gastoDisponivelGeral(
  metaTotal: number,
  gastoRealizado: number,
  diasRestantes: number,
): number {
  if (diasRestantes <= 0) return 0
  const restante = metaTotal - gastoRealizado
  if (restante <= 0) return 0
  return restante / diasRestantes
}

/**
 * Soma o que foi planejado para um dia da semana específico, no ritual de
 * domingo. Independe da meta mensal — é o outro lado do "disponível hoje"
 * exibido lado a lado na UI (plano 2.3).
 */
export function gastoDisponivelPlanejado(
  planejamentos: readonly Pick<
    PlanejamentoSemanal,
    'dia_semana' | 'valor_planejado'
  >[],
  diaSemana: number,
): number {
  return planejamentos
    .filter((p) => p.dia_semana === diaSemana)
    .reduce((total, p) => total + p.valor_planejado, 0)
}

/**
 * 🟢/🔴 do dia: comparação entre o que foi gasto e o que estava planejado
 * (plano 2.2).
 *
 * Sem planejamento para o dia, qualquer gasto conta como fora do plano — do
 * contrário um dia não planejado pareceria sempre verde.
 */
export function statusDiario(
  gastoDoDia: number,
  planejadoDoDia: number,
): 'ok' | 'risco' {
  return gastoDoDia <= planejadoDoDia ? 'ok' : 'risco'
}

/**
 * Percentual da meta mensal já consumido. Pode passar de 100 — quem trunca é
 * a UI, para que o número exato continue disponível.
 * Retorna `null` quando não há meta com que comparar.
 */
export function progressoCategoria(
  totalGasto: number,
  meta: number | null,
): number | null {
  if (meta === null || meta <= 0) return null
  return (totalGasto / meta) * 100
}

export interface EntradaRanking {
  categoria_id: string
  nome: string
  total: number
}

/** Top N categorias por valor gasto (plano 2.2). */
export function rankingGastos(
  entradas: readonly EntradaRanking[],
  limite = 5,
): EntradaRanking[] {
  return [...entradas].sort((a, b) => b.total - a.total).slice(0, limite)
}

export interface ParametrosSaldoProjetado {
  receitaDoMes: number
  gastoAteAgora: number
  /** Dia do mês já decorrido, 1-based. */
  diaAtual: number
  diasNoMes: number
}

/**
 * Projeção do saldo no fim do mês mantido o ritmo atual de gasto (plano 2.2).
 *
 * Extrapola linearmente: o gasto médio diário até aqui, aplicado a todos os
 * dias do mês. É uma projeção de ritmo, não previsão — despesas fixas
 * concentradas no início do mês inflam o resultado nos primeiros dias.
 */
export function saldoProjetadoFimMes({
  receitaDoMes,
  gastoAteAgora,
  diaAtual,
  diasNoMes,
}: ParametrosSaldoProjetado): number {
  if (diaAtual <= 0) return receitaDoMes
  const mediaDiaria = gastoAteAgora / diaAtual
  return receitaDoMes - mediaDiaria * diasNoMes
}

export interface TotaisMes {
  receita: number
  despesa: number
  saldo: number
}

/**
 * Receita e despesa do mês corrente a partir do campo-resumo
 * `total_gasto_mes`, mantido por trigger (resolução 10.9) — nenhuma agregação
 * é refeita aqui.
 */
export function totaisDoMes(categorias: readonly Categoria[]): TotaisMes {
  let receita = 0
  let despesa = 0

  for (const categoria of categorias) {
    if (categoria.natureza === 'receita') receita += categoria.total_gasto_mes
    else despesa += categoria.total_gasto_mes
  }

  return { receita, despesa, saldo: receita - despesa }
}

/**
 * Soma das metas das categorias de despesa, em reais. Base do
 * `gastoDisponivelGeral` e da barra de progresso geral do mês (plano 2.3).
 */
export function metaTotalDespesas(
  categorias: readonly Categoria[],
  receitaDoMes: number,
): number {
  return categorias
    .filter((c) => c.natureza === 'despesa')
    .reduce((total, c) => total + (metaEfetiva(c, receitaDoMes) ?? 0), 0)
}

// --- Lista de lançamentos (resolução 10.23) ---------------------------------

/** Campos de que o agrupamento depende. */
export interface LancamentoParaAgrupar {
  id: string
  data: string
  valor: number
  categoria_natureza: string
}

export interface TotaisPeriodo {
  entradas: number
  saidas: number
  /** Entradas menos saídas. Negativo significa que saiu mais do que entrou. */
  saldo: number
  quantidade: number
}

/**
 * Entradas e saídas do período.
 *
 * Somar tudo num total só misturaria salário com mercado e não responderia nada.
 * A natureza da categoria é o que separa os dois — é por isso que a consulta
 * resolve o join em vez de devolver só o `categoria_id`.
 */
export function totaisDoPeriodo(
  lancamentos: readonly LancamentoParaAgrupar[],
): TotaisPeriodo {
  let entradas = 0
  let saidas = 0

  for (const lancamento of lancamentos) {
    if (lancamento.categoria_natureza === 'receita')
      entradas += lancamento.valor
    else saidas += lancamento.valor
  }

  return {
    entradas,
    saidas,
    saldo: entradas - saidas,
    quantidade: lancamentos.length,
  }
}

export interface DiaDeLancamentos<T extends LancamentoParaAgrupar> {
  /** ISO (`YYYY-MM-DD`). */
  data: string
  lancamentos: T[]
  /** Entradas menos saídas do dia. */
  saldo: number
}

/**
 * Agrupa por dia, do mais recente para o mais antigo.
 *
 * Por dia e não por categoria porque a pergunta que a lista responde é "o que eu
 * gastei", que é cronológica — a visão por categoria já existe na grade de
 * categorias, e repeti-la aqui seria redundância.
 *
 * Dias sem lançamento não entram: aqui a ausência não é resposta, ao contrário da
 * agenda do calendário, onde "quarta está livre" informa algo.
 */
export function agruparPorDia<T extends LancamentoParaAgrupar>(
  lancamentos: readonly T[],
): DiaDeLancamentos<T>[] {
  const porData = new Map<string, T[]>()

  for (const lancamento of lancamentos) {
    const lista = porData.get(lancamento.data)
    if (lista) lista.push(lancamento)
    else porData.set(lancamento.data, [lancamento])
  }

  return [...porData.entries()]
    .map(([data, doDia]) => ({
      data,
      lancamentos: doDia,
      saldo: totaisDoPeriodo(doDia).saldo,
    }))
    .sort((a, b) => b.data.localeCompare(a.data))
}
