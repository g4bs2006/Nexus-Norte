import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as api from './api'

export const chaves = {
  raiz: ['fluxograma'] as const,
  excecoes: (de: string, ate: string) =>
    ['fluxograma', 'excecoes', de, ate] as const,
}

/**
 * Raízes invalidadas por qualquer exceção.
 *
 * Uma exceção muda o que quatro telas mostram: os checks do dia na Home, as
 * aulas de hoje em Estudos, a frequência da semana em Treino e a grade do
 * Calendário. Invalidar só `['fluxograma']` deixaria as outras exibindo a
 * ocorrência que acabou de ser cancelada.
 */
const RAIZES_AFETADAS = [
  ['fluxograma'],
  ['estudos'],
  ['treino'],
  ['calendario'],
] as const

export function useExcecoes(de: string, ate: string) {
  return useQuery({
    queryKey: chaves.excecoes(de, ate),
    queryFn: () => api.listarExcecoes(de, ate),
  })
}

function useMutationExcecao<TEntrada>(
  fn: (entrada: TEntrada) => Promise<void>,
  mensagemSucesso: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      for (const queryKey of RAIZES_AFETADAS) {
        void queryClient.invalidateQueries({ queryKey })
      }
      toast.success(mensagemSucesso)
    },
    onError: (erro: Error) => toast.error(erro.message),
  })
}

export function useCancelarOcorrencia() {
  return useMutationExcecao(api.cancelarOcorrencia, 'Ocorrência cancelada')
}

export function useRemarcarOcorrencia() {
  return useMutationExcecao(api.remarcarOcorrencia, 'Ocorrência remarcada')
}

export function useLimparExcecao() {
  return useMutationExcecao(api.limparExcecao, 'Volta a seguir o padrão')
}
