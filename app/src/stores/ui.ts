import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Tema = 'claro' | 'escuro' | 'sistema'

interface EstadoUI {
  tema: Tema
  /**
   * Última categoria usada no lançamento rápido. Persistida para que o campo
   * abra já preenchido: lançar um gasto é a ação mais repetida do sistema, e
   * escolher a categoria de novo a cada vez é a maior parte da fricção.
   */
  ultimaCategoriaLancamento: string | null
  /**
   * Trilho de conhecimento aberto na página da nota.
   *
   * Persistido porque é preferência de trabalho, não estado de tela: quem
   * escreve com o trilho fechado quer ele fechado amanhã também, e reabri-lo a
   * cada nota seria a mesma fricção que a categoria do lançamento resolve.
   */
  trilhoNotaAberto: boolean
  setTema: (tema: Tema) => void
  setUltimaCategoriaLancamento: (id: string) => void
  alternarTrilhoNota: () => void
}

/**
 * Store mínimo de UI (plano 1.1): tema e preferências persistidas.
 * Persistido em localStorage para sobreviver a reloads.
 */
export const useUIStore = create<EstadoUI>()(
  persist(
    (set) => ({
      tema: 'sistema',
      ultimaCategoriaLancamento: null,
      // Abre por padrão: o grafo é a tese da feature, e quem nunca o viu não
      // sabe que existe para procurá-lo.
      trilhoNotaAberto: true,
      setTema: (tema) => set({ tema }),
      setUltimaCategoriaLancamento: (id) =>
        set({ ultimaCategoriaLancamento: id }),
      alternarTrilhoNota: () =>
        set((estado) => ({ trilhoNotaAberto: !estado.trilhoNotaAberto })),
    }),
    { name: 'nexus-ui' },
  ),
)

/** Resolve 'sistema' para o tema efetivo, consultando a preferência do OS. */
export function resolverTema(tema: Tema): 'claro' | 'escuro' {
  if (tema !== 'sistema') return tema
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'escuro'
    : 'claro'
}
