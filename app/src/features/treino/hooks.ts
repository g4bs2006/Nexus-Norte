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
  biblioteca: () => ['treino', 'biblioteca'] as const,
  tiposTreino: () => ['treino', 'tipos'] as const,
  execucaoAberta: () => ['treino', 'execucao-aberta'] as const,
  execucaoPorId: (id?: string) =>
    ['treino', 'execucao', id ?? 'nenhuma'] as const,
  pulados: (de?: string, ate?: string) =>
    ['treino', 'pulados', de ?? 'todas', ate ?? 'todas'] as const,
  agendados: (de: string, ate: string) =>
    ['treino', 'agendados', de, ate] as const,
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

/** Biblioteca de exercícios base, com contagem de usos (resolução 10.18). */
export function useBiblioteca() {
  return useQuery({
    queryKey: chaves.biblioteca(),
    queryFn: api.listarBiblioteca,
  })
}

export function useTiposTreino() {
  return useQuery({
    queryKey: chaves.tiposTreino(),
    queryFn: api.listarTiposTreino,
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
  return useQuery({
    queryKey: chaves.prs(),
    queryFn: api.listarPersonalRecords,
  })
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

/** Treinos marcados no intervalo — a data já vem gravada em cada linha. */
export function useTreinosAgendados(de: string, ate: string) {
  return useQuery({
    queryKey: chaves.agendados(de, ate),
    queryFn: () => api.listarTreinosAgendados(de, ate),
  })
}

// --- Escrita ----------------------------------------------------------------

/**
 * Invalida `['calendario']` além da raiz do pilar: treino finalizado e
 * horário de fluxograma (aula de treino) alimentam o Calendário, que lê sob
 * sua própria chave. Mesma correção aplicada em `estudos/hooks.ts` — sem
 * ela, o Calendário ficava com dado velho até o `staleTime` vencer.
 */
function useMutationTreino<TVariaveis, TResultado = void>(
  fn: (variaveis: TVariaveis) => Promise<TResultado>,
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

// --- Sessão em andamento (resolução 10.21) ----------------------------------

/**
 * A sessão aberta, se houver.
 *
 * Consultada por toda a aplicação, então tem chave própria e é invalidada junto
 * com a raiz de treino — é o que permite o aviso de "continuar" aparecer na Home
 * sem que a Home precise saber nada sobre execução.
 */
export function useExecucaoAberta() {
  return useQuery({
    queryKey: chaves.execucaoAberta(),
    queryFn: api.execucaoAberta,
  })
}

/**
 * Grava uma série, criando a sessão se ainda não existir.
 *
 * A criação preguiçosa é deliberada: abrir o diálogo e fechar sem anotar nada não
 * deixa lixo no banco, e "em andamento" passa a significar "tem pelo menos uma
 * série gravada" — que é o único estado em que retomar faz sentido. Como o banco
 * só admite uma sessão aberta, um registro à toa também bloquearia o próximo
 * treino.
 *
 * Sem toast de sucesso: são muitas escritas seguidas durante um treino, e um
 * aviso por série viraria ruído. O erro continua avisando.
 */
export function useSalvarSerie() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      execucaoId,
      treinoId,
      data,
      serie,
    }: {
      execucaoId: string | null
      treinoId: string
      data: string
      serie: Omit<api.NovaSerie, 'execucao_treino_id'>
    }) => {
      const criandoAgora = execucaoId === null
      const id = execucaoId ?? (await api.iniciarExecucao(treinoId, data))

      try {
        const serieId = await api.salvarSerie({
          ...serie,
          execucao_treino_id: id,
        })
        return { execucaoId: id, serieId }
      } catch (erro) {
        /*
         * Desfaz a sessão que acabou de ser criada se a série não entrou.
         *
         * Sem isto sobra uma sessão aberta e vazia — e, como o banco só admite
         * uma aberta, ela travaria o início de qualquer outro treino sem que
         * exista nada na tela para fechá-la.
         */
        if (criandoAgora) {
          await api.excluirExecucao(id).catch(() => undefined)
        }
        throw erro
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chaves.raiz })
    },
    onError: (erro: Error) => toast.error(erro.message),
  })
}

export function useAtualizarSerie() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      dados,
    }: {
      id: string
      dados: Parameters<typeof api.atualizarSerie>[1]
    }) => api.atualizarSerie(id, dados),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chaves.raiz })
    },
    onError: (erro: Error) => toast.error(erro.message),
  })
}

export function useExcluirSerie() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.excluirSerie,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chaves.raiz })
    },
    onError: (erro: Error) => toast.error(erro.message),
  })
}

/** Data, horário e duração da sessão (resolução 10.24). */
export function useAtualizarSessao() {
  return useMutationTreino(
    ({
      id,
      dados,
    }: {
      id: string
      dados: Parameters<typeof api.atualizarSessao>[1]
    }) => api.atualizarSessao(id, dados),
    'Sessão atualizada',
  )
}

/**
 * Uma sessão específica, para o editor do histórico.
 *
 * `enabled` desligado sem id: o mesmo diálogo serve a sessão em andamento (que vem
 * de `useExecucaoAberta`) e a finalizada, e sem id não há nada a buscar.
 */
export function useExecucaoPorId(id: string | undefined) {
  return useQuery({
    queryKey: chaves.execucaoPorId(id),
    queryFn: () => api.execucaoPorId(id as string),
    enabled: id !== undefined,
  })
}

export function useFinalizarExecucao() {
  return useMutationTreino(api.finalizarExecucao, 'Treino registrado')
}

export function usePulados(de?: string, ate?: string) {
  return useQuery({
    queryKey: chaves.pulados(de, ate),
    queryFn: () => api.listarPulados(de, ate),
  })
}

