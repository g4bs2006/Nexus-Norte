import { supabase } from '@/lib/supabase'
import type { TablesInsert } from '@/types/database'
import type { Cartao, EventoFinanceiroDetalhado, SaldoReferenciaConta } from './caixa-types'
import type { LancamentoCaixa } from './horizonte'

export async function listarCartoes(): Promise<Cartao[]> {
  const { data, error } = await supabase.from('cartoes').select('*').order('nome')
  if (error) throw error
  return data ?? []
}
export async function salvarCartao(dados: TablesInsert<'cartoes'>): Promise<void> {
  const { error } = await supabase.from('cartoes').upsert(dados)
  if (error) throw error
}
export async function excluirCartao(id: string): Promise<void> {
  const { error } = await supabase.from('cartoes').delete().eq('id', id)
  if (error) throw error
}
export async function listarEventosFinanceiros(): Promise<EventoFinanceiroDetalhado[]> {
  const { data, error } = await supabase.from('eventos_financeiros_previstos').select('*, categorias!inner(nome, natureza, cor)').order('data_inicio').order('id')
  if (error) throw error
  return (data ?? []).map(({ categorias, ...evento }) => ({ ...evento, categoria_nome: categorias.nome, categoria_cor: categorias.cor, categoria_natureza: categorias.natureza })) as EventoFinanceiroDetalhado[]
}
export async function salvarEventoFinanceiro(dados: TablesInsert<'eventos_financeiros_previstos'>): Promise<void> {
  const { error } = await supabase.from('eventos_financeiros_previstos').upsert(dados)
  if (error) throw error
}
export async function excluirEventoFinanceiro(id: string): Promise<void> {
  const { error } = await supabase.from('eventos_financeiros_previstos').delete().eq('id', id)
  if (error) throw error
}
export async function obterSaldoReferencia(hoje: string): Promise<SaldoReferenciaConta | null> {
  const { data, error } = await supabase.from('saldo_referencia_conta').select('*').lte('data', hoje).order('data', { ascending: false }).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(1).maybeSingle()
  if (error) throw error
  return data
}
export async function salvarSaldoReferencia(dados: TablesInsert<'saldo_referencia_conta'>): Promise<void> {
  const { error } = await supabase.from('saldo_referencia_conta').insert(dados)
  if (error) throw error
}

/** Todas as páginas, incluindo crédito de competência passada com caixa futuro.
 * Sem recorte inferior: pagamento antecipado anterior à âncora ainda quita uma
 * ocorrência posterior. Ordenação única torna a paginação determinística. */
export async function listarLancamentosCaixa(ate: string): Promise<LancamentoCaixa[]> {
  const resultado: LancamentoCaixa[] = []
  const tamanho = 1000
  for (let inicio = 0; ; inicio += tamanho) {
    const { data, error } = await supabase.from('lancamentos').select('*, categorias!inner(natureza)').lte('data', ate).order('id').range(inicio, inicio + tamanho - 1)
    if (error) throw error
    resultado.push(...(data ?? []).map(({ categorias, ...l }) => ({ ...l, categoria_natureza: categorias.natureza as 'receita' | 'despesa' })))
    if (!data || data.length < tamanho) return resultado
  }
}
