import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as api from './caixa-api'

export const useCartoes = () => useQuery({ queryKey: ['financeiro', 'cartoes'], queryFn: api.listarCartoes })
export const useEventosFinanceiros = () => useQuery({ queryKey: ['financeiro', 'eventos'], queryFn: api.listarEventosFinanceiros })
export const useSaldoReferencia = (hoje: string) => useQuery({ queryKey: ['financeiro', 'saldo-referencia', hoje], queryFn: () => api.obterSaldoReferencia(hoje) })
export const useLancamentosCaixa = (ate: string) => useQuery({ queryKey: ['financeiro', 'caixa', ate], queryFn: () => api.listarLancamentosCaixa(ate) })

function useSalvar<T>(fn: (dados: T) => Promise<void>, mensagem: string) {
  const cliente = useQueryClient()
  return useMutation({ mutationFn: fn, onSuccess: () => {
    void cliente.invalidateQueries({ queryKey: ['financeiro'] })
    void cliente.invalidateQueries({ queryKey: ['calendario'] })
    toast.success(mensagem)
  }, onError: (erro: Error) => toast.error(erro.message) })
}
export const useSalvarCartao = () => useSalvar(api.salvarCartao, 'Cartão salvo')
export const useExcluirCartao = () => useSalvar(api.excluirCartao, 'Cartão excluído')
export const useSalvarEventoFinanceiro = () => useSalvar(api.salvarEventoFinanceiro, 'Evento salvo')
export const useExcluirEventoFinanceiro = () => useSalvar(api.excluirEventoFinanceiro, 'Evento excluído')
export const useSalvarSaldoReferencia = () => useSalvar(api.salvarSaldoReferencia, 'Saldo reconciliado')
