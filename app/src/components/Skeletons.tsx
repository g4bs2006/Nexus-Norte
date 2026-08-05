import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/**
 * Esqueletos de carregamento — Bloco A do brief de design.
 *
 * Substituem o texto "Carregando…" que existia nas 10 rotas. A forma imita a do
 * conteúdo real para que nada salte quando os dados chegam: era esse salto, e
 * não o tempo de espera, o maior dano à percepção de qualidade.
 *
 * O `Skeleton` do shadcn usa `animate-pulse`; a regra global de
 * `prefers-reduced-motion` já neutraliza a animação para quem pede.
 */

function LinhaMetrica({ larguraRotulo = 'w-20' }: { larguraRotulo?: string }) {
  return (
    <div className="space-y-2">
      <Skeleton className={cn('h-2.5', larguraRotulo)} />
      <Skeleton className="h-6 w-28" />
    </div>
  )
}

/** Card com N métricas lado a lado — usado no topo de Financeiro e Estudos. */
export function SkeletonCardMetricas({ colunas = 3 }: { colunas?: number }) {
  return (
    <Card>
      <CardContent
        className={cn(
          'grid gap-6',
          colunas === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3',
        )}
      >
        {Array.from({ length: colunas }, (_, i) => (
          <LinhaMetrica key={i} larguraRotulo={i === 0 ? 'w-24' : 'w-16'} />
        ))}
      </CardContent>
    </Card>
  )
}

/** Grade de cards — categorias, matérias, projetos. */
export function SkeletonGrade({ itens = 6 }: { itens?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: itens }, (_, i) => (
        <Card key={i}>
          <CardContent className="flex items-center gap-4">
            <Skeleton className="size-14 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-2.5 w-1/2" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/** Lista de linhas — checks, lançamentos, logs. */
export function SkeletonLista({ linhas = 4 }: { linhas?: number }) {
  return (
    <Card>
      <CardContent className="space-y-3">
        {Array.from({ length: linhas }, (_, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <Skeleton className="size-4 shrink-0 rounded" />
            <Skeleton className="h-3.5" style={{ width: `${65 - i * 8}%` }} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

/** Bloco de gráfico, com a altura final já reservada. */
export function SkeletonGrafico({ altura = 220 }: { altura?: number }) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-2.5 w-56" />
        </div>
        <Skeleton className="w-full" style={{ height: altura }} />
      </CardContent>
    </Card>
  )
}

/**
 * Esqueleto de página inteira. `variante` escolhe a composição que mais se
 * aproxima do layout real de cada rota.
 */
export function SkeletonPagina({
  variante = 'grade',
}: {
  variante?: 'financeiro' | 'grade' | 'lista' | 'detalhe'
}) {
  if (variante === 'financeiro') {
    return (
      <div className="space-y-6">
        <SkeletonCardMetricas colunas={3} />
        <SkeletonCardMetricas colunas={3} />
        <SkeletonLista linhas={2} />
        <SkeletonGrade itens={3} />
      </div>
    )
  }

  if (variante === 'lista') {
    return (
      <div className="space-y-6">
        <SkeletonLista linhas={3} />
        <SkeletonGrade itens={4} />
      </div>
    )
  }

  if (variante === 'detalhe') {
    return (
      <div className="space-y-6">
        <SkeletonCardMetricas colunas={4} />
        <SkeletonGrafico />
        <SkeletonLista linhas={5} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SkeletonCardMetricas colunas={3} />
      <SkeletonGrade itens={6} />
    </div>
  )
}
