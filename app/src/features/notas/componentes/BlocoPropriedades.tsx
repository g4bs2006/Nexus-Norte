import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format, isToday, isYesterday } from 'date-fns'
import { Plus, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  const [adicionando, setAdicionando] = useState(false)
  const [rascunho, setRascunho] = useState('')
  const vincular = useVincularNotaASessao()
  const vincularTopico = useVincularTopico()
  const desvincularTopico = useDesvincularTopico()
  const todosTopicos = useTopicos()

  const sessaoVinculada = sessoesDaMateria?.find((s) => s.id === sessaoId)
  const disponiveis = (todosTopicos.data ?? []).filter(
    (t) => !topicos.some((jaAtribuido) => jaAtribuido.id === t.id),
  )

  function confirmarTopico(nome?: string) {
    const nomeFinal = nome ?? rascunho.trim()
    if (!nomeFinal || !notaId) return
    vincularTopico.mutate({ notaId, nomeTopico: nomeFinal })
    setRascunho('')
    setAdicionando(false)
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
      <dd className="flex flex-wrap items-center gap-1">
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

        {adicionando ? (
          <span className="flex items-center gap-1">
            <Input
              autoFocus
              value={rascunho}
              onChange={(evento) => setRascunho(evento.target.value)}
              onKeyDown={(evento) => {
                if (evento.key === 'Enter') {
                  evento.preventDefault()
                  confirmarTopico()
                }
                if (evento.key === 'Escape') setAdicionando(false)
              }}
              placeholder="novo ou selecione"
              className="h-6 w-32 text-xs"
            />
            {disponiveis.length > 0 && (
              <Select onValueChange={(nome) => confirmarTopico(nome)}>
                <SelectTrigger className="h-6 w-6 p-0">
                  <SelectValue placeholder="" />
                </SelectTrigger>
                <SelectContent>
                  {disponiveis.map((t) => (
                    <SelectItem key={t.id} value={t.nome}>
                      {t.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6"
              aria-label="Cancelar"
              onMouseDown={(evento) => {
                evento.preventDefault()
                setRascunho('')
                setAdicionando(false)
              }}
            >
              <X className="size-3" />
            </Button>
          </span>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground size-6"
            aria-label="Adicionar tópico"
            onClick={() => setAdicionando(true)}
          >
            <Plus className="size-3" />
          </Button>
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
