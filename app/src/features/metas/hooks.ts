import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as api from './api'

export const chaves = {
  raiz: ['metas'] as const,
  lista: () => ['metas', 'lista'] as const,
  progresso: (metaId: string) => ['metas', 'progresso', metaId] as const,
  checkins: (metaId: string) => ['metas', 'checkins', metaId] as const,
}

export function useMetas() {
  return useQuery({ queryKey: chaves.lista(), queryFn: api.listarMetas })
}

/** `ativo` evita chamar o RPC para metas sem link de pilar ou de outro tipo. */
export function useProgressoMeta(metaId: string, ativo: boolean) {
  return useQuery({
    queryKey: chaves.progresso(metaId),
    queryFn: () => api.progressoMeta(metaId),
    enabled: ativo,
  })
}

/** `ativo` evita buscar check-ins para metas que não são de hábito. */
export function useCheckinsMeta(metaId: string, ativo: boolean) {
  return useQuery({
    queryKey: chaves.checkins(metaId),
    queryFn: () => api.listarCheckins(metaId),
    enabled: ativo,
  })
}

function useMutationMetas<TVariaveis>(
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

export function useExcluirMeta() {
  return useMutationMetas(api.excluirMeta, 'Meta excluída')
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
    'Check-in atualizado',
  )
}
