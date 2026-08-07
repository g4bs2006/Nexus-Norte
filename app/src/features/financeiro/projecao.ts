import { addMonths, startOfMonth } from 'date-fns'
import { deISO, mesDeISO, paraISO } from '@/lib/datas'
import { expandirRecorrenciaMensal } from '@/lib/recorrencia'
import type { NaturezaCategoria } from './types'
import type { CompraParcelada, CompromissoRecorrente } from './types'

/**
 * Motor de projeção financeira (resoluções 10.43/10.44).
 *
 * Funções puras, no mesmo espírito de `calculos.ts`: a data "hoje" e todos os
 * dados já carregados entram por parâmetro, nada de rede ou `new Date()`
 * dentro. É o que torna o simulador da 10.44 possível — ele roda esta função
 * duas vezes em estado local, sem tocar no Supabase.
 */

export interface CompromissoDetalhado extends CompromissoRecorrente {
  categoria_natureza: NaturezaCategoria
}

export interface ParceladaDetalhada extends CompraParcelada {
  categoria_natureza: NaturezaCategoria
}

export interface LancamentoParaProjecao {
  valor: number
  data: string
  categoria_natureza: NaturezaCategoria
}

export interface ParcelaExpandida {
  compra_id: string
  numero: number
  valor: number
  /** Primeiro dia do mês em que a parcela cai, ISO. */
  mes: string
}

export interface ProjecaoMensal {
  /** Primeiro dia do mês, ISO — mesma convenção de `ultimosMeses`. */
  mes: string
  receitaPrevista: number
  /** Fixos recorrentes + parcelas do mês. */
  comprometido: number
  /** Média histórica das categorias de despesa variável. */
  variavelEstimado: number
  saldoDoMes: number
  saldoAcumulado: number
  /**
   * Transparência sobre a origem do número — a UI nunca apresenta estimativa
   * como fato (tracejado no gráfico, texto de rodapé na tabela).
   */
  fonte: 'real' | 'projetado'
}

export interface ParametrosProjecao {
  /** ISO. Define o mês corrente — tudo antes dele é 'real'. */
  hoje: string
  /** Quantidade de meses no resultado, a partir do mês corrente (inclusive). */
  meses: number
  compromissos: readonly CompromissoDetalhado[]
  parcelas: readonly ParceladaDetalhada[]
  /** Lançamentos do mês corrente — meses passados não entram no resultado. */
  lancamentosRealizados: readonly LancamentoParaProjecao[]
  /** categoria_id → média mensal dos últimos meses (só despesas variáveis). */
  mediaVariavelPorCategoria: Record<string, number>
  /** Primeiro dia do mês (ISO) → valor. Resolve renda variável sem inventar
   *  um compromisso recorrente falso (13º, férias, bônus). */
  receitaSobrescrita?: Record<string, number>
  /** Usada pelo simulador (10.44): soma-se às parcelas reais nesta execução. */
  compraHipotetica?: ParceladaDetalhada
}

function somaPorNatureza(
  lancamentos: readonly LancamentoParaProjecao[],
  natureza: NaturezaCategoria,
): number {
  return lancamentos
    .filter((l) => l.categoria_natureza === natureza)
    .reduce((total, l) => total + l.valor, 0)
}

/**
 * Calcula o valor de cada parcela de uma compra.
 *
 * Sem juros (padrão do cartão brasileiro): divisão simples com o resto de
 * centavo absorvido **inteiro na última parcela** — nunca um arredondamento
 * espalhado que faz a soma das parcelas divergir do total.
 *
 * Com juros: PMT padrão (`PV × i / (1 − (1+i)^-n)`), parcelas iguais.
 */
