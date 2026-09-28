import { useEffect, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { DialogConfirmarExclusao } from '@/components/DialogConfirmarExclusao'
import { SkeletonPagina } from '@/components/Skeletons'
import { EditorMarkdown } from '@/components/EditorMarkdown'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useMaterias, useSemestres, useSessoes } from '@/features/estudos/hooks'
import {
  buscarReferencias,
  enviarImagemNota,
  salvarDesenho,
} from '@/features/notas/api'
import { fonteSimbolos } from '@/features/notas/simbolos'
import { fonteTopicos } from '@/features/notas/topicos'
import { criarFonteBlocos } from '@/features/notas/blocos'
import {
  useExcluirNota,
  useNota,
  useNotas,
} from '@/features/notas/hooks'
import { useUIStore } from '@/stores/ui'
import { useAutosave } from '@/features/notas/useAutosave'
import { IndicadorSalvamento } from '@/features/notas/componentes/IndicadorSalvamento'
import { BlocoPropriedades } from '@/features/notas/componentes/BlocoPropriedades'
import { PainelConhecimento } from '@/features/notas/componentes/PainelConhecimento'
import { PeekNota } from '@/features/notas/componentes/PeekNota'
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
 * **No celular só se lê** (decisão do spec de 14/08), e desde 18/08 quem
 * renderiza ali é o MESMO editor, travado por `somenteLeitura`. O renderizador
 * próprio que existia antes não renderizava Markdown — era `pre-wrap` sobre o
 * texto cru, então `- item` e `## Título` apareciam literais. Um segundo
 * renderizador de verdade custaria duas implementações de cada construção da
 * nota, divergindo em silêncio; o editor travado custa 143 kB gz uma vez, e faz
 * o que se lê ser por construção o que se edita.
 *
 * O rascunho é persistido a cada alteração; a fila de salvamento sobrevive à navegação.
 */
export default function NotaDetalhePage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const desktop = useMediaQuery('(min-width: 768px)')
  const trilhoAberto = useUIStore((estado) => estado.trilhoNotaAberto)

  const nota = useNota(slug)
  const todas = useNotas()
  const materias = useMaterias()
  const semestres = useSemestres()
  const sessoes = useSessoes()
  const excluir = useExcluirNota()

  const atual = nota.data ?? null
  const { titulo, conteudo, estado, setTitulo, setConteudo, flush, descartar } = useAutosave(atual)

  useEffect(() => {
    if (atual && atual.slug !== slug) navigate(`/notas/${atual.slug}`, { replace: true })
  }, [atual, slug, navigate])

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

  const sessoesDaMateria = useMemo(
    () =>
      (sessoes.data ?? []).filter(
        (sessao) => sessao.materia_id === atual?.materia_id,
      ),
    [sessoes.data, atual?.materia_id],
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



  return (
    <div className="mx-auto w-full max-w-[1100px]">
      {/*
        Um só para a página inteira: ele escuta o documento, então serve tanto
        os links do editor quanto os da leitura. A matéria é a desta nota — é
        onde uma nota faltante nasce, e é o palpite certo em quase todo caso.
      */}
      <PeekNota materiaId={atual.materia_id} />
      <div className="text-muted-foreground mb-4 flex items-center gap-2 text-xs">
        <Link to={`/estudos/${atual.materia_id}`} className="hover:text-foreground">
          {atual.materia_nome}
        </Link>
        <span aria-hidden>/</span>
        <span className="text-foreground">{atual.titulo}</span>

        <div className="ml-auto flex items-center gap-1">
          {desktop && <IndicadorSalvamento estado={estado} />}
          <DialogConfirmarExclusao
            titulo="Excluir nota"
            mensagem={`"${atual.titulo}" será apagada. Quem aponta para ela fica com um link quebrado, e o texto do link continua lá.`}
            onConfirmar={async () => {
              await flush()
              await excluir.mutateAsync(atual.id)
              descartar()
              navigate('/notas')
            }}
            pendente={excluir.isPending}
          />
        </div>
      </div>

      {/*
        A coluna do trilho encolhe para o botão quando ele está fechado, em vez
        de sumir: sem uma alça visível, reabrir viraria caça ao atalho.
      */}
      <div
        className={cn(
          'grid transition-all duration-300 ease-in-out',
          trilhoAberto
            ? 'gap-10 lg:grid-cols-[minmax(0,1fr)_280px]'
            : 'gap-4 lg:grid-cols-[minmax(0,1fr)_2.5rem]',
        )}
      >
        <article
          className={cn(
            'documento-nota min-w-0 transition-all duration-300 ease-in-out',
            /* Sem `max-w-*`: `documento-nota` fixa 68ch e, por não estar em
               camada, vence a camada `utilities` — a classe era inerte e só
               enganava quem lesse o JSX. */
            !trilhoAberto && 'mx-auto w-full',
          )}
        >
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
                onBlur={() => void flush()}
                aria-label="Título da nota"
                placeholder="Sem título"
                className="documento-titulo"
              />

              <BlocoPropriedades
                notaId={atual.id}
                sessaoId={atual.sessao_id}
                materiaId={atual.materia_id}
                materiaNome={atual.materia_nome}
                semestre={semestre}
                topicos={atual.topicos}
                atualizadaEm={atual.atualizada_em}
                sessoesDaMateria={sessoesDaMateria}
              />
              <EditorMarkdown
                /*
                 * Um editor por nota. Sem isto, navegar entre notas mantém a
                 * MESMA instância montada — mesma rota, mesmo componente — e
                 * um editor não controlado nunca troca o documento que já
                 * tem: a nota aberta mostrava o texto da anterior.
                 */
                key={atual.id}
                value={conteudo}
                onChange={setConteudo}
                placeholder="Escreva aqui…"
                buscarReferencias={buscarReferencias}
                buscarTopicos={fonteTopicos}
                renderizarBloco={renderizarBloco}
                renderizarDesenho={renderizarDesenho}
                simbolos={fonteSimbolos}
                criarBlocos={criarFonteBlocos}
                slugExiste={(slug) => existentes.has(slug)}
                enviarImagem={enviarImagemNota}
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
              />
              {/*
                O MESMO editor, travado — ver `somenteLeitura` em
                `EditorMarkdownRico`. O renderizador próprio que existia aqui
                não renderizava Markdown (era texto cru com `pre-wrap`), então
                lista, título e negrito apareciam literais: a nota lida não era
                a nota escrita.

                `conteudo`, e não `atual.conteudo`: é o mesmo estado semeado no
                render, então uma edição feita no desktop e ainda não salva não
                desaparece se a janela for estreitada.
              */}
              <EditorMarkdown
                key={atual.id}
                value={conteudo}
                onChange={setConteudo}
                somenteLeitura
                renderizarBloco={renderizarBloco}
                renderizarDesenho={renderizarDesenho}
                slugExiste={(slug) => existentes.has(slug)}
              />
            </>
          )}
        </article>

        {desktop ? (
          <PainelConhecimento notaId={atual.id} topicos={atual.topicos} />
        ) : (
          <PainelConhecimento
            notaId={atual.id}
            topicos={atual.topicos}
            comoRodape
          />
        )}
      </div>
    </div>
  )
}
