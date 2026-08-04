import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as api from './api'

export const chaves = {
  raiz: ['treino'] as const,
  treinos: () => ['treino', 'treinos'] as const,
  exercicios: () => ['treino', 'exercicios'] as const,
  execucoes: (de?: string, ate?: string) =>
    ['treino', 'execucoes', de ?? 'todas', ate ?? 'todas'] as const,
  series: (de?: string, ate?: string) =>
    ['treino', 'series', de ?? 'todas', ate ?? 'todas'] as const,
  prs: () => ['treino', 'prs'] as const,
  corporal: () => ['treino', 'corporal'] as const,
  lesoes: () => ['treino', 'lesoes'] as const,
  fluxograma: () => ['treino', 'fluxograma'] as const,
}

// --- Leitura ----------------------------------------------------------------

export function useTreinos() {
  return useQuery({ queryKey: chaves.treinos(), queryFn: api.listarTreinos })
}

export function useExercicios() {
  return useQuery({
    queryKey: chaves.exercicios(),
    queryFn: api.listarExercicios,
  })
}

export function useExecucoes(de?: string, ate?: string) {
  return useQuery({
    queryKey: chaves.execucoes(de, ate),
    queryFn: () => api.listarExecucoes(de, ate),
  })
}

export function useSeries(de?: string, ate?: string) {
  return useQuery({
    queryKey: chaves.series(de, ate),
    queryFn: () => api.listarSeries(de, ate),
  })
}

export function usePersonalRecords() {
  return useQuery({ queryKey: chaves.prs(), queryFn: api.listarPersonalRecords })
}

export function useRegistroCorporal() {
  return useQuery({
    queryKey: chaves.corporal(),
    queryFn: api.listarRegistroCorporal,
  })
}

export function useLesoes() {
  return useQuery({ queryKey: chaves.lesoes(), queryFn: api.listarLesoes })
}

export function useFluxogramaTreino() {
  return useQuery({
    queryKey: chaves.fluxograma(),
    queryFn: api.listarFluxogramaTreino,
  })
}

// --- Escrita ----------------------------------------------------------------

function useMutationTreino<TVariaveis, TResultado = void>(
  fn: (variaveis: TVariaveis) => Promise<TResultado>,
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

export function useCriarTreino() {
  return useMutationTreino(api.criarTreino, 'Treino criado')
}

export function useExcluirTreino() {
  return useMutationTreino(api.excluirTreino, 'Treino excluído')
}

export function useCriarExercicio() {
  return useMutationTreino(api.criarExercicio, 'Exercício adicionado')
}

export function useExcluirExercicio() {
  return useMutationTreino(api.excluirExercicio, 'Exercício removido')
}

export function useExcluirExecucao() {
  return useMutationTreino(api.excluirExecucao, 'Execução removida')
}

/**
 * Registra uma sessão inteira: cria a execução e anexa as séries.
 *
 * Se o registro das séries falhar, a execução criada é removida — evita
 * execuções vazias que contariam como treino feito na frequência da semana.
 */
export function useRegistrarSessao() {
  return useMutationTreino(
    async ({
      treinoId,
      data,
      series,
    }: {
      treinoId: string
      data: string
      series: readonly Omit<api.NovaSerie, 'execucao_treino_id'>[]
    }) => {
      const execucaoId = await api.iniciarExecucao(treinoId, data)
      try {
        await api.registrarSeries(
          series.map((serie) => ({ ...serie, execucao_treino_id: execucaoId })),
        )
      } catch (erro) {
        await api.excluirExecucao(execucaoId)
        throw erro
      }
    },
    'Treino registrado',
  )
}

export function useSalvarRegistroCorporal() {
  return useMutationTreino(api.salvarRegistroCorporal, 'Registro salvo')
}

export function useCriarLesao() {
  return useMutationTreino(api.criarLesao, 'Lesão registrada')
}

export function useExcluirLesao() {
  return useMutationTreino(api.excluirLesao, 'Registro removido')
}

export function useCriarFluxogramaTreino() {
  return useMutationTreino(api.criarFluxogramaTreino, 'Horário adicionado')
}
