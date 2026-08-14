import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { localizarLinks } from '../markdown'

interface ConteudoNotaProps {
  conteudo: string
  /** Slugs que já têm nota. O que não está aqui é link a escrever. */
  existentes: ReadonlySet<string>
}

/**
 * Conteúdo da nota na fase 3: texto puro com os wikilinks clicáveis.
 *
 * NÃO é um renderizador de Markdown — isso chega na fase 4, com o editor. O que
 * este componente faz é fatiar o texto pelas posições que `localizarLinks`
 * devolve e trocar `[[slug]]` por um `Link`. É o mínimo para a promessa da fase
 * 3 ser verdade na tela e não só no banco: os links já funcionam.
 *
 * Link para nota que ainda não existe fica visivelmente diferente e leva para a
 * mesma rota — que vai oferecer criar. É o fluxo do Obsidian, e é onde a
 * próxima nota nasce.
 */
export function ConteudoNota({ conteudo, existentes }: ConteudoNotaProps) {
  if (conteudo.trim() === '') {
    return (
      <p className="text-muted-foreground/70 text-sm italic">
        Sem conteúdo ainda.
      </p>
    )
  }

  const links = localizarLinks(conteudo)
  const pedacos: React.ReactNode[] = []
  let cursor = 0

  for (const [indice, link] of links.entries()) {
    pedacos.push(
      <Fragment key={`texto-${indice}`}>
        {conteudo.slice(cursor, link.inicio)}
      </Fragment>,
    )
    pedacos.push(
      <Link
        key={`link-${indice}`}
        to={`/notas/${link.slug}`}
        className={
          existentes.has(link.slug)
            ? 'text-estudos underline underline-offset-2'
            : 'text-muted-foreground underline decoration-dashed underline-offset-2'
        }
      >
        {link.rotulo ?? link.slug}
      </Link>,
    )
    cursor = link.fim
  }
  pedacos.push(<Fragment key="texto-fim">{conteudo.slice(cursor)}</Fragment>)

  return (
    <div className="text-sm leading-relaxed whitespace-pre-wrap">{pedacos}</div>
  )
}
