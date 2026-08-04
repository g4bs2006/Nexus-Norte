import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Tema = 'claro' | 'escuro' | 'sistema'

interface EstadoUI {
  tema: Tema
  sidebarColapsada: boolean
  setTema: (tema: Tema) => void
  alternarSidebar: () => void
}

/**
 * Store mínimo de UI (plano 1.1): tema e estado da sidebar.
 * Persistido em localStorage para sobreviver a reloads.
 */
export const useUIStore = create<EstadoUI>()(
  persist(
    (set) => ({
      tema: 'sistema',
      sidebarColapsada: false,
      setTema: (tema) => set({ tema }),
      alternarSidebar: () =>
        set((estado) => ({ sidebarColapsada: !estado.sidebarColapsada })),
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
