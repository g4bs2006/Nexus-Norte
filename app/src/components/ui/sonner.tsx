import { Toaster as Sonner, type ToasterProps } from 'sonner'
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from 'lucide-react'
import { useUIStore, type Tema } from '@/stores/ui'

// O componente original do shadcn lê o tema via next-themes. Aqui o tema vem
// do store Zustand (plano 1.1), então a leitura foi trocada para manter uma
// única fonte de verdade — sem isso, um override manual de tema não chegaria
// aos toasts.
const MAPA_TEMA: Record<Tema, NonNullable<ToasterProps['theme']>> = {
  claro: 'light',
  escuro: 'dark',
  sistema: 'system',
}

const Toaster = ({ ...props }: ToasterProps) => {
  const tema = useUIStore((estado) => estado.tema)

  return (
    <Sonner
      theme={MAPA_TEMA[tema]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'cn-toast',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
