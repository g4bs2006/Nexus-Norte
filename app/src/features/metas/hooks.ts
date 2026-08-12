import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as api from './api'

export const chaves = {
  raiz: ['metas'] as const,
  lista: () => ['metas', 'lista'] as const,
  progresso: (metaId: string) => ['metas', 'progresso', metaId] as const,
  checkins: (metaId: string) => ['metas', 'checkins', metaId] as const,
  checkinsDoDia: (data: string) => ['metas', 'checkins-do-dia', data] as const,
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

/**
 * Check-ins de um dia, de todas as metas — uma requisição para o bloco de
 * checks da Home, em vez de uma por hábito ligado.
 */
export function useCheckinsDoDia(data: string) {
  return useQuery({
    queryKey: chaves.checkinsDoDia(data),
    queryFn: () => api.listarCheckinsDoDia(data),
  })
}

function useMutationMetas<TVariaveis>(
  fn: (variaveis: TVariaveis) => Promise<void>,
  /**
   * `null` = sem toast de sucesso.
   *
   * Existe para as ações que se repetem todo dia: um check que anuncia "salvo"
   * a cada clique vira ruído, e é por isso que os vizinhos dele no bloco do dia
   * (`useSalvarCheck`, `useDefinirConclusao`) também só falam quando dá erro.
   */
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

/**
 * As duas mutations do bloco de checks do dia, sem toast de sucesso.
 *
 * São as mesmas escritas de `useAlternarCheckin`/`useAtualizarMeta` — o que
 * muda é só o silêncio, para a meta se comportar como os outros checks do dia
 * em vez de comemorar cada tique.
 */
export function useAlternarCheckinDoDia() {
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

export function useConcluirMetaDoDia() {
  return useMutationMetas(
    ({ id, concluida }: { id: string; concluida: boolean }) =>
      api.atualizarMeta(id, { concluida }),
    null,
  )
}
