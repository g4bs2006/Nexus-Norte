import { Link } from 'react-router-dom'
import { ArrowUpRight, Link2Off, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useBacklinks, useLinksQuebrados } from '../hooks'
import type { Topico } from '../types'

interface PainelConhecimentoProps {
  notaId: string
  topicos: readonly Topico[]
}

/**
 * Painel lateral da nota: backlinks, tópicos e links quebrados (seção 6).
 *
 * Os três respondem perguntas diferentes e por isso ficam juntos: "quem me
 * cita", "de que assunto eu sou" e "o que eu prometi escrever e ainda não
 * escrevi".
 *
 * O grafo só vale se a volta for visível. Sem backlink, um link é um beco sem
 * saída — a nota citada nunca fica sabendo que virou referência, e ao fim do
 * curso o conteúdo existe mas o conhecimento não.
 */
export function PainelConhecimento({
  notaId,
  topicos,
}: PainelConhecimentoProps) {
  const backlinks = useBacklinks(notaId)
  const quebrados = useLinksQuebrados(notaId)

  return (
    <div className="space-y-4">
      <Secao icone={ArrowUpRight} titulo="Citada por">
        {backlinks.data === undefined ? (
          <Espera />
        ) : backlinks.data.length === 0 ? (
          <Vazio texto="Nenhuma nota aponta para esta ainda." />
        ) : (
          <ul className="space-y-2">
            {backlinks.data.map((backlink) => (
              <li key={backlink.id}>
                <Link
                  to={`/notas/${backlink.slug}`}
                  className="hover:text-estudos block text-sm"
                >
                  {backlink.titulo}
                </Link>
                <span className="text-muted-foreground text-[11px]">
                  {backlink.materia_nome}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Secao>

      <Secao icone={Tag} titulo="Tópicos">
        {topicos.length === 0 ? (
          <Vazio texto="Marque com #assunto no texto para agrupar entre matérias." />
        ) : (
          <div className="flex flex-wrap gap-1">
            {topicos.map((topico) => (
              <Badge key={topico.id} variant="secondary" className="font-normal">
                <Link to={`/notas?topico=${topico.slug}`}>{topico.nome}</Link>
              </Badge>
            ))}
          </div>
        )}
      </Secao>

      {/*
       * Link quebrado não é erro, é a próxima nota a escrever — e por isso a
       * seção só aparece quando há um, e chama de "a escrever".
       */}
      {quebrados.data !== undefined && quebrados.data.length > 0 && (
        <Secao icone={Link2Off} titulo="A escrever">
          <ul className="space-y-1">
            {quebrados.data.map((quebrado) => (
              <li key={quebrado.slug} className="text-muted-foreground text-sm">
                {quebrado.slug}
              </li>
            ))}
          </ul>
        </Secao>
      )}
    </div>
  )
}

function Secao({
  icone: Icone,
  titulo,
  children,
}: {
  icone: typeof Tag
  titulo: string
  children: React.ReactNode
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="space-y-2">
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
          <Icone aria-hidden className="size-3.5" />
          {titulo}
        </p>
        {children}
      </CardContent>
    </Card>
  )
}

function Vazio({ texto }: { texto: string }) {
  return <p className="text-muted-foreground/70 text-xs">{texto}</p>
}

function Espera() {
  return <p className="text-muted-foreground/70 text-xs">Carregando…</p>
}
