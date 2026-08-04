import { Monitor, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUIStore, type Tema } from '@/stores/ui'
import { cn } from '@/lib/utils'

const OPCOES: ReadonlyArray<{
  valor: Tema
  rotulo: string
  icone: typeof Sun
}> = [
  { valor: 'claro', rotulo: 'Claro', icone: Sun },
  { valor: 'escuro', rotulo: 'Escuro', icone: Moon },
  { valor: 'sistema', rotulo: 'Sistema', icone: Monitor },
]

interface ThemeToggleProps {
  colapsada: boolean
}

export function ThemeToggle({ colapsada }: ThemeToggleProps) {
  const tema = useUIStore((estado) => estado.tema)
  const setTema = useUIStore((estado) => estado.setTema)

  const atual = OPCOES.find((opcao) => opcao.valor === tema) ?? OPCOES[2]
  const IconeAtual = atual?.icone ?? Monitor

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'text-muted-foreground hover:text-foreground w-full justify-start gap-2 font-normal',
            colapsada && 'justify-center px-0',
          )}
          aria-label="Alternar tema"
        >
          <IconeAtual className="size-4 shrink-0" />
          {!colapsada && <span>Tema</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top">
        {OPCOES.map(({ valor, rotulo, icone: Icone }) => (
          <DropdownMenuItem
            key={valor}
            onSelect={() => setTema(valor)}
            className={cn(valor === tema && 'bg-accent')}
          >
            <Icone className="size-4" />
            {rotulo}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
