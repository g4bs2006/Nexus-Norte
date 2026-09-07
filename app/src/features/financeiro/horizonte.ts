import { addDays, addMonths, endOfMonth, getDaysInMonth, startOfMonth } from 'date-fns'
import { deISO, paraISO } from '@/lib/datas'
import { pendenciasEventos } from '../../../supabase/functions/_shared/eventos-financeiros'
export { expandirEventos } from '../../../supabase/functions/_shared/eventos-financeiros'
import type { EventoFinanceiroDetalhado } from './caixa-types'

const centavos = (valor: number) => Math.round(valor * 100)
const dinheiro = (valor: number) => centavos(valor) / 100
export type StatusHorizonte = 'critico' | 'atencao' | 'ok' | 'otimo'
export interface LancamentoCaixa {
  id: string; data: string; data_caixa: string; valor: number; categoria_id: string
  categoria_natureza: 'receita' | 'despesa'; descricao: string | null
  evento_id: string | null; competencia_evento: string | null; cartao_id: string | null
}
export interface OcorrenciaFinanceira {
  evento_id: string; data: string; valor: number; descricao: string
  categoria_id: string; categoria_natureza: 'receita' | 'despesa'
}
export interface MovimentoCaixa {
  id: string; descricao: string; valor: number; natureza: 'receita' | 'despesa'
  origem: 'real' | 'previsto' | 'variavel' | 'simulacao'
  vencido?: boolean; dataOriginal?: string; itens?: readonly LancamentoCaixa[]
}
export interface DiaHorizonte {
  data: string; saldoInicial: number; entradas: number; saidas: number; saldoFinal: number
  movimentos: MovimentoCaixa[]; fonte: 'real' | 'projetado' | 'misto'; status: StatusHorizonte
}
export interface ParametrosHorizonte {
  hoje: string; dias: number; saldoReferencia: { data: string; valor: number } | null
  eventos: readonly EventoFinanceiroDetalhado[]; lancamentos: readonly LancamentoCaixa[]
  orcamentoMensalVariavel: number; categoriasVariaveis: ReadonlySet<string>
  colchaoMinimo: number; colchaoConfortavel: number
  retiradaHipotetica?: { data: string; valor: number }
  eventoHipotetico?: EventoFinanceiroDetalhado
  nomesCartoes?: ReadonlyMap<string, string>
}

function diaNoMes(mes: Date, dia: number): string {
  return `${paraISO(mes).slice(0, 8)}${String(Math.min(dia, getDaysInMonth(mes))).padStart(2, '0')}`
}

/** Snapshot: o chamador só recalcula quando as premissas do lançamento mudam. */
export function calcularDataCaixa(data: string, cartao: { dia_fechamento: number; dia_vencimento: number }): string {
  let mes = startOfMonth(deISO(data))
  if (data > diaNoMes(mes, cartao.dia_fechamento)) mes = addMonths(mes, 1)
  if (cartao.dia_vencimento <= cartao.dia_fechamento) mes = addMonths(mes, 1)
  return diaNoMes(mes, cartao.dia_vencimento)
}

export function statusHorizonte(saldo: number, minimo: number, confortavel: number): StatusHorizonte {
  if (saldo < 0) return 'critico'
  if (saldo < minimo) return 'atencao'
  if (saldo < confortavel) return 'ok'
  return 'otimo'
}

