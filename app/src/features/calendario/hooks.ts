import { useQuery } from '@tanstack/react-query'
import * as api from './api'

/**
 * O calendário só lê — não há mutations aqui. As chaves ficam sob `calendario`
 * mas as queries reaproveitam o cache padrão: os dados de origem são
 * invalidados pelos próprios pilares quando algo muda.
 */
export const chaves = {
  raiz: ['calendario'] as const,
  avaliacoes: () => ['calendario', 'avaliacoes'] as const,
  fluxograma: () => ['calendario', 'fluxograma'] as const,
  excecoes: (de: string, ate: string) =>
    ['calendario', 'excecoes', de, ate] as const,
  contas: () => ['calendario', 'contas'] as const,
  sono: () => ['calendario', 'sono'] as const,
  marcos: () => ['calendario', 'marcos'] as const,
  nomes: () => ['calendario', 'nomes'] as const,
}

export function useFontesCalendario(de: string, ate: string) {
  const avaliacoes = useQuery({
    queryKey: chaves.avaliacoes(),
    queryFn: api.avaliacoesComData,
  })
  const fluxograma = useQuery({
    queryKey: chaves.fluxograma(),
    queryFn: api.fluxogramaCompleto,
  })
  const excecoes = useQuery({
    queryKey: chaves.excecoes(de, ate),
    queryFn: () => api.excecoesNoIntervalo(de, ate),
  })
  const contas = useQuery({
    queryKey: chaves.contas(),
    queryFn: api.lancamentosParaContas,
  })
  const sono = useQuery({
    queryKey: chaves.sono(),
    queryFn: api.planejamentoSono,
  })
  const marcos = useQuery({
    queryKey: chaves.marcos(),
    queryFn: api.marcosComData,
  })
  const materias = useQuery({
    queryKey: [...chaves.nomes(), 'materias'],
    queryFn: api.nomesMaterias,
  })
  const treinos = useQuery({
    queryKey: [...chaves.nomes(), 'treinos'],
    queryFn: api.nomesTreinos,
  })

  const consultas = [
    avaliacoes,
    fluxograma,
    excecoes,
    contas,
    sono,
    marcos,
    materias,
    treinos,
  ]

  return {
    fontes: {
      avaliacoes: avaliacoes.data ?? [],
      fluxograma: fluxograma.data ?? [],
      excecoes: excecoes.data ?? [],
      contas: contas.data ?? [],
      planejamentoSono: sono.data ?? [],
      marcos: marcos.data ?? [],
      nomePorMateria: materias.data ?? new Map<string, string>(),
      nomePorTreino: treinos.data ?? new Map<string, string>(),
    },
    carregando: consultas.some((consulta) => consulta.isPending),
    erro: consultas.find((consulta) => consulta.isError)?.error ?? null,
  }
}
