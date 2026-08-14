import { Suspense, lazy, useCallback, useRef, useState } from 'react'
import { Link2, PenLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { resolverTema, useUIStore } from '@/stores/ui'
import { DialogFormula } from './DialogFormula'
import { SeletorReferencia, type Referencia } from './SeletorReferencia'
import type { CenaDesenho } from './EditorDesenho'
import type { RenderizarBloco, RenderizarDesenho } from './editor/views'

const EditorRico = lazy(() => import('./EditorMarkdownRico'))
const EditorDesenho = lazy(() => import('./EditorDesenho'))

/**
 * Porta imperativa de inserção.
 *
 * O editor é não controlado, então não dá para inserir mexendo na prop `value`
 * — o texto tem que entrar por onde o cursor está. O editor preenche esta ref
 * ao montar, e a barra chama sem saber nada de ProseMirror.
 */
export type Inserir = (markdown: string, inline: boolean) => void

export interface EditorMarkdownProps {
  value: string
  onChange: (markdown: string) => void
  placeholder?: string
  /**
   * Busca as notas que o `[[` pode citar.
   *
   * Injetada, e não importada: o editor mora no kernel e não pode conhecer
   * nota (README — a regra de dependência). Sem ela, o botão de ligar some e o
   * `[[` volta a ser texto comum, que continua virando link ao salvar.
   */
  buscarReferencias?: (termo: string) => Promise<Referencia[]>
  /**
   * Grava um desenho novo e devolve o id, que vira `![[desenho:id]]`.
   *
   * Ausente quando o dono do desenho ainda não existe — desenho pertence a uma
   * nota, e uma nota que ainda não foi salva não tem id para ser dona de nada.
   */
  onSalvarDesenho?: (cena: CenaDesenho, svg: string) => Promise<string>
  /**
   * Como desenhar cerca e desenho dentro do editor.
   *
   * Quem passa usa os mesmos componentes da leitura, então editar e ler
   * mostram a mesma coisa.
   */
  renderizarBloco: RenderizarBloco
  renderizarDesenho: RenderizarDesenho
}

/**
 * Editor de Markdown do kernel. **Desktop.**
 *
 * Mora aqui, e não em `features/notas`, porque duas features precisam dele:
 * Notas agora e as reuniões da camada de fé depois (README — o que duas
 * features precisam sobe para o kernel). Por isso ele não conhece nota, não
 * conhece matéria e não busca nada sozinho: o que precisar de dado de feature
 * entra por prop, injetado por quem o compõe.
 *
 * **No celular não se edita** (spec de 14/08 — nota como página). A versão
 * anterior caía para `textarea` ali, o que custava dois caminhos de inserção,
 * uma porta imperativa com dois donos e uma decisão de mobile em cada
 * afordância nova — sem uso real por trás, porque escrever fórmula, arrastar
 * bloco e desenhar não são tarefas de polegar. Quem renderiza a nota no
 * celular é a leitura, que é outra coisa e continua funcionando sempre.
 *
 * A fonte de verdade é a string Markdown. É o que permite trocar o editor sem
 * migração de dado, e o que torna `markdown.ts` independente desta escolha.
 */
export function EditorMarkdown({
  value,
  onChange,
  placeholder,
  buscarReferencias,
  onSalvarDesenho,
  renderizarBloco,
  renderizarDesenho,
}: EditorMarkdownProps) {
  const inserirRef = useRef<Inserir | null>(null)
  const [seletorAberto, setSeletorAberto] = useState(false)
  const [desenhando, setDesenhando] = useState(false)
  const escuro = resolverTema(useUIStore((estado) => estado.tema)) === 'escuro'
  /*
   * Quando o seletor abre por causa do `[[` já digitado, só falta completar o
   * miolo e fechar. Quando abre pelo botão, o link inteiro precisa ser escrito.
   */
  const completando = useRef(false)
  const ultimoColchete = useRef(0)

  const inserir = useCallback<Inserir>((markdown, inline) => {
    inserirRef.current?.(markdown, inline)
  }, [])

  /*
   * Gatilho do `[[`.
   *
   * O `keydown` fica no contêiner porque o editor é DOM do ProseMirror — daqui
   * se escuta sem precisar da API dele.
   *
   * O segundo `[` é deixado entrar antes de abrir: completar o que já está na
   * tela é como o Obsidian se comporta, e cancelar deixando `[[` escrito é o
   * resultado esperado, não um resto.
   */
  function aoTeclar(evento: React.KeyboardEvent) {
    if (!buscarReferencias || evento.key !== '[') return

    const agora = evento.timeStamp
    const seguido = agora - ultimoColchete.current < 800
    ultimoColchete.current = agora

    if (!seguido) return
    ultimoColchete.current = 0
    completando.current = true
    setSeletorAberto(true)
  }

  function escolher(referencia: Referencia) {
    inserir(
      completando.current ? `${referencia.slug}]]` : `[[${referencia.slug}]]`,
      true,
    )
    completando.current = false
  }

  return (
    <div className="space-y-2" onKeyDown={aoTeclar}>
      <div className="flex items-center gap-1">
        <DialogFormula
          onInserir={(latex, bloco) =>
            inserir(bloco ? `$$${latex}$$` : `$${latex}$`, !bloco)
          }
        />
        {buscarReferencias && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              completando.current = false
              setSeletorAberto(true)
            }}
          >
            <Link2 className="size-4" />
            Ligar nota
          </Button>
        )}
        {onSalvarDesenho && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setDesenhando(true)}
          >
            <PenLine className="size-4" />
            Desenho
          </Button>
        )}
      </div>

      {buscarReferencias && (
        <SeletorReferencia
          aberto={seletorAberto}
          onAbertoChange={setSeletorAberto}
          buscar={buscarReferencias}
          onEscolher={escolher}
        />
      )}

      {onSalvarDesenho && (
        <Dialog open={desenhando} onOpenChange={setDesenhando}>
          <DialogContent className="max-w-5xl!">
            <DialogHeader>
              <DialogTitle>Novo desenho</DialogTitle>
            </DialogHeader>
            {desenhando && (
              <Suspense
                fallback={
                  <div className="bg-muted/40 h-[60vh] animate-pulse rounded-md" />
                }
              >
                <EditorDesenho
                  cena={null}
                  escuro={escuro}
                  onCancelar={() => setDesenhando(false)}
                  onSalvar={(cena, svg) => {
                    void onSalvarDesenho(cena, svg).then((id) => {
                      // A referência entra em linha própria: desenho no meio de
                      // um parágrafo não é o que ninguém quer.
                      inserir(`![[desenho:${id}]]`, false)
                      setDesenhando(false)
                    })
                  }}
                />
              </Suspense>
            )}
          </DialogContent>
        </Dialog>
      )}

      <Suspense
        fallback={<div className="bg-muted/40 h-64 animate-pulse rounded-md" />}
      >
        <EditorRico
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          inserirRef={inserirRef}
          renderizarBloco={renderizarBloco}
          renderizarDesenho={renderizarDesenho}
        />
      </Suspense>
    </div>
  )
}
