import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, Clock, NotebookPen, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useNotas } from '@/features/notas/hooks'
import { DialogNota } from '@/features/notas/componentes/DialogNota'
import type { NotaListada } from '@/features/notas/types'

/** Limpa marcadores Markdown brutos para o preview do card */
function extrairPreview(markdown: string, limite = 90): string {
  if (!markdown) return 'Nota sem conteúdo textual.'
  const limpo = markdown
    .replace(/^#+\s+/gm, '') // remove títulos
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // remove negrito
    .replace(/(\*|_)(.*?)\1/g, '$2') // remove itálico
    .replace(/`{1,3}.*?`{1,3}/g, '') // remove código inline
    .replace(/\$\$[\s\S]*?\$\$/g, '[Fórmula]') // remove bloco matemático
    .replace(/\$([\s\S]*?)\$/g, '$1') // remove fórmula inline
    .replace(/\[\[(.*?)\]\]/g, '$1') // remove wikilinks
    .trim()
  if (limpo.length <= limite) return limpo
  return limpo.slice(0, limite) + '…'
}

/** Formata data de atualização relativa ou curta */
function formatarAtualizacao(dataISO: string): string {
  const data = new Date(dataISO)
  const agora = new Date()
  const diffMs = agora.getTime() - data.getTime()
  const diffHoras = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHoras < 1) return 'Editado há poucos minutos'
  if (diffHoras < 24) return `Editado há ${diffHoras}h`
  if (diffDias === 1) return 'Editado ontem'
  if (diffDias < 7) return `Editado há ${diffDias} dias`

  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function SecaoNotasRecentes() {
  const navigate = useNavigate()
  const { data: todasNotas, isPending, isError } = useNotas()

  const seteDiasAtras = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d
  }, [])

  const { notas7Dias, ehFallback } = useMemo(() => {
    if (!todasNotas) return { notas7Dias: [], ehFallback: false }

    const recentes7Dias = todasNotas.filter((n) => {
      const dataModificacao = new Date(n.atualizada_em ?? n.created_at)
      return dataModificacao >= seteDiasAtras
    })

    // Ordenar da mais recente para a mais antiga
    recentes7Dias.sort(
      (a, b) =>
        new Date(b.atualizada_em ?? b.created_at).getTime() -
        new Date(a.atualizada_em ?? a.created_at).getTime(),
    )

    if (recentes7Dias.length > 0) {
      return { notas7Dias: recentes7Dias.slice(0, 6), ehFallback: false }
    }

    // Se 0 notas nos últimos 7 dias, pega as 3 mais recentes no geral como fallback
    const ultimasGeral = [...todasNotas].sort(
      (a, b) =>
        new Date(b.atualizada_em ?? b.created_at).getTime() -
        new Date(a.atualizada_em ?? a.created_at).getTime(),
    )

    return { notas7Dias: ultimasGeral.slice(0, 3), ehFallback: true }
  }, [todasNotas, seteDiasAtras])

  return (
    <section className="space-y-3">
      {/* Cabeçalho da Seção com Atalho Direto para /notas */}
      <div className="flex items-center justify-between">
        <div
          className="group flex items-center gap-2 cursor-pointer select-none"
          onClick={() => navigate('/notas')}
        >
          <div className="flex size-7 items-center justify-center rounded-lg bg-estudos-soft text-estudos transition-transform group-hover:scale-105">
            <NotebookPen className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground group-hover:text-estudos transition-colors flex items-center gap-1.5">
              <span>Notas Recentes</span>
              <ArrowRight className="size-3.5 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-estudos" />
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {ehFallback
                ? 'Últimas anotações do seu caderno'
                : 'Anotações criadas ou editadas nos últimos 7 dias'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DialogNota
            materiaId=""
            trigger={
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <Plus className="size-3.5" />
                <span>Nova Nota</span>
              </Button>
            }
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={() => navigate('/notas')}
          >
            <span>Ver todas</span>
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Skeletons de Carregamento */}
      {isPending && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </Card>
          ))}
        </div>
      )}

      {/* Trata erro de carregamento */}
      {isError && (
        <Card className="border-destructive/40 bg-destructive/5 p-4 text-xs text-destructive">
          Não foi possível carregar as notas recentes.
        </Card>
      )}

      {/* Lista Vazia quando o usuário não tem nenhuma nota cadastrada */}
      {!isPending && !isError && notas7Dias.length === 0 && (
        <Card className="border-dashed p-6 text-center">
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="flex size-10 items-center justify-center rounded-full bg-estudos-soft text-estudos">
              <BookOpen className="size-5" />
            </div>
            <h3 className="text-sm font-medium text-foreground">
              Nenhuma nota encontrada
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              Crie notas em suas matérias para organizar seus estudos com busca,
              backlinks e grafos de conhecimento.
            </p>
            <DialogNota
              materiaId=""
              trigger={
                <Button
                  size="sm"
                  className="mt-2 gap-1.5 bg-estudos hover:bg-estudos/90 text-estudos-foreground"
                >
                  <Plus className="size-3.5" />
                  <span>Criar Primeira Nota</span>
                </Button>
              }
            />
          </div>
        </Card>
      )}

      {/* Grid de Cards de Notas no Padrão de Animações do App */}
      {!isPending && !isError && notas7Dias.length > 0 && (
        <div className="surgir-grupo grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {notas7Dias.map((nota) => (
            <CardNotaRecente
              key={nota.id}
              nota={nota}
              onClick={() => navigate(`/notas/${nota.slug}`)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function CardNotaRecente({
  nota,
  onClick,
}: {
  nota: NotaListada
  onClick: () => void
}) {
  const preview = useMemo(
    () => extrairPreview(nota.conteudo),
    [nota.conteudo],
  )
  const dataFormatada = useMemo(
    () => formatarAtualizacao(nota.atualizada_em ?? nota.created_at),
    [nota.atualizada_em, nota.created_at],
  )

  return (
    <Card
      className="group hover:-translate-y-0.5 hover:border-estudos/50 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-2.5">
        {/* Título da Nota + Badges */}
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground group-hover:text-estudos transition-colors line-clamp-1">
              {nota.titulo}
            </h3>
            {nota.materia_nome && nota.materia_nome !== '—' && (
              <Badge
                variant="outline"
                className="text-[10px] shrink-0 font-medium bg-muted/50"
              >
                {nota.materia_nome}
              </Badge>
            )}
          </div>

          {/* Tópicos Vinculados */}
          {nota.topicos && nota.topicos.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {nota.topicos.map((topico) => (
                <span
                  key={topico.id}
                  className="inline-flex items-center rounded-xs px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground"
                >
                  #{topico.nome}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Trecho do Conteúdo */}
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed font-normal">
          {preview}
        </p>

        {/* Rodapé com Data de Modificação */}
        <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground/80 border-t border-border/40">
          <span className="flex items-center gap-1">
            <Clock className="size-3 text-muted-foreground" />
            <span>{dataFormatada}</span>
          </span>
          <span className="text-estudos opacity-0 group-hover:opacity-100 transition-opacity font-medium text-[10px] flex items-center gap-0.5">
            Abrir nota <ArrowRight className="size-3" />
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