export function calcularParcelas(
  compra: ParceladaDetalhada,
): ParcelaExpandida[] {
  const { id, valor_total, numero_parcelas, data_primeira_parcela, juros_mensal } =
    compra
  const dataBase = deISO(data_primeira_parcela)

  let valores: number[]
  if (juros_mensal <= 0) {
    const base = Math.floor((valor_total / numero_parcelas) * 100) / 100
    const resto = Math.round((valor_total - base * numero_parcelas) * 100) / 100
    // O resto de centavo vai inteiro para a última parcela — construído por
    // índice em vez de mutar um array preenchido, para não depender de
    // indexação (noUncheckedIndexedAccess trata `arr[i]` como possivelmente
    // undefined mesmo sabendo que o índice é válido).
    valores = Array.from({ length: numero_parcelas }, (_, indice) =>
      indice === numero_parcelas - 1
        ? Math.round((base + resto) * 100) / 100
        : base,
    )
  } else {
    const i = juros_mensal / 100
    const pmt = Math.round(
      ((valor_total * i) / (1 - (1 + i) ** -numero_parcelas)) * 100,
    ) / 100
    valores = Array.from({ length: numero_parcelas }, () => pmt)
  }

  return valores.map((valor, indice) => ({
    compra_id: id,
    numero: indice + 1,
    valor,
    mes: mesDeISO(addMonths(dataBase, indice)),
  }))
}

/** Todas as parcelas de todas as compras que caem no mês pedido. */
function parcelasDoMes(
  compras: readonly ParceladaDetalhada[],
  mes: string,
): ParcelaExpandida[] {
  return compras.flatMap((compra) =>
    calcularParcelas(compra).filter((parcela) => parcela.mes === mes),
  )
}

/**
 * Projeta o fluxo de caixa dos próximos meses.
 *
 * Regra de corte passado/futuro (resolução 10.43): o **mês corrente** lê
 * `lancamentosRealizados` e sai com `fonte: 'real'` — o que já aconteceu não
 * se estima, mesmo que o mês ainda não tenha terminado. Os meses **futuros**
 * saem com `fonte: 'projetado'`, combinando compromissos recorrentes,
 * parcelas e a média histórica do variável. Meses estritamente anteriores ao
 * corrente não entram no resultado — a projeção olha para frente.
 */
export function projetarFluxoCaixa(
  params: ParametrosProjecao,
): ProjecaoMensal[] {
  const {
    hoje,
    meses,
    compromissos,
    parcelas,
    lancamentosRealizados,
    mediaVariavelPorCategoria,
    receitaSobrescrita = {},
    compraHipotetica,
  } = params

  const mesAtual = mesDeISO(deISO(hoje))
  const listaMeses = Array.from({ length: Math.max(meses, 0) }, (_, indice) =>
    paraISO(startOfMonth(addMonths(deISO(mesAtual), indice))),
  )

  const todasAsParcelas = compraHipotetica
    ? [...parcelas, compraHipotetica]
    : parcelas
  const ocorrenciasCompromisso = expandirRecorrenciaMensal(
    compromissos,
    listaMeses,
  )
  const variavelEstimadoTotal = Object.values(
    mediaVariavelPorCategoria,
  ).reduce((total, valor) => total + valor, 0)

  let saldoAcumulado = 0

  return listaMeses.map((mes) => {
    if (mes === mesAtual) {
      const receitaPrevista = somaPorNatureza(lancamentosRealizados, 'receita')
      const comprometido = somaPorNatureza(lancamentosRealizados, 'despesa')
      const saldoDoMes = receitaPrevista - comprometido
      saldoAcumulado += saldoDoMes

      return {
        mes,
        receitaPrevista,
        comprometido,
        variavelEstimado: 0,
        saldoDoMes,
        saldoAcumulado,
        fonte: 'real',
      }
    }

    const compromissosDoMes = ocorrenciasCompromisso.filter(
      (ocorrencia) => mesDeISO(deISO(ocorrencia.data)) === mes,
    )
    const receitaCompromissos = compromissosDoMes
      .filter((o) => o.regra.categoria_natureza === 'receita')
      .reduce((total, o) => total + o.regra.valor, 0)
    const comprometidoFixo = compromissosDoMes
      .filter((o) => o.regra.categoria_natureza === 'despesa')
      .reduce((total, o) => total + o.regra.valor, 0)
    const comprometidoParcelas = parcelasDoMes(todasAsParcelas, mes).reduce(
      (total, parcela) => total + parcela.valor,
      0,
    )

    const receitaPrevista = receitaSobrescrita[mes] ?? receitaCompromissos
    const comprometido = comprometidoFixo + comprometidoParcelas
    const saldoDoMes = receitaPrevista - (comprometido + variavelEstimadoTotal)
    saldoAcumulado += saldoDoMes

    return {
      mes,
      receitaPrevista,
      comprometido,
      variavelEstimado: variavelEstimadoTotal,
      saldoDoMes,
      saldoAcumulado,
      fonte: 'projetado',
    }
  })
}

