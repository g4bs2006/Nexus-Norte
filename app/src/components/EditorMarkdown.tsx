import { Suspense, lazy } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Textarea } from '@/components/ui/textarea'

const EditorRico = lazy(() => import('./EditorMarkdownRico'))

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
 * - **O editor rico entra por `lazy`.** Quem só lê no celular não baixa o
 *   ProseMirror inteiro.
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

  if (!desktop) {
    return (
      <Textarea
        value={value}
        onChange={(evento) => onChange(evento.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="font-mono text-[13px]"
      />
    )
  }

  return (
    <Suspense
      fallback={
        <Textarea
          value={value}
          onChange={(evento) => onChange(evento.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="font-mono text-[13px]"
        />
      }
    >
      <EditorRico value={value} onChange={onChange} placeholder={placeholder} />
    </Suspense>
  )
}
