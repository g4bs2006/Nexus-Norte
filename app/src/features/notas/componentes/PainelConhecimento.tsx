import { Link } from 'react-router-dom'
import { ArrowUpRight, Link2Off, PanelRightClose, PanelRightOpen, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/stores/ui'
import { useBacklinks, useLinksQuebrados } from '../hooks'
import type { Topico } from '../types'

interface PainelConhecimentoProps {
  notaId: string
  topicos: readonly Topico[]
  /** No celular o trilho vira rodapé: sem recolher, sem borda lateral. */
  comoRodape?: boolean
}

/**
 * Trilho de conhecimento: backlinks, tópicos e links a escrever.
 *
 * Os três respondem perguntas diferentes e por isso ficam juntos: "quem me
 * cita", "de que assunto eu sou" e "o que eu prometi escrever e ainda não
 * escrevi".
 *
 * **Fica ao lado, e não no rodapé como o Notion faz.** O grafo é a tese desta
 * feature — no rodapé ele só aparece para quem rolar até o fim, e numa base de
 * conhecimento isso é esconder o que dá sentido ao resto. Sem backlink um link
 * é beco sem saída: a nota citada nunca fica sabendo que virou referência, e
 * ao fim do curso o conteúdo existe mas o conhecimento não.
 *
 * Recolhível porque escrever pede silêncio às vezes, e o estado é lembrado —
 * é preferência de trabalho, não estado de tela.
 *
 * No celular vira rodapé, aí sim: 280px ao lado de uma coluna de leitura não
 * cabem, e ali só se lê.
 */
export function PainelConhecimento({
  notaId,
  topicos,
  comoRodape = false,
}: PainelConhecimentoProps) {
  const aberto = useUIStore((estado) => estado.trilhoNotaAberto)
  const alternar = useUIStore((estado) => estado.alternarTrilhoNota)

  const backlinks = useBacklinks(notaId)
  const quebrados = useLinksQuebrados(notaId)

  const conteudo = (
    <>
      <Secao icone={ArrowUpRight} titulo="Citada por" total={backlinks.data?.length}>
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

      <Secao icone={Tag} titulo="Tópicos" total={topicos.length}>
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
        Link quebrado não é erro, é a próxima nota a escrever — por isso a
        seção só aparece quando há um, e chama de "a escrever".
      */}
      {quebrados.data !== undefined && quebrados.data.length > 0 && (
        <Secao
          icone={Link2Off}
          titulo="A escrever"
          total={quebrados.data.length}
        >
          <ul className="space-y-1">
            {quebrados.data.map((quebrado) => (
              <li key={quebrado.slug} className="text-muted-foreground text-sm">
                {quebrado.slug}
              </li>
            ))}
          </ul>
        </Secao>
      )}
    </>
  )

  if (comoRodape) {
    return (
      <aside className="border-border mt-10 space-y-5 border-t pt-6">
        {conteudo}
      </aside>
    )
  }

  if (!aberto) {
    return (
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground size-8"
          aria-label="Mostrar conhecimento"
          onClick={alternar}
        >
          <PanelRightOpen className="size-4" />
        </Button>
      </div>
    )
  }

  return (
    <aside className="space-y-5">
      <div className="text-muted-foreground flex items-center justify-between">
        <span className="text-[11px] tracking-wide uppercase">Conhecimento</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground size-8"
          aria-label="Ocultar conhecimento"
          onClick={alternar}
        >
          <PanelRightClose className="size-4" />
        </Button>
      </div>
      {conteudo}
    </aside>
  )
}

/**
 * Uma seção do trilho. Sem `Card`: card aqui desenharia três caixas ao lado do
 * texto e faria o trilho competir com o documento, que é o oposto do que ele
 * serve para fazer.
 */
function Secao({
  icone: Icone,
  titulo,
  total,
  children,
}: {
  icone: typeof Tag
  titulo: string
  total?: number
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
        <Icone aria-hidden className="size-3.5" />
        {titulo}
        {total !== undefined && total > 0 && (
          <span className="text-muted-foreground/60">{total}</span>
        )}
      </p>
      {children}
    </section>
  )
}

function Vazio({ texto }: { texto: string }) {
  return <p className="text-muted-foreground/70 text-xs">{texto}</p>
}

function Espera() {
  return <p className="text-muted-foreground/70 text-xs">Carregando…</p>
}