/**
 * Média mensal de despesa por categoria variável, nos `janela` meses
 * anteriores ao mês corrente (constante `MESES_MEDIA_VARIAVEL`).
 *
 * Com menos meses de histórico do que a janela, usa o que houver — dividir
 * pela janela cheia sub-estimaria a média de quem começou a usar o app há
 * pouco tempo.
 */
export function mediaVariavelPorCategoria(
  resumo: readonly { categoria_id: string; mes: string; total: number }[],
  categoriasVariaveis: ReadonlySet<string>,
  mesesConsiderados: readonly string[],
): Record<string, number> {
  const somaPorCategoria = new Map<string, number>()
  const mesesComDado = new Map<string, Set<string>>()

  for (const linha of resumo) {
    if (!categoriasVariaveis.has(linha.categoria_id)) continue
    if (!mesesConsiderados.includes(linha.mes)) continue

    somaPorCategoria.set(
      linha.categoria_id,
      (somaPorCategoria.get(linha.categoria_id) ?? 0) + linha.total,
    )
    const meses = mesesComDado.get(linha.categoria_id) ?? new Set<string>()
    meses.add(linha.mes)
    mesesComDado.set(linha.categoria_id, meses)
  }

  const resultado: Record<string, number> = {}
  for (const [categoriaId, soma] of somaPorCategoria) {
    const qtdMeses = mesesComDado.get(categoriaId)?.size ?? 1
    resultado[categoriaId] = soma / qtdMeses
  }
  return resultado
}

/**
 * Categorias de despesa variável elegíveis para a média histórica.
 *
 * Exclui as que já têm compromisso recorrente vinculado: o futuro delas já
 * vem do compromisso, e somar as duas contaria o mesmo custo duas vezes —
 * bug real encontrado em uso ("Energia" ficou marcada `variavel` depois de
 * ganhar um compromisso fixo de R$350, e a projeção passou a somar R$350 +
 * a média variável da mesma conta). Defesa dentro da função, não só no
 * cadastro — mesmo raciocínio de `composicaoGastos` (filtra por dentro em
 * vez de confiar que quem chama já filtrou).
 */
export function categoriasElegiveisParaMediaVariavel(
  categorias: readonly { id: string; natureza: string; tipo: string | null }[],
  compromissos: readonly { categoria_id: string }[],
): Set<string> {
  const comCompromisso = new Set(compromissos.map((c) => c.categoria_id))
  return new Set(
    categorias
      .filter(
        (c) =>
          c.natureza === 'despesa' &&
          c.tipo === 'variavel' &&
          !comCompromisso.has(c.id),
      )
      .map((c) => c.id),
  )
}

/**
 * Quantos meses da janela pedida têm de fato alguma linha em `resumo`.
 *
 * Não confundir com `janela.length`, que é sempre o tamanho fixo pedido
 * (bug real: comparar `mesesResumo.length < MESES_MEDIA_VARIAVEL` dá sempre
 * falso, porque `mesesResumo` já nasce com esse tamanho — o aviso de
 * "histórico curto" nunca aparecia). O que importa é quantos desses meses
 * têm dado de verdade, não quantos foram pedidos.
 */
export function mesesComHistorico(
  resumo: readonly { mes: string }[],
  janela: readonly string[],
): number {
  const presentes = new Set(resumo.map((r) => r.mes))
  return janela.filter((mes) => presentes.has(mes)).length
}
