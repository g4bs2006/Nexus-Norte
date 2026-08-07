import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as api from './api'

export const chaves = {
  raiz: ['projetos'] as const,
  projetos: () => ['projetos', 'lista'] as const,
  marcos: () => ['projetos', 'marcos'] as const,
  logs: () => ['projetos', 'logs'] as const,
}

export function useProjetos() {
  return useQuery({ queryKey: chaves.projetos(), queryFn: api.listarProjetos })
}

export function useMarcos() {
  return useQuery({ queryKey: chaves.marcos(), queryFn: api.listarMarcos })
}

export function useLogs() {
  return useQuery({ queryKey: chaves.logs(), queryFn: api.listarLogs })
}

/**
 * Invalida `['calendario']` além da raiz do pilar: marco de projeto vira
 * evento no Calendário, que lê sob sua própria chave. Mesma correção
 * aplicada em `estudos/hooks.ts` e `treino/hooks.ts`.
 */
function useMutationProjetos<TVariaveis>(
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

export function useCriarProjeto() {
  return useMutationProjetos(api.criarProjeto, 'Projeto criado')
}

export function useAtualizarProjeto() {
  return useMutationProjetos(
    ({
      id,
      dados,
    }: {
      id: string
      dados: Parameters<typeof api.atualizarProjeto>[1]
    }) => api.atualizarProjeto(id, dados),
    'Projeto atualizado',
  )
}

export function useExcluirProjeto() {
  return useMutationProjetos(api.excluirProjeto, 'Projeto excluído')
}

export function useCriarMarco() {
  return useMutationProjetos(api.criarMarco, 'Marco criado')
}

export function useAtualizarMarco() {
  return useMutationProjetos(
    ({
      id,
      dados,
    }: {
      id: string
      dados: Parameters<typeof api.atualizarMarco>[1]
    }) => api.atualizarMarco(id, dados),
    'Marco atualizado',
  )
}

export function useExcluirMarco() {
  return useMutationProjetos(api.excluirMarco, 'Marco removido')
}

export function useCriarLog() {
  return useMutationProjetos(api.criarLog, 'Progresso registrado')
}

export function useAtualizarLog() {
  return useMutationProjetos(
    ({
      id,
      dados,
    }: {
      id: string
      dados: Parameters<typeof api.atualizarLog>[1]
    }) => api.atualizarLog(id, dados),
    'Registro atualizado',
  )
}

export function useExcluirLog() {
  return useMutationProjetos(api.excluirLog, 'Registro removido')
}