export function projetarHorizonteDiario(params: ParametrosHorizonte): DiaHorizonte[] {
  const { hoje, dias, lancamentos, saldoReferencia, orcamentoMensalVariavel, categoriasVariaveis } = params
  if (dias < 1) return []
  const ate = paraISO(addDays(deISO(hoje), dias - 1))
  const referencia = saldoReferencia?.data ?? hoje
  const eventos = params.eventoHipotetico ? [...params.eventos, params.eventoHipotetico] : params.eventos
  const porDia = new Map<string, MovimentoCaixa[]>()
  const adicionar = (data: string, movimento: MovimentoCaixa) => {
    if (data < referencia || data > ate) return
    porDia.set(data, [...(porDia.get(data) ?? []), movimento])
  }
  // Quitação independe de data de caixa: crédito vinculado já substitui a previsão,
  // mesmo quando sua fatura só sairá da conta no mês seguinte.
  const faturas = new Map<string, LancamentoCaixa[]>()
  for (const lancamento of lancamentos) {

    if (lancamento.cartao_id) {
      const chave = `${lancamento.cartao_id}:${lancamento.data_caixa}:${lancamento.categoria_natureza}`
      faturas.set(chave, [...(faturas.get(chave) ?? []), lancamento])
    } else adicionar(lancamento.data_caixa, { id: lancamento.id, descricao: lancamento.descricao ?? 'Lançamento', valor: lancamento.valor, natureza: lancamento.categoria_natureza, origem: 'real' })
  }
  for (const [chave, itens] of faturas) {
    const primeiro = itens[0]!
    adicionar(primeiro.data_caixa, { id: `fatura:${chave}`, descricao: `Fatura · ${params.nomesCartoes?.get(primeiro.cartao_id!) ?? 'Cartão'}`, valor: itens.reduce((s, l) => s + centavos(l.valor), 0) / 100, natureza: primeiro.categoria_natureza, origem: 'real', itens })
  }
  for (const ocorrencia of pendenciasEventos(eventos, lancamentos, referencia, ate)) {
    const chave = `${ocorrencia.evento_id}:${ocorrencia.data}`
    const restante = ocorrencia.valor
    if (restante === 0) continue
    adicionar(ocorrencia.data < hoje ? hoje : ocorrencia.data, { id: chave, descricao: ocorrencia.descricao, valor: restante, natureza: ocorrencia.categoria_natureza, origem: 'previsto', vencido: ocorrencia.data < hoje, dataOriginal: ocorrencia.data })
  }
  const gastoVariavelHoje = lancamentos.filter(l => l.data === hoje && l.categoria_natureza === 'despesa' && !l.evento_id && categoriasVariaveis.has(l.categoria_id)).reduce((s, l) => s + centavos(l.valor), 0) / 100
  let saldo = centavos(saldoReferencia?.valor ?? 0)
  for (const [data, movimentos] of porDia) {
    if (data < hoje) for (const m of movimentos) saldo += (m.natureza === 'receita' ? 1 : -1) * centavos(m.valor)
  }
  return Array.from({ length: dias }, (_, i) => {
    const data = paraISO(addDays(deISO(hoje), i))
    const movimentos = [...(porDia.get(data) ?? [])]
    const diario = Math.max(0, dinheiro(orcamentoMensalVariavel / getDaysInMonth(deISO(data))) - (data === hoje ? gastoVariavelHoje : 0))
    if (diario > 0) movimentos.push({ id: `variavel:${data}`, descricao: 'Orçamento variável do dia', valor: diario, natureza: 'despesa', origem: 'variavel' })
    if (params.retiradaHipotetica?.data === data) movimentos.push({ id: `simulacao:${data}`, descricao: 'Retirada simulada', valor: params.retiradaHipotetica.valor, natureza: 'despesa', origem: 'simulacao' })
    const entradas = movimentos.filter(m => m.natureza === 'receita').reduce((s, m) => s + centavos(m.valor), 0)
    const saidas = movimentos.filter(m => m.natureza === 'despesa').reduce((s, m) => s + centavos(m.valor), 0)
    const saldoInicial = saldo / 100
    saldo += entradas - saidas
    const temReal = movimentos.some(m => m.origem === 'real')
    const temPrevisto = movimentos.some(m => m.origem !== 'real')
    return { data, saldoInicial, entradas: entradas / 100, saidas: saidas / 100, saldoFinal: saldo / 100, movimentos, fonte: temReal ? (temPrevisto ? 'misto' : 'real') : 'projetado', status: statusHorizonte(saldo / 100, params.colchaoMinimo, params.colchaoConfortavel) }
  })
}

export function menorSaldoAteProximaReceita(dias: readonly DiaHorizonte[], proximaDataReceita: string | null): DiaHorizonte | null {
  if (!proximaDataReceita || !dias.some(d => d.data >= proximaDataReceita)) return null
  return dias.filter(d => d.data < proximaDataReceita).reduce<DiaHorizonte | null>((menor, d) => !menor || d.saldoFinal < menor.saldoFinal ? d : menor, null)
}

export function agregarHorizonteMensal(dias: readonly DiaHorizonte[]) {
  const resultado: { mes: string; receitaPrevista: number; comprometido: number; variavelEstimado: number; saldoDoMes: number; saldoAcumulado: number; fonte: 'real' | 'projetado' | 'misto' }[] = []
  for (const dia of dias) {
    const mes = `${dia.data.slice(0, 7)}-01`
    let linha = resultado.find(m => m.mes === mes)
    if (!linha) { linha = { mes, receitaPrevista: 0, comprometido: 0, variavelEstimado: 0, saldoDoMes: 0, saldoAcumulado: dia.saldoFinal, fonte: dia.fonte }; resultado.push(linha) }
    const variavel = dia.movimentos.filter(m => m.origem === 'variavel').reduce((s, m) => s + m.valor, 0)
    linha.receitaPrevista = dinheiro(linha.receitaPrevista + dia.entradas)
    linha.comprometido = dinheiro(linha.comprometido + dia.saidas - variavel)
    linha.variavelEstimado = dinheiro(linha.variavelEstimado + variavel)
    linha.saldoDoMes = dinheiro(linha.saldoDoMes + dia.entradas - dia.saidas)
    linha.saldoAcumulado = dia.saldoFinal
    if (linha.fonte !== dia.fonte) linha.fonte = 'misto'
  }
  return resultado
}

export function fimHorizonteMensal(hoje: string, meses: number): string {
  return paraISO(endOfMonth(addMonths(deISO(hoje), meses - 1)))
}
