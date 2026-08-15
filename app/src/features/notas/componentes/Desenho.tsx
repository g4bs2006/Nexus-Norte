import { Suspense, lazy, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { DialogConfirmarExclusao } from '@/components/DialogConfirmarExclusao'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { resolverTema, useUIStore } from '@/stores/ui'
import type { CenaDesenho } from '@/components/EditorDesenho'
import type { Json } from '@/types/database'
import { useDesenho, useExcluirDesenho, useSalvarDesenho } from '../hooks'

const EditorDesenho = lazy(() => import('@/components/EditorDesenho'))

interface DesenhoProps {
  /** Id que a referência `![[desenho:uuid]]` carrega. */
  id: string
  /**
   * Remove a referência do texto.
   *
   * Só chega do editor, onde existe um nó a apagar. Na leitura é ausente — e
   * sem ela o botão de excluir não aparece, porque apagar a linha deixando a
   * referência no texto trocaria um desenho por um erro.
   */
  onRemoverDoTexto?: () => void
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
export function Desenho({ id, onRemoverDoTexto }: DesenhoProps) {
  const desenho = useDesenho(id)
  const salvar = useSalvarDesenho()
  const excluir = useExcluirDesenho()
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

  /**
   * Apaga o desenho, e a ordem importa.
   *
   * A referência vive no TEXTO e a cena vive na tabela. Tirar o nó primeiro é
   * o inverso do intuitivo, e é o certo: se a segunda parte falhar, sobra uma
   * linha órfã invisível — em vez de uma referência quebrada bem visível no
   * meio da nota.
   */
  async function apagar() {
    onRemoverDoTexto?.()
    await excluir.mutateAsync(atual.id)
  }

  return (
    <div className="group/desenho relative my-3">
      {/*
        A figura inteira abre o editor. Antes só o lápis do canto abria, e ele
        só aparecia no hover — clicar no desenho é o gesto natural, e é o que o
        Notion faz.
      */}
      <button
        type="button"
        aria-label="Abrir desenho"
        onClick={() => setEditando(true)}
        className="hover:border-border block w-full cursor-pointer rounded-md border border-transparent p-1 transition-colors"
      >
        {atual.svg ? (
          <div
            className="[&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
            // SVG produzido pelo próprio Excalidraw a partir da cena desta base.
            dangerouslySetInnerHTML={{ __html: atual.svg }}
          />
        ) : (
          <p className="text-muted-foreground py-6 text-xs">
            Desenho sem render. Clique para abrir e salvar de novo.
          </p>
        )}
      </button>

      <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover/desenho:opacity-100 focus-within:opacity-100">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="size-7"
          aria-label="Editar desenho"
          onClick={() => setEditando(true)}
        >
          <Pencil className="size-3.5" />
        </Button>

        {onRemoverDoTexto && (
          <DialogConfirmarExclusao
            titulo="Excluir desenho"
            mensagem="O desenho sai da nota e a cena é apagada. Não há como recuperar."
            onConfirmar={apagar}
            pendente={excluir.isPending}
            trigger={
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="text-destructive size-7"
                aria-label="Excluir desenho"
              >
                <Trash2 className="size-3.5" />
              </Button>
            }
          />
        )}
      </div>

      <Dialog open={editando} onOpenChange={setEditando}>
        {/*
          Quase tela cheia. Desenhar num retângulo de 1024px é a mesma falha do
          diálogo de 384px que este trabalho veio corrigir, em escala menor.
        */}
        <DialogContent className="h-[92vh] max-w-[96vw]! sm:max-w-[96vw]!">
          <DialogHeader>
            <DialogTitle>{atual.titulo ?? 'Desenho'}</DialogTitle>
            <DialogDescription className="sr-only">
              Editor de desenho. Salve para gravar na nota.
            </DialogDescription>
          </DialogHeader>
          {editando && (
            <Suspense
              fallback={
                <div className="bg-muted/40 h-full animate-pulse rounded-md" />
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
