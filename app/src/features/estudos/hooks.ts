import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as api from './api'

/**
 * Chaves de cache de Estudos. Como no Financeiro, toda mutation invalida a raiz
 * `['estudos']`: nota, falta e configuração de média afetam a média resumo, o
 * semáforo de risco e os cards de listagem ao mesmo tempo.
 */
export const chaves = {
  raiz: ['estudos'] as const,
  materias: () => ['estudos', 'materias'] as const,
  avaliacoes: () => ['estudos', 'avaliacoes'] as const,
  faltas: () => ['estudos', 'faltas'] as const,
  sessoes: (de?: string, ate?: string) =>
    ['estudos', 'sessoes', de ?? 'todas', ate ?? 'todas'] as const,
  configMedia: (materiaId: string) =>
    ['estudos', 'config-media', materiaId] as const,
  documentos: (materiaId: string) =>
    ['estudos', 'documentos', materiaId] as const,
  registroListas: (materiaId: string) =>
    ['estudos', 'registro-listas', materiaId] as const,
  notas: (materiaId: string) => ['estudos', 'notas', materiaId] as const,
  fluxograma: () => ['estudos', 'fluxograma'] as const,
  conclusoes: (data: string) => ['estudos', 'conclusoes', data] as const,
}

// --- Leitura ----------------------------------------------------------------

export function useMaterias() {
  return useQuery({ queryKey: chaves.materias(), queryFn: api.listarMaterias })
}

export function useAvaliacoes() {
  return useQuery({
    queryKey: chaves.avaliacoes(),
    queryFn: api.listarAvaliacoes,
  })
}

export function useFaltas() {
  return useQuery({ queryKey: chaves.faltas(), queryFn: api.listarFaltas })
}

export function useSessoes(de?: string, ate?: string) {
  return useQuery({
    queryKey: chaves.sessoes(de, ate),
    queryFn: () => api.listarSessoes(de, ate),
  })
}

export function useConfigMedia(materiaId: string | undefined) {
  return useQuery({
    queryKey: chaves.configMedia(materiaId ?? ''),
    queryFn: () => api.obterConfigMedia(materiaId as string),
    enabled: Boolean(materiaId),
  })
}

export function useDocumentos(materiaId: string | undefined) {
  return useQuery({
    queryKey: chaves.documentos(materiaId ?? ''),
    queryFn: () => api.listarDocumentos(materiaId as string),
    enabled: Boolean(materiaId),
  })
}

export function useRegistroListas(materiaId: string | undefined) {
  return useQuery({
    queryKey: chaves.registroListas(materiaId ?? ''),
    queryFn: () => api.listarRegistroListas(materiaId as string),
    enabled: Boolean(materiaId),
  })
}

export function useNotas(materiaId: string | undefined) {
  return useQuery({
    queryKey: chaves.notas(materiaId ?? ''),
    queryFn: () => api.listarNotas(materiaId as string),
    enabled: Boolean(materiaId),
  })
}

export function useFluxograma() {
  return useQuery({
    queryKey: chaves.fluxograma(),
    queryFn: api.listarFluxograma,
  })
}

// --- Escrita ----------------------------------------------------------------

/**
 * Invalida `['calendario']` além da raiz do pilar: aula (fluxograma), prova
 * (avaliação) e sessão de estudo alimentam o Calendário, que lê sob sua
 * própria chave (`['calendario', ...]`). Sem isso, criar uma aula não
 * aparecia lá até o `staleTime` de 5 min vencer ou até um reload manual —
 * era exatamente o bug relatado com "Física IV" numa terça (ago/2026).
 * Documento, falta e lista não afetam o Calendário, mas invalidar a mais é
 * inofensivo — mesmo raciocínio já usado em `fluxograma/hooks.ts`.
 */
