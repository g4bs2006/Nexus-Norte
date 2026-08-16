import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as api from './api'

/**
 * Chaves de cache de Notas.
 *
 * Toda mutation invalida a raiz `['notas']` E a raiz `['estudos']`. A primeira
 * porque salvar uma nota mexe no grafo inteiro — backlink de outra nota, tópico
 * novo, link quebrado que deixou de ser. A segunda porque a aba Notas da
 * matéria continua sendo ponto de entrada, e ela vive do lado de Estudos.
 */
export const chaves = {
  raiz: ['notas'] as const,
  todas: () => ['notas', 'todas'] as const,
  daMateria: (materiaId: string) => ['notas', 'materia', materiaId] as const,
  porSlug: (slug: string) => ['notas', 'slug', slug] as const,
  backlinks: (notaId: string) => ['notas', 'backlinks', notaId] as const,
  quebrados: (notaId: string) => ['notas', 'quebrados', notaId] as const,
  topicos: () => ['notas', 'topicos'] as const,
  desenho: (id: string) => ['notas', 'desenho', id] as const,
  busca: (termo: string) => ['notas', 'busca', termo] as const,
  espiada: (slug: string) => ['notas', 'espiada', slug] as const,
}

// --- Leitura ----------------------------------------------------------------

export function useNotas() {
  return useQuery({ queryKey: chaves.todas(), queryFn: api.listarNotas })
}

export function useNotasDaMateria(materiaId: string | undefined) {
  return useQuery({
    queryKey: chaves.daMateria(materiaId ?? ''),
    queryFn: () => api.listarNotasDaMateria(materiaId as string),
    enabled: Boolean(materiaId),
  })
}

export function useNota(slug: string | undefined) {
  return useQuery({
    queryKey: chaves.porSlug(slug ?? ''),
    queryFn: () => api.obterNotaPorSlug(slug as string),
    enabled: Boolean(slug),
  })
}

export function useBacklinks(notaId: string | undefined) {
  return useQuery({
    queryKey: chaves.backlinks(notaId ?? ''),
    queryFn: () => api.listarBacklinks(notaId as string),
    enabled: Boolean(notaId),
  })
}

export function useLinksQuebrados(notaId: string | undefined) {
  return useQuery({
    queryKey: chaves.quebrados(notaId ?? ''),
    queryFn: () => api.listarLinksQuebrados(notaId as string),
    enabled: Boolean(notaId),
  })
}

export function useDesenho(id: string | undefined) {
  return useQuery({
    queryKey: chaves.desenho(id ?? ''),
    queryFn: () => api.obterDesenho(id as string),
    enabled: Boolean(id),
  })
}

/**
 * Busca no conteúdo. Termo vazio não vai ao servidor: a lista completa já está
 * em `useNotas`, e uma consulta para "tudo" seria trabalho jogado fora.
 */
export function useBuscaNotas(termo: string) {
  return useQuery({
    queryKey: chaves.busca(termo),
    queryFn: () => api.buscarNotas(termo),
    enabled: termo.trim() !== '',
  })
}

/**
 * A nota citada, para o cartão do wikilink.
 *
 * `enabled` pelo slug: o cartão só consulta quando de fato há um link sob o
 * mouse. E o cache do React Query faz o resto — passar de novo pelo mesmo link
 * não vai ao servidor.
 */
export function useEspiada(slug: string | null) {
  return useQuery({
    queryKey: chaves.espiada(slug ?? ''),
    queryFn: () => api.espiarNota(slug as string),
    enabled: slug !== null,
  })
}

export function useTopicos() {
  return useQuery({ queryKey: chaves.topicos(), queryFn: api.listarTopicos })
}

// --- Escrita ----------------------------------------------------------------

function useMutationNotas<TVariaveis, TResultado>(
  fn: (variaveis: TVariaveis) => Promise<TResultado>,
  mensagemSucesso: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chaves.raiz })
      void queryClient.invalidateQueries({ queryKey: ['estudos'] })
      toast.success(mensagemSucesso)
    },
    onError: (erro: Error) => toast.error(erro.message),
  })
}

export function useVincularTopico() {
  return useMutationNotas(
    ({ notaId, nomeTopico }: { notaId: string; nomeTopico: string }) =>
      api.vincularTopicoANota(notaId, nomeTopico),
    'Tópico adicionado',
  )
}

export function useDesvincularTopico() {
  return useMutationNotas(
    ({ notaId, topicoId }: { notaId: string; topicoId: string }) =>
      api.desvincularTopicoDaNota(notaId, topicoId),
    'Tópico removido',
  )
}

/**
 * A única mutation que grava conteúdo. Criar e editar são o mesmo caminho —
 * `salvarNota` decide pelo `id`, e ter duas mutations aqui abriria a porta para
 * uma delas esquecer de re-derivar o grafo.
 */
export function useSalvarNota() {
  return useMutationNotas(api.salvarNota, 'Nota salva')
}

export function useFixarNota() {
  return useMutationNotas(
    ({ id, fixada }: { id: string; fixada: boolean }) =>
      api.fixarNota(id, fixada),
    'Nota atualizada',
  )
}

export function useSalvarDesenho() {
  return useMutationNotas(api.salvarDesenho, 'Desenho salvo')
}

export function useExcluirDesenho() {
  return useMutationNotas(api.excluirDesenho, 'Desenho excluído')
}

export function useExcluirNota() {
  return useMutationNotas(api.excluirNota, 'Nota excluída')
}

export function useVincularNotaASessao() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      notaId,
      sessaoId,
    }: {
      notaId: string
      sessaoId: string | null
    }) => api.vincularNotaASessao(notaId, sessaoId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chaves.raiz })
      void queryClient.invalidateQueries({ queryKey: ['estudos'] })
      void queryClient.invalidateQueries({ queryKey: ['calendario'] })
      toast.success('Vínculo da nota atualizado')
    },
    onError: (erro: Error) => toast.error(erro.message),
  })
}
