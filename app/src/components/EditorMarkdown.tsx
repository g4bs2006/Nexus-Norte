import { Suspense, lazy, useCallback, useRef, useState } from 'react'
import { Link2, PenLine } from 'lucide-react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { resolverTema, useUIStore } from '@/stores/ui'
import { DialogFormula } from './DialogFormula'
import { SeletorReferencia, type Referencia } from './SeletorReferencia'
import type { CenaDesenho } from './EditorDesenho'

const EditorRico = lazy(() => import('./EditorMarkdownRico'))
const EditorDesenho = lazy(() => import('./EditorDesenho'))

/**
 * Porta imperativa de inserção.
 *
 * O editor rico é não controlado, então não dá para inserir mexendo na prop
 * `value` — o texto tem que entrar por onde o cursor está. Cada modo preenche
 * esta ref com o seu jeito de inserir, e a barra de ferramentas chama sem saber
 * qual está montado.
 */
export type Inserir = (markdown: string, inline: boolean) => void

export interface EditorMarkdownProps {
  value: string
  onChange: (markdown: string) => void
  placeholder?: string
  /** Linhas do `textarea` de fallback. O editor rico cresce com o conteúdo. */
  rows?: number
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
   * Injetada pelo mesmo motivo de `buscarReferencias`. Ausente quando o dono
   * do desenho ainda não existe — desenho pertence a uma nota, e uma nota que
   * ainda não foi salva não tem id para ser dona de nada.
   */
  onSalvarDesenho?: (cena: CenaDesenho, svg: string) => Promise<string>
}

/**
 * Editor de Markdown do kernel.
 *
 * Mora aqui, e não em `features/notas`, porque duas features precisam dele:
 * Notas agora e as reuniões da camada de fé depois (README — o que duas
 * features precisam sobe para o kernel). Por isso ele não conhece nota, não
 * conhece matéria e não busca nada sozinho: o que precisar de dado de feature
 * entra por prop, injetado pela camada de composição.
 *
 * Duas decisões de carga, ambas por causa do celular (spec 14/08, restrição
 * transversal):
 *
 * - **No mobile a edição cai para `textarea` sobre o mesmo Markdown.** Não é
 *   degradação acidental: escrever fórmula e desenhar diagrama não são tarefas
 *   de tela de 6 polegadas, e forçar paridade encareceria tudo sem uso real.
 *   Corrigir uma frase continua possível, e o conteúdo nunca fica refém do
 *   desktop porque os dois lados escrevem o mesmo texto.
 * - **O editor rico e o campo de fórmula entram por `lazy`.** Quem só lê no
 *   celular não baixa o ProseMirror nem o MathLive.
 *
 * A fonte de verdade é a string Markdown, nos dois modos. É o que permite o
 * editor ser trocado sem migração de dado — e o que torna a camada pura de
 * `markdown.ts` independente desta escolha.
 */
export function EditorMarkdown({
  value,
  onChange,
  placeholder,
  rows = 12,
  buscarReferencias,
  onSalvarDesenho,
}: EditorMarkdownProps) {
  const desktop = useMediaQuery('(min-width: 768px)')
  const inserir = useRef<Inserir | null>(null)
  const campo = useRef<HTMLTextAreaElement>(null)
  const [seletorAberto, setSeletorAberto] = useState(false)
  const [desenhando, setDesenhando] = useState(false)
  const escuro = resolverTema(useUIStore((estado) => estado.tema)) === 'escuro'
  /*
   * Quando o seletor abre por causa do `[[` já digitado, só falta completar o
   * miolo e fechar. Quando abre pelo botão, o link inteiro precisa ser escrito.
   */
  const completando = useRef(false)
  const ultimoColchete = useRef(0)

  /* Inserção no `textarea`: na seleção, como qualquer editor de texto faria. */
  const inserirNoCampo = useCallback<Inserir>(
    (markdown, inline) => {
      const elemento = campo.current
      const trecho = inline ? markdown : `\n${markdown}\n`

      if (!elemento) {
        onChange(value + trecho)
        return
      }

      const { selectionStart, selectionEnd } = elemento
      onChange(
        value.slice(0, selectionStart) + trecho + value.slice(selectionEnd),
      )
    },
    [value, onChange],
  )

  /** O jeito de inserir do modo que está montado. */
  const inserirAqui = useCallback<Inserir>(
    (markdown, inline) => {
      if (desktop) inserir.current?.(markdown, inline)
      else inserirNoCampo(markdown, inline)
    },
    [desktop, inserirNoCampo],
  )

  /*
   * Gatilho do `[[`.
   *
   * O `keydown` fica no contêiner, e não no editor: assim o mesmo código serve
   * ao `textarea` e ao ProseMirror, que não compartilham API nenhuma mas
   * borbulham o evento igual.
   *
   * O segundo `[` é deixado entrar antes de abrir — completar o que já está na
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
    inserirAqui(
      completando.current ? `${referencia.slug}]]` : `[[${referencia.slug}]]`,
      true,
    )
    completando.current = false
  }

  const barra = (
    <div className="flex items-center gap-1">
      <DialogFormula
        onInserir={(latex, bloco) =>
          inserirAqui(bloco ? `$$${latex}$$` : `$${latex}$`, !bloco)
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
  )

  const textarea = (
    <Textarea
      ref={campo}
      value={value}
      onChange={(evento) => onChange(evento.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="font-mono text-[13px]"
    />
  )

  return (
    <div className="space-y-2" onKeyDown={aoTeclar}>
      {barra}
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
                      inserirAqui(`![[desenho:${id}]]`, false)
                      setDesenhando(false)
                    })
                  }}
                />
              </Suspense>
            )}
          </DialogContent>
        </Dialog>
      )}
      {desktop ? (
        <Suspense fallback={textarea}>
          <EditorRico
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            inserirRef={inserir}
          />
        </Suspense>
      ) : (
        textarea
      )}
    </div>
  )
}