function useMutationEstudos<TVariaveis>(
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

export function useCriarMateria() {
  return useMutationEstudos(api.criarMateria, 'Matéria criada')
}

export function useAtualizarMateria() {
  return useMutationEstudos(
    ({
      id,
      dados,
    }: {
      id: string
      dados: Parameters<typeof api.atualizarMateria>[1]
    }) => api.atualizarMateria(id, dados),
    'Matéria atualizada',
  )
}

export function useExcluirMateria() {
  return useMutationEstudos(api.excluirMateria, 'Matéria excluída')
}

export function useCriarAvaliacao() {
  return useMutationEstudos(api.criarAvaliacao, 'Avaliação criada')
}

export function useAtualizarAvaliacao() {
  return useMutationEstudos(
    ({
      id,
      dados,
    }: {
      id: string
      dados: Parameters<typeof api.atualizarAvaliacao>[1]
    }) => api.atualizarAvaliacao(id, dados),
    'Avaliação atualizada',
  )
}

export function useExcluirAvaliacao() {
  return useMutationEstudos(api.excluirAvaliacao, 'Avaliação excluída')
}

export function useSalvarConfigMedia() {
  return useMutationEstudos(
    ({
      materiaId,
      config,
    }: {
      materiaId: string
      config: Parameters<typeof api.salvarConfigMedia>[1]
    }) => api.salvarConfigMedia(materiaId, config),
    'Cálculo da média atualizado',
  )
}

export function useCriarFalta() {
  return useMutationEstudos(api.criarFalta, 'Falta registrada')
}

export function useAtualizarFalta() {
  return useMutationEstudos(
    ({
      id,
      dados,
    }: {
      id: string
      dados: Parameters<typeof api.atualizarFalta>[1]
    }) => api.atualizarFalta(id, dados),
    'Falta atualizada',
  )
}

export function useExcluirFalta() {
  return useMutationEstudos(api.excluirFalta, 'Falta removida')
}

export function useCriarSessao() {
  return useMutationEstudos(api.criarSessao, 'Sessão registrada')
}

export function useAtualizarSessao() {
  return useMutationEstudos(
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

export function useExcluirSessao() {
  return useMutationEstudos(api.excluirSessao, 'Sessão removida')
}

export function useCriarRegistroLista() {
  return useMutationEstudos(api.criarRegistroLista, 'Lista registrada')
}

export function useAtualizarRegistroLista() {
  return useMutationEstudos(
    ({
      id,
      dados,
    }: {
      id: string
      dados: Parameters<typeof api.atualizarRegistroLista>[1]
    }) => api.atualizarRegistroLista(id, dados),
    'Lista atualizada',
  )
}

export function useExcluirRegistroLista() {
  return useMutationEstudos(api.excluirRegistroLista, 'Registro removido')
}

export function useCriarNota() {
  return useMutationEstudos(api.criarNota, 'Nota criada')
}

export function useAtualizarNota() {
  return useMutationEstudos(
    ({
      id,
      dados,
    }: {
      id: string
      dados: Parameters<typeof api.atualizarNota>[1]
    }) => api.atualizarNota(id, dados),
    'Nota salva',
  )
}

export function useExcluirNota() {
  return useMutationEstudos(api.excluirNota, 'Nota excluída')
}

export function useEnviarDocumento() {
  return useMutationEstudos(api.enviarDocumento, 'Documento enviado')
}

export function useExcluirDocumento() {
  return useMutationEstudos(
    ({ id, storagePath }: { id: string; storagePath: string }) =>
      api.excluirDocumento(id, storagePath),
    'Documento excluído',
  )
}

export function useConclusoes(data: string) {
  return useQuery({
    queryKey: chaves.conclusoes(data),
    queryFn: () => api.listarConclusoes(data),
  })
}

/**
 * Toggle de conclusão. Não emite toast: é um check de rotina, marcado várias
 * vezes ao dia — notificar cada clique seria ruído.
 */
export function useDefinirConclusao() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      fluxogramaId,
      data,
      concluido,
    }: {
      fluxogramaId: string
      data: string
      concluido: boolean
    }) => api.definirConclusao(fluxogramaId, data, concluido),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chaves.raiz })
    },
    onError: (erro: Error) => toast.error(erro.message),
  })
}

export function useCriarFluxograma() {
  return useMutationEstudos(api.criarFluxograma, 'Horário adicionado')
}

export function useAtualizarFluxograma() {
  return useMutationEstudos(
    ({
      id,
      dados,
    }: {
      id: string
      dados: Parameters<typeof api.atualizarFluxograma>[1]
    }) => api.atualizarFluxograma(id, dados),
    'Horário atualizado',
  )
}

export function useExcluirFluxograma() {
  return useMutationEstudos(api.excluirFluxograma, 'Horário removido')
}
