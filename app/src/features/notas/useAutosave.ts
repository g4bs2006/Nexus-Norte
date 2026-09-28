import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import * as api from './api'
import { grafoMudou } from './grafo'
import { chaves } from './hooks'
import { AutosaveNota } from './autosave'
import type { NotaListada } from './types'
export type { EstadoSalvamento } from './autosave'

const sessoes = new Map<string, AutosaveNota>()
const vazio = { titulo: '', conteudo: '', estado: 'salvo' as const }
const semAssinatura = () => () => {}
const snapshotVazio = () => vazio

export function useAutosave(nota: NotaListada | null) {
  const queryClient = useQueryClient()
  const sessao = useMemo(() => {
    if (!nota) return null
    const existente = sessoes.get(nota.id)
    if (existente && (existente.temOuvintes() || existente.temPendencia())) return existente
    const storage = {
      getItem: (chave: string) => localStorage.getItem(chave),
      setItem: (chave: string, valor: string) => localStorage.setItem(chave, valor),
      removeItem: (chave: string) => localStorage.removeItem(chave),
    }
    const nova = new AutosaveNota(nota.id, nota, async (texto, anterior) => {
      const completo = texto.titulo !== anterior.titulo || grafoMudou(anterior.conteudo, texto.conteudo)
      const resultado = completo
        ? await api.salvarNota({ id: nota.id, materiaId: nota.materia_id,
          ...texto, titulo: texto.titulo.trim() || anterior.titulo })
        : await api.salvarConteudo(nota.id, texto.conteudo)
      // Impede uma leitura antiga de substituir a confirmação no cache.
      await queryClient.cancelQueries({
        queryKey: ['notas', 'slug'],
        predicate: (query) => (query.state.data as NotaListada | null | undefined)?.id === nota.id,
      })
      queryClient.setQueriesData<NotaListada | null>(
        { queryKey: ['notas', 'slug'] },
        (cache) => cache?.id === nota.id ? { ...cache, ...texto, ...resultado } : cache,
      )
      if (resultado) {
        const cache = queryClient.getQueryData<NotaListada>(chaves.porSlug(nota.slug))
        if (cache) queryClient.setQueryData(chaves.porSlug(resultado.slug), { ...cache, ...resultado })
      }
      void queryClient.invalidateQueries({ queryKey: chaves.todas() })
      void queryClient.invalidateQueries({ queryKey: chaves.daMateria(nota.materia_id) })
      if (completo) {
        void queryClient.invalidateQueries({ queryKey: chaves.topicos() })
        void queryClient.invalidateQueries({ queryKey: chaves.quebrados(nota.id) })
      }
      return { ...texto, titulo: resultado?.titulo ?? texto.titulo }
    }, storage)
    sessoes.set(nota.id, nova)
    return nova
    // Refetch não substitui uma sessão de edição.
  }, [nota, queryClient])
  const snapshot = useSyncExternalStore(
    sessao?.subscribe ?? semAssinatura, sessao?.getSnapshot ?? snapshotVazio,
  )
  useEffect(() => {
    if (!sessao) return
    void sessao.flush()
    const flush = () => { void sessao.flush() }
    const ocultar = () => { if (document.visibilityState === 'hidden') flush() }
    const antesDeSair = (evento: BeforeUnloadEvent) => {
      if (!sessao.temPendencia()) return
      flush()
      evento.preventDefault()
      evento.returnValue = ''
    }
    window.addEventListener('online', flush)
    window.addEventListener('pagehide', flush)
    window.addEventListener('beforeunload', antesDeSair)
    document.addEventListener('visibilitychange', ocultar)
    return () => {
      window.removeEventListener('online', flush)
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('beforeunload', antesDeSair)
      document.removeEventListener('visibilitychange', ocultar)
      flush()
    }
  }, [sessao])
  return {
    ...snapshot,
    setConteudo: (conteudo: string) => sessao?.editar({ conteudo }),
    setTitulo: (titulo: string) => sessao?.editar({ titulo }),
    flush: () => sessao?.flush(),
    descartar: () => {
      sessao?.descartar()
      if (nota) sessoes.delete(nota.id)
    },
  }
}
