import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as api from './api'

/**
 * Chaves de cache do Financeiro.
 *
 * Toda mutation invalida a raiz `['financeiro']`: os dados do pilar são
 * interdependentes (um lançamento muda total_gasto_mes, o ranking, a projeção
 * e os candidatos a corte), então invalidação granular geraria telas
 * inconsistentes por um instante.
 */
export const chaves = {
  raiz: ['financeiro'] as const,
  categorias: () => ['financeiro', 'categorias'] as const,
  lancamentos: (de: string, ate: string) =>
    ['financeiro', 'lancamentos', de, ate] as const,
  lancamentosCategoria: (categoriaId: string) =>
    ['financeiro', 'lancamentos', 'categoria', categoriaId] as const,
  receitaMes: (mes: string) => ['financeiro', 'receita', mes] as const,
  resumoMensal: (de: string, ate: string) =>
    ['financeiro', 'resumo-mensal', de, ate] as const,
  candidatosCorte: () => ['financeiro', 'candidatos-corte'] as const,
  investimentos: (de: string, ate: string) =>
    ['financeiro', 'investimentos', de, ate] as const,
  planejamento: (semana: string) =>
    ['financeiro', 'planejamento', semana] as const,
  check: (data: string) => ['financeiro', 'check', data] as const,
}

// --- Leitura ----------------------------------------------------------------

export function useCategorias() {
  return useQuery({
    queryKey: chaves.categorias(),
    queryFn: api.listarCategorias,
  })
}

export function useLancamentos(de: string, ate: string) {
  return useQuery({
    queryKey: chaves.lancamentos(de, ate),
    queryFn: () => api.listarLancamentos({ de, ate }),
  })
}

export function useLancamentosDaCategoria(categoriaId: string | undefined) {
  return useQuery({
    queryKey: chaves.lancamentosCategoria(categoriaId ?? ''),
    queryFn: () => api.listarLancamentosDaCategoria(categoriaId as string),
    enabled: Boolean(categoriaId),
  })
}

export function useReceitaDoMes(mes: string) {
  return useQuery({
    queryKey: chaves.receitaMes(mes),
    queryFn: () => api.receitaDoMes(mes),
  })
}

export function useResumoMensal(mesInicial: string, mesFinal: string) {
  return useQuery({
    queryKey: chaves.resumoMensal(mesInicial, mesFinal),
    queryFn: () => api.resumoMensalCategoria(mesInicial, mesFinal),
  })
}

export function useCandidatosCorte() {
  return useQuery({
    queryKey: chaves.candidatosCorte(),
    queryFn: api.candidatosCorte,
  })
}

export function useInvestimentos(de: string, ate: string) {
  return useQuery({
    queryKey: chaves.investimentos(de, ate),
    queryFn: () => api.listarInvestimentos({ de, ate }),
  })
}

export function usePlanejamentoSemana(semanaInicio: string) {
  return useQuery({
    queryKey: chaves.planejamento(semanaInicio),
    queryFn: () => api.listarPlanejamentoSemana(semanaInicio),
  })
}

export function useCheckDia(data: string) {
  return useQuery({
    queryKey: chaves.check(data),
    queryFn: () => api.obterCheckDia(data),
  })
}

// --- Escrita ----------------------------------------------------------------

/** Invalida todo o pilar e reporta o erro ao usuário. */
function useMutationFinanceiro<TVariaveis>(
  fn: (variaveis: TVariaveis) => Promise<void>,
  mensagemSucesso: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chaves.raiz })
      toast.success(mensagemSucesso)
    },
    onError: (erro: Error) => toast.error(erro.message),
  })
}

export function useCriarCategoria() {
  return useMutationFinanceiro(api.criarCategoria, 'Categoria criada')
}

export function useAtualizarCategoria() {
  return useMutationFinanceiro(
    ({ id, dados }: { id: string; dados: Parameters<typeof api.atualizarCategoria>[1] }) =>
      api.atualizarCategoria(id, dados),
    'Categoria atualizada',
  )
}

export function useExcluirCategoria() {
  return useMutationFinanceiro(api.excluirCategoria, 'Categoria excluída')
}

export function useCriarLancamento() {
  return useMutationFinanceiro(api.criarLancamento, 'Lançamento registrado')
}

export function useAtualizarLancamento() {
  return useMutationFinanceiro(
    ({ id, dados }: { id: string; dados: Parameters<typeof api.atualizarLancamento>[1] }) =>
      api.atualizarLancamento(id, dados),
    'Lançamento atualizado',
  )
}

export function useExcluirLancamento() {
  return useMutationFinanceiro(api.excluirLancamento, 'Lançamento excluído')
}

export function useCriarInvestimento() {
  return useMutationFinanceiro(api.criarInvestimento, 'Investimento registrado')
}

export function useAtualizarInvestimento() {
  return useMutationFinanceiro(
    ({ id, dados }: { id: string; dados: Parameters<typeof api.atualizarInvestimento>[1] }) =>
      api.atualizarInvestimento(id, dados),
    'Investimento atualizado',
  )
}

export function useExcluirInvestimento() {
  return useMutationFinanceiro(api.excluirInvestimento, 'Investimento excluído')
}

export function useSalvarPlanejamento() {
  return useMutationFinanceiro(
    ({
      semanaInicio,
      entradas,
    }: {
      semanaInicio: string
      entradas: readonly api.EntradaPlanejamento[]
    }) => api.salvarPlanejamentoSemana(semanaInicio, entradas),
    'Planejamento da semana salvo',
  )
}

export function useSalvarCheck() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      data,
      campos,
    }: {
      data: string
      campos: Parameters<typeof api.salvarCheckDia>[1]
    }) => api.salvarCheckDia(data, campos),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chaves.raiz })
    },
    onError: (erro: Error) => toast.error(erro.message),
  })
}
