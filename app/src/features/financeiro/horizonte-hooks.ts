import { addMonths, startOfMonth } from 'date-fns'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { paraISO } from '@/lib/datas'
import { useCategorias, useResumoMensal } from './hooks'
import { useCartoes, useEventosFinanceiros, useLancamentosCaixa, useSaldoReferencia } from './caixa-hooks'
import { categoriasElegiveisParaMediaVariavel, estimativaVariavelPorCategoria, mesesComHistorico } from './projecao'
import type { ParametrosHorizonte } from './horizonte'

interface ConfigHorizonte { dias: number; orcamentoManual: number | null; minimo: number; confortavel: number }
export const useConfigHorizonte = create<ConfigHorizonte & { alterar: (config: Partial<ConfigHorizonte>) => void }>()(persist(set => ({ dias: 60, orcamentoManual: null, minimo: 0, confortavel: 0, alterar: config => set(config) }), { name: 'nexus-horizonte-v1' }))

export function useDadosHorizonte() {
  const hoje = paraISO(new Date())
  const dataHoje = new Date(`${hoje}T12:00:00`)
  const config = useConfigHorizonte()
  const categorias = useCategorias()
  const eventos = useEventosFinanceiros()
  const cartoes = useCartoes()
  const saldo = useSaldoReferencia(hoje)
  const lancamentos = useLancamentosCaixa(hoje)
  const janela = Array.from({ length: 3 }, (_, i) => paraISO(startOfMonth(addMonths(dataHoje, i - 3))))
  const resumo = useResumoMensal(janela[0]!, janela[2]!)
  const consultas = [categorias, eventos, cartoes, saldo, lancamentos, resumo]
  const categoriasVariaveis = categoriasElegiveisParaMediaVariavel(categorias.data ?? [], (eventos.data ?? []).filter(e => e.termino_tipo !== 'parcelas'))
  const estimativa = estimativaVariavelPorCategoria(resumo.data ?? [], categoriasVariaveis, janela)
  const media = Object.values(estimativa.media).reduce((s, v) => s + v, 0)
  const orcamento = config.orcamentoManual ?? media
  const params: ParametrosHorizonte = {
    hoje, dias: config.dias, saldoReferencia: saldo.data ?? null, eventos: eventos.data ?? [], lancamentos: lancamentos.data ?? [],
    orcamentoMensalVariavel: orcamento, categoriasVariaveis,
    colchaoMinimo: config.minimo, colchaoConfortavel: config.confortavel,
    nomesCartoes: new Map(cartoes.data?.map(c => [c.id, c.nome]) ?? []),
  }
  return { params, categorias: categorias.data ?? [], eventos: eventos.data ?? [], estimativa, media, config,
    mesesHistorico: mesesComHistorico(resumo.data ?? [], janela),
    carregando: consultas.some(q => q.isPending), erro: consultas.find(q => q.isError)?.error,
  }
}
