import type { ReactNode } from 'react'

interface PageHeaderProps {
  titulo: string
  descricao?: string
  acoes?: ReactNode
}

export function PageHeader({ titulo, descricao, acoes }: PageHeaderProps) {
  return (
    <header className="mb-8 flex items-start justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl">{titulo}</h1>
        {descricao && (
          <p className="text-muted-foreground text-sm">{descricao}</p>
        )}
      </div>
      {acoes && <div className="flex shrink-0 items-center gap-2">{acoes}</div>}
    </header>
  )
}
