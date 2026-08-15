import { useRef } from 'react'
import { Excalidraw, exportToSvg } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import '@excalidraw/excalidraw/index.css'
import { Button } from '@/components/ui/button'

/** A cena como o Excalidraw a entende, guardada em `desenhos.cena`. */
export type CenaDesenho = {
  elements: readonly unknown[]
  appState?: Record<string, unknown>
  files?: Record<string, unknown>
}

interface EditorDesenhoProps {
  cena: CenaDesenho | null
  /** Recebe a cena e o SVG exportado. Os dois são gravados juntos, sempre. */
  onSalvar: (cena: CenaDesenho, svg: string) => void
  onCancelar: () => void
  escuro?: boolean
}

/**
 * Excalidraw embrulhado para o app.
 *
 * Mora no kernel e só sobe por `lazy` ao clicar num desenho: abrir uma nota com
 * cinco diagramas não pode instanciar cinco editores (spec 14/08, seção 7).
 *
 * Ao salvar, exporta o SVG junto da cena. O SVG não é cache — é o que permite
 * ler o desenho sem o editor, é o que sobrevive a uma troca de biblioteca, e é
 * o que a exportação leva no lugar da referência opaca `![[desenho:uuid]]`.
 * Sem ele, a nota deixaria de ser portável, que é o argumento inteiro de
 * Markdown como fonte de verdade.
 */
export default function EditorDesenho({
  cena,
  onSalvar,
  onCancelar,
  escuro = false,
}: EditorDesenhoProps) {
  const api = useRef<ExcalidrawImperativeAPI | null>(null)

  async function salvar() {
    const instancia = api.current
    if (!instancia) return

    const elements = instancia.getSceneElements()
    const appState = instancia.getAppState()
    const files = instancia.getFiles()

    const svg = await exportToSvg({
      elements,
      appState: { ...appState, exportBackground: false },
      files,
      exportPadding: 8,
    })

    onSalvar(
      {
        elements,
        // `collaborators` é um Map e não sobrevive ao JSONB; nada do estado de
        // sessão precisa ser guardado, só o que descreve o desenho.
        appState: { viewBackgroundColor: appState.viewBackgroundColor },
        files,
      },
      svg.outerHTML,
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {/*
        Ocupa o que o diálogo der. Antes era `60vh` fixo dentro de um diálogo de
        1024px — desenhar precisa de tela, e a canvas era o menor pedaço dela.
      */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-md border">
        <Excalidraw
          excalidrawAPI={(instancia) => {
            api.current = instancia
          }}
          theme={escuro ? 'dark' : 'light'}
          {...(cena
            ? {
                initialData: {
                  elements: cena.elements as never,
                  appState: cena.appState as never,
                  files: cena.files as never,
                },
              }
            : {})}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={() => void salvar()}>
          Salvar desenho
        </Button>
      </div>
    </div>
  )
}
