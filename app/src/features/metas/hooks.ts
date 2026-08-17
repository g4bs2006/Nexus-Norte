import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as api from './api'

export const chaves = {
  raiz: ['metas'] as const,
  lista: () => ['metas', 'lista'] as const,
  categorias: () => ['metas', 'categorias'] as const,
  checkins: (metaId: string) => ['metas', 'checkins', metaId] as const,
  checkinsDoDia: (data: string) => ['metas', 'checkins-do-dia', data] as const,
}

// --- Categorias ---

export function useCategoriasMetas() {
  return useQuery({
    queryKey: chaves.categorias(),
    queryFn: api.listarCategoriasMetas,
  })
}

export function useCriarCategoriaMeta() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.criarCategoriaMeta,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chaves.raiz })
      toast.success('Categoria criada')
    },
    onError: (erro: Error) => toast.error(erro.message),
  })
}

export function useAtualizarCategoriaMeta() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      dados,
    }: {
      id: string
      dados: { nome?: string; cor?: string; ordem?: number }
    }) => api.atualizarCategoriaMeta(id, dados),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chaves.raiz })
      toast.success('Categoria atualizada')
    },
    onError: (erro: Error) => toast.error(erro.message),
  })
}

export function useExcluirCategoriaMeta() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.excluirCategoriaMeta,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chaves.raiz })
      toast.success('Categoria removida')
    },
    onError: (erro: Error) => toast.error(erro.message),
  })
}

// --- Metas ---

export function useMetas() {
  return useQuery({
    queryKey: chaves.lista(),
    queryFn: api.listarMetas,
  })
}

function useMutationMetas<TVariaveis>(
  fn: (variaveis: TVariaveis) => Promise<void>,
  mensagemSucesso: string | null,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chaves.raiz })
      if (mensagemSucesso !== null) toast.success(mensagemSucesso)
    },
    onError: (erro: Error) => toast.error(erro.message),
  })
}

export function useCriarMeta() {
  return useMutationMetas(api.criarMeta, 'Meta criada')
}

export function useAtualizarMeta() {
  return useMutationMetas(
    ({
      id,
      dados,
    }: {
      id: string
      dados: Parameters<typeof api.atualizarMeta>[1]
    }) => api.atualizarMeta(id, dados),
    'Meta atualizada',
  )
}

export function useEncerrarMeta() {
  return useMutationMetas(api.encerrarMeta, 'Meta encerrada com sucesso')
}

export function useExcluirMeta() {
  return useMutationMetas(api.excluirMeta, 'Meta excluída')
}

export function useReordenarMetas() {
  return useMutationMetas(api.reordenarMetas, null)
}

// --- Check-ins ---

export function useCheckinsMeta(metaId: string, ativo: boolean) {
  return useQuery({
    queryKey: chaves.checkins(metaId),
    queryFn: () => api.listarCheckins(metaId),
    enabled: ativo,
  })
}

export function useCheckinsDoDia(data: string) {
  return useQuery({
    queryKey: chaves.checkinsDoDia(data),
    queryFn: () => api.listarCheckinsDoDia(data),
  })
}

export function useAlternarCheckin() {
  return useMutationMetas(
    ({
      metaId,
      data,
      feito,
    }: {
      metaId: string
      data: string
      feito: boolean
    }) => api.alternarCheckin(metaId, data, feito),
    null,
  )
}
