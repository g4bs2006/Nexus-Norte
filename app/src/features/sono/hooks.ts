import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as api from './api'

export const chaves = {
  raiz: ['sono'] as const,
  registro: (data: string) => ['sono', 'registro', data] as const,
  planejamento: (diaSemana: number) =>
    ['sono', 'planejamento', diaSemana] as const,
}

export function useRegistroSono(data: string) {
  return useQuery({
    queryKey: chaves.registro(data),
    queryFn: () => api.registroDoDia(data),
  })
}

export function usePlanejamentoSono(diaSemana: number) {
  return useQuery({
    queryKey: chaves.planejamento(diaSemana),
    queryFn: () => api.planejamentoDoDia(diaSemana),
  })
}

export function useSalvarRegistroSono() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.salvarRegistroSono,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chaves.raiz })
      toast.success('Sono registrado')
    },
    onError: (erro: Error) => toast.error(erro.message),
  })
}
