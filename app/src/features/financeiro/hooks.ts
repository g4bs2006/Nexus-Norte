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
  detalhados: (filtro: api.FiltroLancamentos) =>
    [
      'financeiro',
      'lancamentos-detalhados',
      filtro.de,
      filtro.ate,
      filtro.categoriaId ?? 'todas',
      filtro.natureza ?? 'ambas',
      filtro.formaPagamento ?? 'todas',
      filtro.busca ?? '',
    ] as const,
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
  compromissos: () => ['financeiro', 'compromissos'] as const,
  parceladas: () => ['financeiro', 'parceladas'] as const,
  regraInvestimento: () => ['financeiro', 'regra-investimento'] as const,
  sugestoesPendentes: () =>
    ['financeiro', 'sugestoes-investimento', 'pendentes'] as const,
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

/**
 * Lista filtrável de lançamentos (resolução 10.23).
 *
 * O filtro inteiro entra na chave de cache: trocar de período ou de categoria é
 * uma consulta diferente, e o React Query já guarda cada combinação — voltar para
 * "este mês" depois de olhar julho não refaz a requisição.
 */
export function useLancamentosDetalhados(filtro: api.FiltroLancamentos) {
  return useQuery({
    queryKey: chaves.detalhados(filtro),
    queryFn: () => api.listarLancamentosDetalhados(filtro),
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

export function useCompromissos() {
  return useQuery({
    queryKey: chaves.compromissos(),
    queryFn: api.listarCompromissos,
  })
}

export function useParceladas() {
  return useQuery({
    queryKey: chaves.parceladas(),
    queryFn: api.listarParceladas,
  })
}

export function useRegraInvestimento() {
  return useQuery({
    queryKey: chaves.regraInvestimento(),
    queryFn: api.obterRegraInvestimento,
  })
}

export function useSugestoesPendentes() {
  return useQuery({
    queryKey: chaves.sugestoesPendentes(),
    queryFn: api.listarSugestoesPendentes,
  })
}

// --- Escrita ----------------------------------------------------------------

/**
 * Invalida todo o pilar e reporta o erro ao usuário.
 *
 * Também invalida `['calendario']`: lançamento de despesa fixa vira conta a
 * pagar lá, que lê sob sua própria chave. Mesma correção aplicada em
 * `estudos/hooks.ts`, `treino/hooks.ts` e `projetos/hooks.ts`.
 */
function useMutationFinanceiro<TVariaveis>(
  fn: (variaveis: TVariaveis) => Promise<void>,
  mensagemSucesso: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chaves.raiz })
      void queryClient.invalidateQueries({ queryKey: ['calendario'] })
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
    ({
      id,
      dados,
    }: {
      id: string
      dados: Parameters<typeof api.atualizarCategoria>[1]
    }) => api.atualizarCategoria(id, dados),
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
    ({
      id,
      dados,
    }: {
      id: string
      dados: Parameters<typeof api.atualizarLancamento>[1]
    }) => api.atualizarLancamento(id, dados),
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
    ({
      id,
      dados,
    }: {
      id: string
      dados: Parameters<typeof api.atualizarInvestimento>[1]
    }) => api.atualizarInvestimento(id, dados),
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

export function useCriarCompromisso() {
  return useMutationFinanceiro(api.criarCompromisso, 'Compromisso registrado')
}

export function useAtualizarCompromisso() {
  return useMutationFinanceiro(
    ({
      id,
      dados,
    }: {
      id: string
      dados: Parameters<typeof api.atualizarCompromisso>[1]
    }) => api.atualizarCompromisso(id, dados),
    'Compromisso atualizado',
  )
}

export function useExcluirCompromisso() {
  return useMutationFinanceiro(api.excluirCompromisso, 'Compromisso excluído')
}

export function useCriarParcelada() {
  return useMutationFinanceiro(api.criarParcelada, 'Compra parcelada registrada')
}

export function useExcluirParcelada() {
  return useMutationFinanceiro(api.excluirParcelada, 'Compra parcelada excluída')
}

export function useSalvarRegraInvestimento() {
  return useMutationFinanceiro(
    ({
      id,
      dados,
    }: {
      id: string | null
      dados: Parameters<typeof api.salvarRegraInvestimento>[0]
    }) =>
      id
        ? api.atualizarRegraInvestimento(id, dados)
        : api.salvarRegraInvestimento(dados),
    'Regra de investimento salva',
  )
}

export function useAceitarSugestao() {
  return useMutationFinanceiro(
    ({
      sugestaoId,
      aporte,
    }: {
      sugestaoId: string
      aporte: Parameters<typeof api.aceitarSugestaoInvestimento>[1]
    }) => api.aceitarSugestaoInvestimento(sugestaoId, aporte),
    'Sugestão aceita — aporte registrado',
  )
}

export function useRecusarSugestao() {
  return useMutationFinanceiro(
    api.recusarSugestaoInvestimento,
    'Sugestão recusada',
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
