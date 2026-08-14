import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { DialogConfirmarExclusao } from '@/components/DialogConfirmarExclusao'
import { PageHeader } from '@/components/PageHeader'
import { SkeletonPagina } from '@/components/Skeletons'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useExcluirNota, useNota, useNotas } from '@/features/notas/hooks'
import { ConteudoNota } from '@/features/notas/componentes/ConteudoNota'
import { DialogNota } from '@/features/notas/componentes/DialogNota'
import { PainelConhecimento } from '@/features/notas/componentes/PainelConhecimento'

/**
 * A nota em largura de leitura, com o painel de conhecimento ao lado.
 *
 * Página, e não diálogo dentro de uma aba (spec 14/08, seção 9). Uma nota de
 * cinco anos de curso é o objeto principal do pilar; abrir em modal a mantinha
 * como acessório da matéria, e modal não tem endereço para linkar.
 */
export default function NotaDetalhePage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const nota = useNota(slug)
  const todas = useNotas()
  const excluir = useExcluirNota()

  /** Slugs que já existem, para o link a escrever se distinguir do resolvido. */
  const existentes = useMemo(
    () => new Set((todas.data ?? []).map((item) => item.slug)),
    [todas.data],
  )

  if (nota.isPending) {
    return (
      <>
        <PageHeader titulo="Nota" pilar="estudos" />
        <SkeletonPagina variante="detalhe" />
      </>
    )
  }

  /*
   * Slug sem nota não é erro: é o link quebrado do outro lado, e a resposta
   * certa é oferecer escrever. Só que criar exige uma matéria, e esta rota não
   * sabe qual — então manda para o índice, onde a escolha existe.
   */
  if (!nota.data) {
    return (
      <>
        <PageHeader
          titulo="Nota ainda não escrita"
          descricao={`Nada em "${slug}" por enquanto. Alguma nota aponta para cá — crie a partir da matéria a que ela pertence.`}
          pilar="estudos"
        />
        <Button asChild variant="secondary" size="sm">
          <Link to="/notas">
            <ArrowLeft className="size-4" />
            Ver todas as notas
          </Link>
        </Button>
      </>
    )
  }

  const atual = nota.data

  return (
    <>
      <PageHeader
        titulo={atual.titulo}
        descricao={atual.materia_nome}
        pilar="estudos"
        acoes={
          <div className="flex items-center gap-1">
            <DialogNota materiaId={atual.materia_id} nota={atual} />
            <DialogConfirmarExclusao
              titulo="Excluir nota"
              mensagem={`"${atual.titulo}" será apagada. Quem aponta para ela fica com um link quebrado, e o texto do link continua lá.`}
              onConfirmar={async () => {
                await excluir.mutateAsync(atual.id)
                navigate('/notas')
              }}
              pendente={excluir.isPending}
            />
            <Button asChild variant="ghost" size="sm">
              <Link to={`/estudos/${atual.materia_id}`}>
                <ArrowLeft className="size-4" />
                Matéria
              </Link>
            </Button>
          </div>
        }
      />

      <div className="surgir-grupo grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card>
          <CardContent>
            <ConteudoNota conteudo={atual.conteudo} existentes={existentes} />
          </CardContent>
        </Card>

        <PainelConhecimento notaId={atual.id} topicos={atual.topicos} />
      </div>
    </>
  )
}
