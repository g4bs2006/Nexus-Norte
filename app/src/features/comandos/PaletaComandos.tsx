import { useNavigate } from 'react-router-dom'
import { Monitor, Moon, Sun } from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { ITENS_NAVEGACAO } from '@/lib/pilares'
import { useUIStore, type Tema } from '@/stores/ui'
import { cn } from '@/lib/utils'
import { useIndiceBusca } from './useIndiceBusca'

/** Tecla do atalho "ir para" de cada rota, casando com `useAtalhos`. */
const TECLA_ROTA: Record<string, string> = {
  home: 'H',
  financeiro: 'F',
  estudos: 'E',
  treino: 'T',
  projetos: 'P',
  calendario: 'C',
}

const TEMAS: ReadonlyArray<{ valor: Tema; rotulo: string; icone: typeof Sun }> =
  [
    { valor: 'claro', rotulo: 'Tema claro', icone: Sun },
    { valor: 'escuro', rotulo: 'Tema escuro', icone: Moon },
    { valor: 'sistema', rotulo: 'Tema do sistema', icone: Monitor },
  ]

interface PaletaComandosProps {
  aberta: boolean
  onAbertaChange: (aberta: boolean) => void
}

/**
 * Paleta de comando (Ctrl/⌘ K).
 *
 * Faz duas coisas: navega entre as rotas e busca pelas entidades cadastradas —
 * categoria, matéria, treino, exercício, projeto. Digitar "Cálculo" e cair na
 * matéria é o ganho real; a navegação por si já existe na sidebar.
 */
export function PaletaComandos({
  aberta,
  onAbertaChange,
}: PaletaComandosProps) {
  const navegar = useNavigate()
  const setTema = useUIStore((estado) => estado.setTema)
  const temaAtual = useUIStore((estado) => estado.tema)

  const indice = useIndiceBusca(aberta)

  function irPara(rota: string) {
    onAbertaChange(false)
    navegar(rota)
  }

  return (
    <CommandDialog
      open={aberta}
      onOpenChange={onAbertaChange}
      title="Paleta de comando"
      description="Busque uma matéria, categoria, treino ou projeto, ou navegue entre as páginas."
    >
      <CommandInput placeholder="Buscar ou ir para…" />
      <CommandList>
        <CommandEmpty>Nada encontrado.</CommandEmpty>

        <CommandGroup heading="Ir para">
          {ITENS_NAVEGACAO.map(
            ({ id, nome, rota, icone: Icone, classeTexto }) => (
              <CommandItem
                key={id}
                // `value` alimenta o filtro do cmdk; sem o nome ele não casaria
                value={`ir ${nome}`}
                onSelect={() => irPara(rota)}
              >
                <Icone className={cn('size-4', classeTexto)} />
                {nome}
                {TECLA_ROTA[id] && (
                  <CommandShortcut>G {TECLA_ROTA[id]}</CommandShortcut>
                )}
              </CommandItem>
            ),
          )}
        </CommandGroup>

        {(indice.data ?? []).length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Seus registros">
              {(indice.data ?? []).map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.nome} ${item.tipo}`}
                  onSelect={() => irPara(item.rota)}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'size-1.5 shrink-0 rounded-full',
                      item.pilar === 'financeiro' && 'bg-financeiro',
                      item.pilar === 'estudos' && 'bg-estudos',
                      item.pilar === 'treino' && 'bg-treino',
                      item.pilar === 'projetos' && 'bg-projetos',
                    )}
                  />
                  <span className="truncate">{item.nome}</span>
                  <span className="text-muted-foreground ml-auto text-xs">
                    {item.tipo}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {indice.isPending && aberta && (
          <CommandGroup heading="Seus registros">
            <CommandItem disabled value="carregando">
              <span className="text-muted-foreground text-xs">
                Carregando registros…
              </span>
            </CommandItem>
          </CommandGroup>
        )}

        <CommandSeparator />
        <CommandGroup heading="Aparência">
          {TEMAS.map(({ valor, rotulo, icone: Icone }) => (
            <CommandItem
              key={valor}
              value={rotulo}
              onSelect={() => {
                setTema(valor)
                onAbertaChange(false)
              }}
            >
              <Icone className="size-4" />
              {rotulo}
              {temaAtual === valor && (
                <span className="text-muted-foreground ml-auto text-xs">
                  ativo
                </span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
