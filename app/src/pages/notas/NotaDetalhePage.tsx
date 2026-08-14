import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { DialogConfirmarExclusao } from '@/components/DialogConfirmarExclusao'
import { SkeletonPagina } from '@/components/Skeletons'
import { EditorMarkdown } from '@/components/EditorMarkdown'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useMaterias, useSemestres } from '@/features/estudos/hooks'
import { buscarReferencias, salvarDesenho } from '@/features/notas/api'
import {
  useExcluirNota,
  useNota,
  useNotas,
  useSalvarNota,
} from '@/features/notas/hooks'
import { BlocoPropriedades } from '@/features/notas/componentes/BlocoPropriedades'
import { ConteudoNota } from '@/features/notas/componentes/ConteudoNota'
import { PainelConhecimento } from '@/features/notas/componentes/PainelConhecimento'
import {
  renderizarBloco,
  renderizarDesenho,
} from '@/features/notas/componentes/renderizadores'
import type { Json } from '@/types/database'
import './documento.css'

/**
 * A nota. **A página é o editor.**
 *
 * Antes de 14/08 esta rota era só leitura, com um lápis que jogava de volta num
 * diálogo de 384px — ler e escrever eram duas superfícies, e a de escrever era
 * a menor. Agora são a mesma, separadas só pelo foco, como no Notion e no
 * AFFiNE.
 *
 * **No celular só se lê** (decisão do spec). Ali entra `ConteudoNota`, que
 * renderiza tudo e não carrega o ProseMirror — 458 kB que ninguém precisa
 * baixar para consultar uma fórmula antes da aula.
 *
 * O botão de salvar é **provisório**: a fase 4 troca por autosave, e aí ele
 * some. Está aqui para esta fase não deixar o sistema sem como gravar.
 */
export default function NotaDetalhePage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const desktop = useMediaQuery('(min-width: 768px)')

  const nota = useNota(slug)
  const todas = useNotas()
  const materias = useMaterias()
  const semestres = useSemestres()
  const salvar = useSalvarNota()
  const excluir = useExcluirNota()

  const [titulo, setTitulo] = useState('')
  const [conteudo, setConteudo] = useState('')

  const atual = nota.data ?? null

  /*
   * O rascunho é semeado do servidor UMA VEZ por nota.
   *
   * A guarda por id é o ponto: o objeto muda de identidade a cada refetch do
   * React Query, e semear de novo apagaria o que estivesse sendo escrito no
   * exato momento em que outra aba invalidasse o cache.
   */
  const carregada = useRef<string | null>(null)
  useEffect(() => {
    if (!atual || carregada.current === atual.id) return
    carregada.current = atual.id
    setTitulo(atual.titulo)
    setConteudo(atual.conteudo)
  }, [atual])

  /** Slugs que já existem, para o link a escrever se distinguir do resolvido. */
  const existentes = useMemo(
    () => new Set((todas.data ?? []).map((item) => item.slug)),
    [todas.data],
  )

  /*
   * O rótulo do semestre, pela cadeia nota → matéria → semestre. Nunca por
   * atalho: o spec de 14/08 fixou que semestre não se liga direto à nota, e
   * dois caminhos para o mesmo dado é como se produz inconsistência.
   */
  const semestre = useMemo(() => {
    if (!atual) return null
    const materia = (materias.data ?? []).find(
      (item) => item.id === atual.materia_id,
    )
    if (!materia?.semestre_id) return null
    return (
      (semestres.data ?? []).find((item) => item.id === materia.semestre_id)
        ?.rotulo ?? null
    )
  }, [atual, materias.data, semestres.data])

  const sujo =
    atual !== null && (titulo !== atual.titulo || conteudo !== atual.conteudo)

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
   * certa é oferecer escrever. Criar exige uma matéria, e esta rota não sabe
   * qual — então manda para o índice, onde a escolha existe.
   */
  if (!atual) {
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

  /**
   * Marca um tópico escrevendo a hashtag no fim do conteúdo.
   *
   * Não há tabela a tocar: `notas_topicos` é DERIVADO do texto, e `salvarNota`
   * re-deriva. Gravar o tópico direto criaria um vocabulário que o conteúdo
   * não explica — e some no próximo salvamento.
   */
  function adicionarTopico(slugTopico: string) {
    if (conteudo.includes(`#${slugTopico}`)) return
    setConteudo((atualConteudo) =>
      atualConteudo.trimEnd() === ''
        ? `#${slugTopico}`
        : `${atualConteudo.trimEnd()}

#${slugTopico}`,
    )
  }

  async function gravar() {
    if (!atual) return
    await salvar.mutateAsync({
      id: atual.id,
      materiaId: atual.materia_id,
      titulo,
      conteudo,
    })
  }

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <div className="text-muted-foreground mb-4 flex items-center gap-2 text-xs">
        <Link to={`/estudos/${atual.materia_id}`} className="hover:text-foreground">
          {atual.materia_nome}
        </Link>
        <span aria-hidden>/</span>
        <span className="text-foreground">{atual.titulo}</span>

        <div className="ml-auto flex items-center gap-1">
          {desktop && (
            <Button
              type="button"
              size="sm"
              disabled={!sujo || salvar.isPending}
              onClick={() => void gravar()}
            >
              {salvar.isPending ? 'Salvando…' : sujo ? 'Salvar' : 'Salvo'}
            </Button>
          )}
          <DialogConfirmarExclusao
            titulo="Excluir nota"
            mensagem={`"${atual.titulo}" será apagada. Quem aponta para ela fica com um link quebrado, e o texto do link continua lá.`}
            onConfirmar={async () => {
              await excluir.mutateAsync(atual.id)
              navigate('/notas')
            }}
            pendente={excluir.isPending}
          />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <article className="documento-nota min-w-0">
          {desktop ? (
            <>
              {/*
                Título como âncora do documento, não campo de formulário: sem
                borda, sem rótulo, do tamanho de um H1. É o que faz a página
                parecer documento em vez de ficha.
              */}
              <input
                value={titulo}
                onChange={(evento) => setTitulo(evento.target.value)}
                aria-label="Título da nota"
                placeholder="Sem título"
                className="documento-titulo"
              />

              <BlocoPropriedades
                materiaId={atual.materia_id}
                materiaNome={atual.materia_nome}
                semestre={semestre}
                topicos={atual.topicos}
                atualizadaEm={atual.atualizada_em}
                onAdicionarTopico={adicionarTopico}
              />
              <EditorMarkdown
                value={conteudo}
                onChange={setConteudo}
                placeholder="Escreva aqui…"
                buscarReferencias={buscarReferencias}
                renderizarBloco={renderizarBloco}
                renderizarDesenho={renderizarDesenho}
                onSalvarDesenho={(cena, svg) =>
                  salvarDesenho({
                    notaId: atual.id,
                    cena: cena as unknown as Json,
                    svg,
                  })
                }
              />
            </>
          ) : (
            <>
              <h1 className="documento-titulo mb-2">{atual.titulo}</h1>
              <BlocoPropriedades
                materiaId={atual.materia_id}
                materiaNome={atual.materia_nome}
                semestre={semestre}
                topicos={atual.topicos}
                atualizadaEm={atual.atualizada_em}
                /* Celular é leitura: marcar tópico exige escrever. */
                onAdicionarTopico={() => undefined}
              />
              <div className="documento-leitura">
                <ConteudoNota
                  conteudo={atual.conteudo}
                  existentes={existentes}
                />
              </div>
            </>
          )}
        </article>

        <PainelConhecimento notaId={atual.id} topicos={atual.topicos} />
      </div>
    </div>
  )
}
