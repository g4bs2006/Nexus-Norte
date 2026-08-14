import { Suspense, lazy, useCallback, useRef } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Textarea } from '@/components/ui/textarea'
import { DialogFormula } from './DialogFormula'

const EditorRico = lazy(() => import('./EditorMarkdownRico'))

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
}: EditorMarkdownProps) {
  const desktop = useMediaQuery('(min-width: 768px)')
  const inserir = useRef<Inserir | null>(null)
  const campo = useRef<HTMLTextAreaElement>(null)

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

  const barra = (
    <div className="flex items-center gap-1">
      <DialogFormula
        onInserir={(latex, bloco) =>
          (desktop ? inserir.current : inserirNoCampo)?.(
            bloco ? `$$${latex}$$` : `$${latex}$`,
            !bloco,
          )
        }
      />
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
    <div className="space-y-2">
      {barra}
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
