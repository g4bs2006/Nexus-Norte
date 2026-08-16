import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format, isToday, isYesterday } from 'date-fns'
import { Plus, Tag, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { deISO } from '@/lib/datas'
import {
  useDesvincularTopico,
  useTopicos,
  useVincularNotaASessao,
  useVincularTopico,
} from '../hooks'
import type { Topico } from '../types'

interface BlocoPropriedadesProps {
  notaId?: string
  sessaoId?: string | null
  materiaId: string
  materiaNome: string
  /** Rótulo do semestre da matéria, quando ela tem um. */
  semestre: string | null
  topicos: readonly Topico[]
  atualizadaEm: string
  sessoesDaMateria?: readonly { id: string; data: string; duracao_minutos: number }[]
}

export function BlocoPropriedades({
  notaId,
  sessaoId,
  materiaId,
  materiaNome,
  semestre,
  topicos,
  atualizadaEm,
  sessoesDaMateria,
}: BlocoPropriedadesProps) {
  const [popoverAberto, setPopoverAberto] = useState(false)
  const [buscaTopico, setBuscaTopico] = useState('')
  const vincular = useVincularNotaASessao()
  const vincularTopico = useVincularTopico()
  const desvincularTopico = useDesvincularTopico()
  const todosTopicos = useTopicos()

  const sessaoVinculada = sessoesDaMateria?.find((s) => s.id === sessaoId)
  const disponiveis = (todosTopicos.data ?? []).filter(
    (t) => !topicos.some((jaAtribuido) => jaAtribuido.id === t.id),
  )

  function confirmarTopico(nome?: string) {
    const nomeFinal = nome ?? buscaTopico.trim()
    if (!nomeFinal || !notaId) return
    vincularTopico.mutate({ notaId, nomeTopico: nomeFinal })
    setBuscaTopico('')
    setPopoverAberto(false)
  }

  return (
    <dl className="documento-propriedades">
      <dt>Matéria</dt>
      <dd>
        <Link to={`/estudos/${materiaId}`} className="hover:text-estudos">
          {materiaNome}
        </Link>
      </dd>

      <dt>Sessão</dt>
      <dd className="flex items-center gap-1.5">
        {sessaoVinculada ? (
          <span className="flex items-center gap-1">
            <span>Sessão de {format(deISO(sessaoVinculada.data), 'dd/MM/yyyy')}</span>
            {notaId && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-5 text-muted-foreground hover:text-destructive"
                aria-label="Desvincular da sessão"
                disabled={vincular.isPending}
                onClick={() => vincular.mutate({ notaId, sessaoId: null })}
              >
                <X className="size-3" />
              </Button>
            )}
          </span>
        ) : sessoesDaMateria && sessoesDaMateria.length > 0 && notaId ? (
          <Select
            onValueChange={(novaSessaoId) =>
              vincular.mutate({ notaId, sessaoId: novaSessaoId })
            }
          >
            <SelectTrigger className="h-6 w-44 text-xs">
              <SelectValue placeholder="Vincular a sessão" />
            </SelectTrigger>
            <SelectContent>
              {sessoesDaMateria.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {format(deISO(s.data), 'dd/MM/yyyy')} ({s.duracao_minutos} min)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-muted-foreground/60">não vinculada</span>
        )}
      </dd>

      <dt>Semestre</dt>
      <dd className={semestre ? undefined : 'text-muted-foreground/60'}>
        {semestre ?? 'não definido'}
      </dd>

      <dt>Tópicos</dt>
      <dd className="flex flex-wrap items-center gap-1.5">
        {topicos.map((topico) => (
          <Badge key={topico.id} variant="secondary" className="font-normal gap-1">
            <Link to={`/notas?topico=${topico.slug}`}>{topico.nome}</Link>
            {notaId && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-3.5 hover:text-destructive text-muted-foreground p-0"
                aria-label={`Remover tópico ${topico.nome}`}
                disabled={desvincularTopico.isPending}
                onClick={() => desvincularTopico.mutate({ notaId, topicoId: topico.id })}
              >
                <X className="size-2.5" />
              </Button>
            )}
          </Badge>
        ))}

        {notaId && (
          <Popover open={popoverAberto} onOpenChange={setPopoverAberto}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground hover:text-foreground gap-1 px-2 border border-dashed border-border hover:border-solid transition-colors"
              >
                <Plus className="size-3" />
                <span>Adicionar tópico</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="Procurar ou criar tópico..."
                  value={buscaTopico}
                  onValueChange={setBuscaTopico}
                />
                <CommandList>
                  {buscaTopico.trim() !== '' && (
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-xs text-primary hover:bg-accent flex items-center gap-1.5 font-medium cursor-pointer"
                      onClick={() => confirmarTopico(buscaTopico)}
                    >
                      <Plus className="size-3.5" /> Criar tópico "#{buscaTopico.trim()}"
                    </button>
                  )}
                  <CommandEmpty className="py-2 text-center text-xs text-muted-foreground">
                    Nenhum tópico encontrado.
                  </CommandEmpty>
                  {disponiveis.length > 0 && (
                    <CommandGroup heading="Tópicos disponíveis">
                      {disponiveis.map((t) => (
                        <CommandItem
                          key={t.id}
                          value={t.nome}
                          onSelect={() => confirmarTopico(t.nome)}
                          className="text-xs flex items-center justify-between cursor-pointer"
                        >
                          <span>#{t.nome}</span>
                          <Tag className="size-3 text-muted-foreground" />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </dd>

      <dt>Editada</dt>
      <dd className="text-muted-foreground">{rotuloData(atualizadaEm)}</dd>
    </dl>
  )
}

/** "hoje, 14:32" responde mais rápido que "14/08/2026, 14:32". */
function rotuloData(iso: string): string {
  const data = new Date(iso)
  if (isToday(data)) return `hoje, ${format(data, 'HH:mm')}`
  if (isYesterday(data)) return `ontem, ${format(data, 'HH:mm')}`
  return format(data, "dd/MM/yyyy',' HH:mm")
}