/**
 * Marca o exercício como pulado, criando a sessão se ainda não existir.
 *
 * Pular pode ser a primeira ação do treino — a máquina já estava ocupada quando
 * você chegou — então precisa da mesma criação preguiçosa e do mesmo rollback de
 * `useSalvarSerie`, senão uma falha deixaria sessão vazia travando o resto.
 *
 * Sem toast: pular é parte do fluxo do treino, não um evento a celebrar.
 */
export function usePularExercicio() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      execucaoId,
      treinoId,
      data,
      exercicioId,
    }: {
      execucaoId: string | null
      treinoId: string
      data: string
      exercicioId: string
    }) => {
      const criandoAgora = execucaoId === null
      const id = execucaoId ?? (await api.iniciarExecucao(treinoId, data))

      try {
        await api.pularExercicio(id, exercicioId)
        return { execucaoId: id }
      } catch (erro) {
        if (criandoAgora) {
          await api.excluirExecucao(id).catch(() => undefined)
        }
        throw erro
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chaves.raiz })
    },
    onError: (erro: Error) => toast.error(erro.message),
  })
}

export function useDesfazerPulo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      execucaoId,
      exercicioId,
    }: {
      execucaoId: string
      exercicioId: string
    }) => api.desfazerPulo(execucaoId, exercicioId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chaves.raiz })
    },
    onError: (erro: Error) => toast.error(erro.message),
  })
}

/**
 * Descarta a sessão aberta inteira.
 *
 * Faltava uma saída: "Finalizar" exige ao menos uma série gravada, então desfazer
 * a última série deixava a sessão aberta e vazia — travando o início de qualquer
 * outro treino, já que o banco só admite uma aberta.
 */
export function useDescartarExecucao() {
  return useMutationTreino(api.excluirExecucao, 'Treino descartado')
}

// --- Biblioteca de exercícios e tipos (resolução 10.18) ---------------------

export function useCriarExercicioBase() {
  return useMutationTreino(api.criarExercicioBase, 'Exercício criado')
}

export function useAtualizarExercicioBase() {
  return useMutationTreino(
    ({
      id,
      dados,
    }: {
      id: string
      dados: Parameters<typeof api.atualizarExercicioBase>[1]
    }) => api.atualizarExercicioBase(id, dados),
    'Exercício atualizado na biblioteca',
  )
}

export function useExcluirExercicioBase() {
  return useMutationTreino(
    api.excluirExercicioBase,
    'Exercício removido da biblioteca',
  )
}

export function useCriarTipoTreino() {
  return useMutationTreino(api.criarTipoTreino, 'Tipo criado')
}

export function useAtualizarTipoTreino() {
  return useMutationTreino(
    ({
      id,
      dados,
    }: {
      id: string
      dados: Parameters<typeof api.atualizarTipoTreino>[1]
    }) => api.atualizarTipoTreino(id, dados),
    'Tipo atualizado',
  )
}

export function useExcluirTipoTreino() {
  return useMutationTreino(api.excluirTipoTreino, 'Tipo removido')
}

export function useCriarTreino() {
  return useMutationTreino(api.criarTreino, 'Treino criado')
}

export function useAtualizarTreino() {
  return useMutationTreino(
    ({
      id,
      dados,
    }: {
      id: string
      dados: Parameters<typeof api.atualizarTreino>[1]
    }) => api.atualizarTreino(id, dados),
    'Treino atualizado',
  )
}

export function useExcluirTreino() {
  return useMutationTreino(api.excluirTreino, 'Treino excluído')
}

export function useCriarExercicio() {
  return useMutationTreino(api.criarExercicio, 'Exercício adicionado')
}

export function useAtualizarExercicio() {
  return useMutationTreino(
    ({
      id,
      dados,
    }: {
      id: string
      dados: Parameters<typeof api.atualizarExercicio>[1]
    }) => api.atualizarExercicio(id, dados),
    'Exercício atualizado',
  )
}

export function useExcluirExercicio() {
  return useMutationTreino(api.excluirExercicio, 'Exercício removido')
}

export function useExcluirExecucao() {
  return useMutationTreino(api.excluirExecucao, 'Execução removida')
}

export function useSalvarRegistroCorporal() {
  return useMutationTreino(api.salvarRegistroCorporal, 'Registro salvo')
}

export function useExcluirRegistroCorporal() {
  return useMutationTreino(api.excluirRegistroCorporal, 'Registro excluído')
}

export function useCriarLesao() {
  return useMutationTreino(api.criarLesao, 'Lesão registrada')
}

export function useAtualizarLesao() {
  return useMutationTreino(
    ({
      id,
      dados,
    }: {
      id: string
      dados: Parameters<typeof api.atualizarLesao>[1]
    }) => api.atualizarLesao(id, dados),
    'Lesão atualizada',
  )
}

export function useExcluirLesao() {
  return useMutationTreino(api.excluirLesao, 'Lesão removida')
}

export function useCriarTreinoAgendado() {
  return useMutationTreino(api.criarTreinoAgendado, 'Treino agendado')
}

/** Move data e/ou horário — usado pelo arrasto no Calendário. */
export function useAtualizarTreinoAgendado() {
  return useMutationTreino(
    ({
      id,
      dados,
    }: {
      id: string
      dados: Parameters<typeof api.atualizarTreinoAgendado>[1]
    }) => api.atualizarTreinoAgendado(id, dados),
    'Treino remarcado',
  )
}

export function useExcluirTreinoAgendado() {
  return useMutationTreino(api.excluirTreinoAgendado, 'Treino removido da agenda')
}
