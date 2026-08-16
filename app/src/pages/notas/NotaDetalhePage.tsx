import { useMemo, useRef, useState } from 'react'
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
import { criarFonteBlocos } from '@/features/notas/blocos'
import {
  useExcluirNota,
  useNota,
  useNotas,
  useSalvarNota,
} from '@/features/notas/hooks'
import { useUIStore } from '@/stores/ui'
import { useAutosave } from '@/features/notas/useAutosave'
import { IndicadorSalvamento } from '@/features/notas/componentes/IndicadorSalvamento'
import { BlocoPropriedades } from '@/features/notas/componentes/BlocoPropriedades'
import { ConteudoNota } from '@/features/notas/componentes/ConteudoNota'
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
  const trilhoAberto = useUIStore((estado) => estado.trilhoNotaAberto)

  const nota = useNota(slug)
  const todas = useNotas()
  const materias = useMaterias()
  const semestres = useSemestres()
  const sessoes = useSessoes()
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
  /*
   * Semeado DURANTE o render, e não num efeito — e a diferença era um bug de
   * nota em branco.
   *
   * Um efeito roda DEPOIS do commit. O editor é não controlado: ele lê `value`
   * uma vez, ao montar (`EditorMarkdownRico`, `inicial = useRef(value)`), e
   * nunca mais olha. Então, no render em que a nota trocava, o editor montava
   * com o `conteudo` da nota ANTERIOR — vazio, no caso de vir de uma nota
   * recém-criada — e o efeito corrigia o estado tarde demais: o React
   * re-renderizava com o texto certo e o editor continuava mostrando o vazio,
   * até recarregar a página.
   *
   * Era mais que um susto visual. O editor emite `onChange` do documento que
   * TEM, então bastava digitar uma tecla naquela tela em branco para o
   * autosave gravar vazio por cima da nota de verdade.
   *
   * Chamar `setState` durante o render do próprio componente é o padrão do
   * React para derivar estado de prop que mudou: ele re-renderiza na hora,
   * antes de pintar, então o editor já monta com o texto certo.
   */
  if (atual && carregada.current !== atual.id) {
    carregada.current = atual.id
    setTitulo(atual.titulo)
    setConteudo(atual.conteudo)
  }

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

  /*
   * O autosave cuida do CONTEÚDO. O título fica de fora de propósito: renomear
   * muda o slug e reescreve o texto de quem cita esta nota — caro demais para
   * acontecer a cada tecla. Ele grava no blur, logo abaixo.
   */
  const estado = useAutosave(
    atual?.id,
    atual?.materia_id,
    atual?.titulo,
    conteudo,
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

  /**
   * Renomeia, e só quando o campo perde o foco.
   *
   * Passa por `salvarNota` inteiro porque renomear é o caso caro: muda o slug,
   * reescreve os links de quem aponta para cá e religa arestas pendentes. Fazer
   * isso a cada tecla escreveria em outras notas dezenas de vezes por frase.
   */
  async function renomear() {
    if (!atual || titulo.trim() === '' || titulo === atual.titulo) return
    await salvar.mutateAsync({
      id: atual.id,
      materiaId: atual.materia_id,
      titulo,
      conteudo,
    })
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
              await excluir.mutateAsync(atual.id)
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
            !trilhoAberto && 'mx-auto w-full max-w-4xl',
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
                onBlur={() => void renomear()}
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
                onAdicionarTopico={adicionarTopico}
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
