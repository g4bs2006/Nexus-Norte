import { useEffect } from 'react'
import { resolverTema, useUIStore } from '@/stores/ui'

/**
 * Aplica o tema selecionado na raiz do documento e reage a mudanças da
 * preferência do sistema quando o tema é 'sistema'.
 */
export function useTemaEfetivo(): void {
  const tema = useUIStore((estado) => estado.tema)

  useEffect(() => {
    const aplicar = (): void => {
      const efetivo = resolverTema(tema)
      document.documentElement.classList.toggle('dark', efetivo === 'escuro')
      document.documentElement.style.colorScheme =
        efetivo === 'escuro' ? 'dark' : 'light'
    }

    aplicar()

    if (tema !== 'sistema') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', aplicar)
    return () => media.removeEventListener('change', aplicar)
  }, [tema])
}
