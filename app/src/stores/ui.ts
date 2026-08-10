import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Tema = 'claro' | 'escuro' | 'sistema'

interface EstadoUI {
  tema: Tema
  sidebarColapsada: boolean
  /**
   * Última categoria usada no lançamento rápido. Persistida para que o campo
   * abra já preenchido: lançar um gasto é a ação mais repetida do sistema, e
   * escolher a categoria de novo a cada vez é a maior parte da fricção.
   */
  ultimaCategoriaLancamento: string | null
  setTema: (tema: Tema) => void
  alternarSidebar: () => void
  setUltimaCategoriaLancamento: (id: string) => void
}

/**
 * Store mínimo de UI (plano 1.1): tema e estado da sidebar.
 * Persistido em localStorage para sobreviver a reloads.
 */
export const useUIStore = create<EstadoUI>()(
  persist(
    (set) => ({
      tema: 'sistema',
      sidebarColapsada: true,
      ultimaCategoriaLancamento: null,
      setTema: (tema) => set({ tema }),
      alternarSidebar: () =>
        set((estado) => ({ sidebarColapsada: !estado.sidebarColapsada })),
      setUltimaCategoriaLancamento: (id) =>
        set({ ultimaCategoriaLancamento: id }),
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
