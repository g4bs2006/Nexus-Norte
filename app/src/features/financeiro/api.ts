import { supabase } from '@/lib/supabase'
import type { TablesInsert, TablesUpdate } from '@/types/database'
import type {
  CandidatoCorte,
  Categoria,
  Investimento,
  Lancamento,
  PlanejamentoSemanal,
} from './types'

/**
 * Acesso a dados do Financeiro. Cada função lança em caso de erro para que o
 * React Query trate o estado de falha — nenhuma retorna erro silencioso.
 */

function lancarSeErro<T>(resultado: {
  data: T | null
  error: { message: string } | null
}): T {
  if (resultado.error) throw new Error(resultado.error.message)
  if (resultado.data === null) throw new Error('Consulta sem retorno')
  return resultado.data
}

// --- Categorias -------------------------------------------------------------

export async function listarCategorias(): Promise<Categoria[]> {
  const resultado = await supabase
    .from('categorias')
    .select('*')
    .order('natureza')
    .order('nome')
  // As colunas com CHECK vêm tipadas como string; o banco garante os valores.
  return lancarSeErro(resultado) as Categoria[]
}

export async function criarCategoria(
  dados: TablesInsert<'categorias'>,
): Promise<void> {
  const { error } = await supabase.from('categorias').insert(dados)
  if (error) throw new Error(error.message)
}

export async function atualizarCategoria(
  id: string,
  dados: TablesUpdate<'categorias'>,
): Promise<void> {
  const { error } = await supabase.from('categorias').update(dados).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function excluirCategoria(id: string): Promise<void> {
  const { error } = await supabase.from('categorias').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// --- Lançamentos ------------------------------------------------------------

export interface FiltroPeriodo {
  de: string
  ate: string
}

export async function listarLancamentos({
  de,
  ate,
}: FiltroPeriodo): Promise<Lancamento[]> {
  const resultado = await supabase
    .from('lancamentos')
    .select('*')
    .gte('data', de)
    .lte('data', ate)
    .order('data', { ascending: false })
  return lancarSeErro(resultado)
}

export async function listarLancamentosDaCategoria(
  categoriaId: string,
  limite = 50,
): Promise<Lancamento[]> {
  const resultado = await supabase
    .from('lancamentos')
    .select('*')
    .eq('categoria_id', categoriaId)
    .order('data', { ascending: false })
    .limit(limite)
  return lancarSeErro(resultado)
}

export async function criarLancamento(
  dados: TablesInsert<'lancamentos'>,
): Promise<void> {
  const { error } = await supabase.from('lancamentos').insert(dados)
  if (error) throw new Error(error.message)
}

export async function atualizarLancamento(
  id: string,
  dados: TablesUpdate<'lancamentos'>,
): Promise<void> {
  const { error } = await supabase
    .from('lancamentos')
    .update(dados)
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function excluirLancamento(id: string): Promise<void> {
  const { error } = await supabase.from('lancamentos').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// --- Agregações (views e funções) -------------------------------------------

/** Receita total de um mês. `mes` é o primeiro dia do mês, em ISO. */
export async function receitaDoMes(mes: string): Promise<number> {
  const { data, error } = await supabase
    .from('receita_mensal')
    .select('total')
    .eq('mes', mes)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data?.total ?? 0
}

export interface ResumoMensal {
  categoria_id: string
  mes: string
  total: number
}

/** Totais por categoria dentro de um intervalo de meses (gráfico de tendência). */
export async function resumoMensalCategoria(
  mesInicial: string,
  mesFinal: string,
): Promise<ResumoMensal[]> {
  const { data, error } = await supabase
    .from('resumo_mensal_categoria')
    .select('categoria_id, mes, total')
    .gte('mes', mesInicial)
    .lte('mes', mesFinal)
  if (error) throw new Error(error.message)

  // A view tem colunas nullable no tipo gerado (característica de views no
  // PostgREST); filtramos o que não serve antes de expor um tipo estrito.
  return (data ?? []).flatMap((linha) =>
    linha.categoria_id !== null && linha.mes !== null
      ? [
          {
            categoria_id: linha.categoria_id,
            mes: linha.mes,
            total: linha.total ?? 0,
          },
        ]
      : [],
  )
}

export async function candidatosCorte(): Promise<CandidatoCorte[]> {
  const { data, error } = await supabase.rpc('candidatos_corte')
  if (error) throw new Error(error.message)
  return data ?? []
}

// --- Investimentos ----------------------------------------------------------

export async function listarInvestimentos({
  de,
  ate,
}: FiltroPeriodo): Promise<Investimento[]> {
  const resultado = await supabase
    .from('investimentos')
    .select('*')
    .gte('data', de)
    .lte('data', ate)
    .order('data', { ascending: false })
  return lancarSeErro(resultado) as Investimento[]
}

export async function criarInvestimento(
  dados: TablesInsert<'investimentos'>,
): Promise<void> {
  const { error } = await supabase.from('investimentos').insert(dados)
  if (error) throw new Error(error.message)
}

export async function atualizarInvestimento(
  id: string,
  dados: TablesUpdate<'investimentos'>,
): Promise<void> {
  const { error } = await supabase
    .from('investimentos')
    .update(dados)
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function excluirInvestimento(id: string): Promise<void> {
  const { error } = await supabase.from('investimentos').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// --- Planejamento semanal ---------------------------------------------------

export async function listarPlanejamentoSemana(
  semanaInicio: string,
): Promise<PlanejamentoSemanal[]> {
  const resultado = await supabase
    .from('planejamento_semanal_financeiro')
    .select('*')
    .eq('semana_inicio', semanaInicio)
  return lancarSeErro(resultado)
}

export interface EntradaPlanejamento {
  categoria_id: string
  dia_semana: number
  valor_planejado: number
}

/**
 * Substitui o planejamento da semana. Entradas com valor 0 são removidas em
 * vez de gravadas — a grade é esparsa, e guardar zeros faria a leitura
 * confundir "não planejado" com "planejado como zero".
 */
export async function salvarPlanejamentoSemana(
  semanaInicio: string,
  entradas: readonly EntradaPlanejamento[],
): Promise<void> {
  const { error: erroRemocao } = await supabase
    .from('planejamento_semanal_financeiro')
    .delete()
    .eq('semana_inicio', semanaInicio)
  if (erroRemocao) throw new Error(erroRemocao.message)

  const preenchidas = entradas.filter((e) => e.valor_planejado > 0)
  if (preenchidas.length === 0) return

  const { error } = await supabase
    .from('planejamento_semanal_financeiro')
    .insert(preenchidas.map((e) => ({ ...e, semana_inicio: semanaInicio })))
  if (error) throw new Error(error.message)
}

// --- Checks diários ---------------------------------------------------------

export interface CheckDiario {
  data: string
  financeiro_registrado: boolean
  planejamento_semana_feito: boolean
}

export async function obterCheckDia(data: string): Promise<CheckDiario | null> {
  const { data: linha, error } = await supabase
    .from('checks_diarios')
    .select('data, financeiro_registrado, planejamento_semana_feito')
    .eq('data', data)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return linha
}

export async function salvarCheckDia(
  data: string,
  campos: Partial<Omit<CheckDiario, 'data'>>,
): Promise<void> {
  const { error } = await supabase
    .from('checks_diarios')
    .upsert({ data, ...campos }, { onConflict: 'data' })
  if (error) throw new Error(error.message)
}
