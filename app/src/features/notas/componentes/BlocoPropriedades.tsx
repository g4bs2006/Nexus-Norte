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
import { useVincularNotaASessao } from '../hooks'
import { gerarSlug } from '../markdown'
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
  /**
   * Marca um tópico novo. Recebe o slug; quem sabe onde a hashtag vai é a
   * página, que é dona do conteúdo.
   */
  onAdicionarTopico: (slug: string) => void
  sessoesDaMateria?: readonly { id: string; data: string; duracao_minutos: number }[]
}

/**
 * As propriedades da nota, sob o título.
 *
 * Padrão Notion/AFFiNE: rótulo apagado à esquerda, valor à direita, sem card e
 * sem borda. Card aqui competiria com o título por atenção, e propriedade é
 * informação de apoio — se lê quando se procura, não enquanto se lê o texto.
 *
 * **Tópico é editável aqui, e isso é novo.** Até agora ele só existia
 * escrevendo `#hashtag` no corpo, o que é ótimo enquanto se escreve e péssimo
 * quando se quer só classificar uma nota já pronta. Adicionar por aqui escreve
 * a hashtag no conteúdo — a regra de que tópico é DERIVADO do texto continua
 * de pé, e é o que impede o vocabulário de viver em dois lugares.
 */
export function BlocoPropriedades({
  notaId,
  sessaoId,
  materiaId,
  materiaNome,
  semestre,
  topicos,
  atualizadaEm,
  onAdicionarTopico,
  sessoesDaMateria,
}: BlocoPropriedadesProps) {
  const [adicionando, setAdicionando] = useState(false)
  const [rascunho, setRascunho] = useState('')
  const vincular = useVincularNotaASessao()

  const sessaoVinculada = sessoesDaMateria?.find((s) => s.id === sessaoId)

  function confirmar() {
    const slug = gerarSlug(rascunho)
    // `gerarSlug` devolve 'nota' para entrada sem letra nenhuma; não vale.
    if (rascunho.trim() !== '') onAdicionarTopico(slug)
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
          <Badge key={topico.id} variant="secondary" className="font-normal">
            <Link to={`/notas?topico=${topico.slug}`}>{topico.nome}</Link>
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
                  confirmar()
                }
                if (evento.key === 'Escape') setAdicionando(false)
              }}
              onBlur={confirmar}
              placeholder="assunto"
              className="h-6 w-32 text-xs"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6"
              aria-label="Cancelar"
              onMouseDown={(evento) => {
                // `onMouseDown` e não `onClick`: o blur do campo dispara antes
                // do clique, e confirmaria o que se está tentando cancelar.
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
