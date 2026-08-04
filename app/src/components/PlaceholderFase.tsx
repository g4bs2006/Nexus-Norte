import { Circle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PlaceholderFaseProps {
  fase: number
  /** Itens pendentes desta page, com referência à seção do plano. */
  itens: readonly string[]
}

/**
 * Placeholder temporário de uma page ainda não implementada.
 * Serve como roadmap navegável durante a construção — cada fase substitui
 * o seu placeholder pela implementação real.
 */
export function PlaceholderFase({ fase, itens }: PlaceholderFaseProps) {
  return (
    <Card className="border-dashed shadow-none">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-normal">
            Fase {fase}
          </Badge>
          <CardTitle className="text-muted-foreground text-sm font-normal">
            Não implementado
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {itens.map((item) => (
            <li
              key={item}
              className="text-muted-foreground flex items-start gap-2 text-sm"
            >
              <Circle className="mt-1.5 size-2.5 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
