import { Fragment, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Formula } from '@/components/Formula'
import { fatiar } from '../markdown'

interface ConteudoNotaProps {
  conteudo: string
  /** Slugs que já têm nota. O que não está aqui é link a escrever. */
  existentes: ReadonlySet<string>
}

/**
 * Conteúdo da nota na leitura: texto, wikilinks clicáveis e fórmulas.
 *
 * NÃO é um renderizador de Markdown — heading, lista e negrito ainda chegam
 * como texto. É a leitura mínima das construções PRÓPRIAS da nota, e ela existe
 * porque `$\int_0^\infty e^{-x}dx$` exibido cru não serve para nada.
 *
 * Quem decide o que é cada pedaço é `fatiar`, na camada pura. Aqui só se mapeia
 * fatia para elemento — é o que mantém as regras de parsing testáveis sem DOM e
 * independentes de qualquer biblioteca.
 *
 * Link para nota que ainda não existe fica visivelmente diferente e leva para a
 * mesma rota, que oferece criar. É o fluxo do Obsidian, e é onde a próxima nota
 * nasce.
 */
export function ConteudoNota({ conteudo, existentes }: ConteudoNotaProps) {
  const fatias = useMemo(() => fatiar(conteudo), [conteudo])

  if (conteudo.trim() === '') {
    return (
      <p className="text-muted-foreground/70 text-sm italic">
        Sem conteúdo ainda.
      </p>
    )
  }

  return (
    <div className="text-sm leading-relaxed whitespace-pre-wrap">
      {fatias.map((fatia, indice) => {
        if (fatia.tipo === 'texto') {
          return <Fragment key={indice}>{fatia.texto}</Fragment>
        }

        if (fatia.tipo === 'matematica') {
          return (
            <Formula key={indice} latex={fatia.latex} bloco={fatia.bloco} />
          )
        }

        return (
          <Link
            key={indice}
            to={`/notas/${fatia.slug}`}
            className={
              existentes.has(fatia.slug)
                ? 'text-estudos underline underline-offset-2'
                : 'text-muted-foreground underline decoration-dashed underline-offset-2'
            }
          >
            {fatia.rotulo ?? fatia.slug}
          </Link>
        )
      })}
    </div>
  )
}
