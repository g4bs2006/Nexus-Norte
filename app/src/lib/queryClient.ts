import { QueryClient } from '@tanstack/react-query'

/**
 * Cache configurado para evitar refetch desnecessário ao navegar entre os
 * pilares e voltar para a Home (plano 7.2).
 *
 * Uso pessoal single-user: os dados só mudam quando o próprio usuário escreve,
 * então não há concorrência para justificar refetch agressivo. A invalidação
 * é feita explicitamente nas mutations.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})
