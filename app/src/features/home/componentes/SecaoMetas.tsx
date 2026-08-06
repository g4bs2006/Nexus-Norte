// app/src/features/home/componentes/SecaoMetas.tsx
import { useState } from 'react'
import { Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CardMeta } from '@/features/metas/componentes/CardMeta'
import { DialogListaMetas } from '@/features/metas/componentes/DialogListaMetas'
import { DialogMeta } from '@/features/metas/componentes/DialogMeta'
import { useMetas } from '@/features/metas/hooks'
import type { Meta } from '@/features/metas/types'

interface SecaoMetasProps {
  hoje: Date
}

/**
 * Destaque das metas mais urgentes: ativas, com prazo mais próximo primeiro;
 * sem prazo vai ao final (não é mais nem menos urgente que as demais).
 */
function ordenarDestaque(metas: Meta[]): Meta[] {
  return [...metas]
    .filter((m) => !m.concluida)
    .sort((a, b) => {
      if (a.data_alvo && b.data_alvo) return a.data_alvo.localeCompare(b.data_alvo)
      if (a.data_alvo) return -1
      if (b.data_alvo) return 1
      return 0
    })
}

/**
 * Seção de Metas na Home (spec: 2026-08-05-metas-design.md). Sem rota nova,
 * sem item de navegação — a barra inferior mobile já está no limite.
 */
export function SecaoMetas({ hoje }: SecaoMetasProps) {
  const { data } = useMetas()
  const [listaAberta, setListaAberta] = useState(false)
  const destaque = ordenarDestaque(data ?? []).slice(0, 4)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="size-4" />
          Metas
        </CardTitle>
        <div className="flex items-center gap-2">
          <DialogMeta />
          <Button variant="ghost" size="sm" onClick={() => setListaAberta(true)}>
            Ver todas
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {destaque.length === 0 ? (
          <p className="text-muted-foreground text-xs">Nenhuma meta ativa.</p>
        ) : (
          <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
            {destaque.map((meta) => (
              <CardMeta key={meta.id} meta={meta} hoje={hoje} />
            ))}
          </div>
        )}
      </CardContent>

      <DialogListaMetas
        aberto={listaAberta}
        onOpenChange={setListaAberta}
        hoje={hoje}
      />
    </Card>
  )
}
