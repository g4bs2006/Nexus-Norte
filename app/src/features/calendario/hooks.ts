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
  sonoRealizado: (de: string, ate: string) =>
    ['calendario', 'sono-realizado', de, ate] as const,
  conclusoes: (de: string, ate: string) =>
    ['calendario', 'conclusoes', de, ate] as const,
  marcos: () => ['calendario', 'marcos'] as const,
  execucoesTreino: (de: string, ate: string) =>
    ['calendario', 'execucoes-treino', de, ate] as const,
  sessoesEstudo: (de: string, ate: string) =>
    ['calendario', 'sessoes-estudo', de, ate] as const,
  nomes: () => ['calendario', 'nomes'] as const,
}

/**
 * `comCarga` liga as duas consultas que só a faixa de carga usa.
 *
 * Desligado por padrão porque a Home também chama este hook, e lá elas seriam
 * duas requisições por nada. Ficam fora de `consultas` quando desligadas: uma
 * query desabilitada permanece com status `pending` no React Query, e contá-la
 * deixaria `carregando` verdadeiro para sempre.
 */
export function useFontesCalendario(
  de: string,
  ate: string,
  { comCarga = false }: { comCarga?: boolean } = {},
) {
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
  // Alimentam a faixa de carga: sono contra a meta, e check que não saiu
  const sonoFeito = useQuery({
    queryKey: chaves.sonoRealizado(de, ate),
    queryFn: () => api.sonoRealizado(de, ate),
    enabled: comCarga,
  })
  const conclusoes = useQuery({
    queryKey: chaves.conclusoes(de, ate),
    queryFn: () => api.conclusoesNoIntervalo(de, ate),
    enabled: comCarga,
  })
  /*
   * O que ACONTECEU, não o que estava previsto (resolução 10.31). Sem estas duas,
   * a agenda era só uma projeção do fluxograma: treino registrado fora do plano
   * não tinha por onde aparecer.
   *
   * Ficam ligadas sempre, inclusive na Home: `eventosComPrazo` filtra por
   * `ehImportante`, então elas não poluem os próximos eventos, mas a Home usa a
   * mesma lista e não deve divergir do calendário.
   */
  const execucoesTreino = useQuery({
    queryKey: chaves.execucoesTreino(de, ate),
    queryFn: () => api.execucoesTreinoNoIntervalo(de, ate),
  })
  const sessoesEstudo = useQuery({
    queryKey: chaves.sessoesEstudo(de, ate),
    queryFn: () => api.sessoesEstudoNoIntervalo(de, ate),
  })

  const materias = useQuery({
    queryKey: [...chaves.nomes(), 'materias'],
    queryFn: api.nomesMaterias,
  })
  const periodos = useQuery({
    queryKey: [...chaves.nomes(), 'periodo-materias'],
    queryFn: api.periodoMaterias,
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
    execucoesTreino,
    sessoesEstudo,
    materias,
    treinos,
    periodos,
    ...(comCarga ? [sonoFeito, conclusoes] : []),
  ]

  return {
    fontes: {
      avaliacoes: avaliacoes.data ?? [],
      fluxograma: fluxograma.data ?? [],
      excecoes: excecoes.data ?? [],
      contas: contas.data ?? [],
      planejamentoSono: sono.data ?? [],
      marcos: marcos.data ?? [],
      execucoesTreino: execucoesTreino.data ?? [],
      sessoesEstudo: sessoesEstudo.data ?? [],
      nomePorMateria: materias.data ?? new Map<string, string>(),
      nomePorTreino: treinos.data ?? new Map<string, string>(),
      periodoPorMateria: periodos.data,
    },
    /*
     * Fora de `fontes` de propósito: `construirEventos` não usa nenhum dos dois.
     * Só a faixa de carga usa, e misturar aqui faria parecer que viram evento.
     */
    carga: {
      sonoRealizado: sonoFeito.data ?? [],
      conclusoes: conclusoes.data ?? [],
    },
    carregando: consultas.some((consulta) => consulta.isPending),
    erro: consultas.find((consulta) => consulta.isError)?.error ?? null,
  }
}
