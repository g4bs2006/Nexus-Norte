import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as api from './api'

export const chaves = {
  raiz: ['eventos'] as const,
  intervalo: (de: string, ate: string) => ['eventos', de, ate] as const,
}

export function useEventosLivres(de: string, ate: string) {
  return useQuery({
    queryKey: chaves.intervalo(de, ate),
    queryFn: () => api.listarEventosLivres(de, ate),
  })
}

function useMutationEventoLivre<TVariaveis>(
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

export function useCriarEventoLivre() {
  return useMutationEventoLivre(api.criarEventoLivre, 'Evento criado')
}

export function useAtualizarEventoLivre() {
  return useMutationEventoLivre(
    ({
      id,
      dados,
    }: {
      id: string
      dados: Parameters<typeof api.atualizarEventoLivre>[1]
    }) => api.atualizarEventoLivre(id, dados),
    'Evento atualizado',
  )
}

export function useExcluirEventoLivre() {
  return useMutationEventoLivre(api.excluirEventoLivre, 'Evento removido')
}
