import { Suspense, lazy, useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { resolverTema, useUIStore } from '@/stores/ui'
import type { CenaDesenho } from '@/components/EditorDesenho'
import type { Json } from '@/types/database'
import { useDesenho, useSalvarDesenho } from '../hooks'

const EditorDesenho = lazy(() => import('@/components/EditorDesenho'))

interface DesenhoProps {
  /** Id que a referência `![[desenho:uuid]]` carrega. */
  id: string
}

/**
 * Desenho embutido na nota.
 *
 * Renderiza o SVG guardado; o editor só sobe ao clicar (spec 14/08, seção 7),
 * porque abrir uma nota com cinco diagramas não pode instanciar cinco
 * Excalidraws.
 *
 * Referência apontando para desenho que não existe mais aparece como aviso, e
 * não some: o texto da nota continua citando, e sumir esconderia a perda.
 */
export function Desenho({ id }: DesenhoProps) {
  const desenho = useDesenho(id)
  const salvar = useSalvarDesenho()
  const [editando, setEditando] = useState(false)
  const escuro = resolverTema(useUIStore((estado) => estado.tema)) === 'escuro'

  if (desenho.isPending) {
    return <div className="bg-muted/40 my-2 h-48 animate-pulse rounded-md" />
  }

  if (!desenho.data) {
    return (
      <p className="text-muted-foreground border-status-risco/40 my-2 rounded-md border border-dashed p-3 text-xs">
        Desenho não encontrado ({id}).
      </p>
    )
  }

  const atual = desenho.data

  return (
    <div className="group/desenho relative my-2">
      {atual.svg ? (
        <div
          className="[&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
          // SVG produzido pelo próprio Excalidraw a partir da cena desta base.
          dangerouslySetInnerHTML={{ __html: atual.svg }}
        />
      ) : (
        <p className="text-muted-foreground text-xs">
          Desenho sem render. Abra para editar e salvar de novo.
        </p>
      )}

      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="absolute top-1 right-1 size-7 opacity-0 transition-opacity group-hover/desenho:opacity-100"
        aria-label="Editar desenho"
        onClick={() => setEditando(true)}
      >
        <Pencil className="size-3.5" />
      </Button>

      <Dialog open={editando} onOpenChange={setEditando}>
        <DialogContent className="max-w-5xl!">
          <DialogHeader>
            <DialogTitle>{atual.titulo ?? 'Desenho'}</DialogTitle>
          </DialogHeader>
          {editando && (
            <Suspense
              fallback={
                <div className="bg-muted/40 h-[60vh] animate-pulse rounded-md" />
              }
            >
              <EditorDesenho
                cena={atual.cena as CenaDesenho | null}
                escuro={escuro}
                onCancelar={() => setEditando(false)}
                onSalvar={(cena, svg) => {
                  salvar.mutate(
                    {
                      id: atual.id,
                      notaId: atual.nota_id,
                      cena: cena as unknown as Json,
                      svg,
                    },
                    { onSuccess: () => setEditando(false) },
                  )
                }}
              />
            </Suspense>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
