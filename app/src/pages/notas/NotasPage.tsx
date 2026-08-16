import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Settings2, Tag, NotebookPen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EstadoVazio } from '@/components/EstadoVazio'
import { PageHeader } from '@/components/PageHeader'
import { SkeletonPagina } from '@/components/Skeletons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDebounced } from '@/hooks/useDebounced'
import { useMaterias, useSemestres } from '@/features/estudos/hooks'
import { useBuscaNotas, useNotas, useTopicos } from '@/features/notas/hooks'
import { TrechoBusca } from '@/features/notas/componentes/TrechoBusca'
import { BotaoExportar } from '@/features/notas/componentes/BotaoExportar'
import { DialogGerenciarTopicos } from '@/features/notas/componentes/DialogGerenciarTopicos'

/** Valor do `Select` para "sem filtro". String vazia não é aceita pelo shadcn. */
const TODOS = 'todos'

/**
 * Índice global de notas — sem escopo de semestre (spec 14/08, seção 9).
 *
 * Sem ele, achar nota antiga exige lembrar em que semestre foi escrita, que é
 * exatamente o que ninguém lembra. Aqui a nota é encontrada pelo assunto, pela
 * matéria ou pelo texto do título, e não pelo caminho que levou até ela.
 *
 * O filtro roda no cliente de propósito: a base é de uma pessoa, tudo já veio
 * numa consulta, e filtrar em memória responde a cada tecla sem ida ao
 * servidor. A busca de verdade, por conteúdo, é a fase 8.
 */
export default function NotasPage() {
  const [params, setParams] = useSearchParams()
  const [termo, setTermo] = useState('')
  const [gerenciadorAberto, setGerenciadorAberto] = useState(false)

  const termoBusca = useDebounced(termo.trim(), 250)
  const notas = useNotas()
  const busca = useBuscaNotas(termoBusca)
  const materias = useMaterias()
  const semestres = useSemestres()
  const topicos = useTopicos()

  const topicoFiltro = params.get('topico') ?? TODOS
  const materiaFiltro = params.get('materia') ?? TODOS
  const semestreFiltro = params.get('semestre') ?? TODOS

  /** Semestre de cada matéria — a cadeia nota → matéria → semestre, em memória. */
  const semestrePorMateria = useMemo(
    () =>
      new Map(
        (materias.data ?? []).map((materia) => [materia.id, materia.semestre_id]),
      ),
    [materias.data],
  )

  /*
   * Com termo, quem manda é o servidor: `busca_notas` procura DENTRO do
   * conteúdo e ordena por relevância, que é o ponto da fase 8 — filtrar título
   * em memória nunca acharia "aquilo que eu anotei em algum lugar". Os filtros
   * de matéria, tópico e semestre seguem por cima, em memória.
   */
  const encontrados = useMemo(() => {
    if (termoBusca === '') return null
    const slugs = new Set((busca.data ?? []).map((achado) => achado.slug))
    return slugs
  }, [termoBusca, busca.data])

  const trechoPorSlug = useMemo(
    () =>
      new Map((busca.data ?? []).map((achado) => [achado.slug, achado.trecho])),
    [busca.data],
  )

  const filtradas = useMemo(() => {
    return (notas.data ?? []).filter((nota) => {
      if (encontrados !== null && !encontrados.has(nota.slug)) return false
      if (materiaFiltro !== TODOS && nota.materia_id !== materiaFiltro) {
        return false
      }
      if (
        topicoFiltro !== TODOS &&
        !nota.topicos.some((topico) => topico.slug === topicoFiltro)
      ) {
        return false
      }
      if (
        semestreFiltro !== TODOS &&
        semestrePorMateria.get(nota.materia_id) !== semestreFiltro
      ) {
        return false
      }
      return true
    })
  }, [
    notas.data,
    encontrados,
    materiaFiltro,
    topicoFiltro,
    semestreFiltro,
    semestrePorMateria,
  ])

  function definirFiltro(chave: string, valor: string) {
    const proximos = new URLSearchParams(params)
    if (valor === TODOS) proximos.delete(chave)
    else proximos.set(chave, valor)
    setParams(proximos, { replace: true })
  }

  return (
    <>
      <PageHeader
        titulo="Notas"
        descricao="Tudo que foi escrito, de todas as matérias e semestres."
        pilar="estudos"
        acoes={<BotaoExportar />}
      />

      <div className="surgir-grupo space-y-5">
        <div className="grid gap-2 sm:grid-cols-4">
          <Input
            value={termo}
            onChange={(evento) => setTermo(evento.target.value)}
            placeholder="Buscar no conteúdo…"
          />

          <FiltroSelect
            valor={materiaFiltro}
            aoMudar={(valor) => definirFiltro('materia', valor)}
            rotuloTodos="Todas as matérias"
            opcoes={(materias.data ?? []).map((materia) => ({
              valor: materia.id,
              rotulo: materia.nome,
            }))}
          />

          <FiltroSelect
            valor={topicoFiltro}
            aoMudar={(valor) => definirFiltro('topico', valor)}
            rotuloTodos="Todos os tópicos"
            opcoes={(topicos.data ?? []).map((topico) => ({
              valor: topico.slug,
              rotulo: topico.nome,
            }))}
          />

          <FiltroSelect
            valor={semestreFiltro}
            aoMudar={(valor) => definirFiltro('semestre', valor)}
            rotuloTodos="Todos os semestres"
            opcoes={(semestres.data ?? []).map((semestre) => ({
              valor: semestre.id,
              rotulo: semestre.rotulo,
            }))}
          />
        </div>

        {topicos.data && (
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar min-w-0">
              <span className="text-muted-foreground font-medium shrink-0 flex items-center gap-1">
                <Tag className="size-3" /> Tópicos:
              </span>
              <button
                type="button"
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium transition-colors shrink-0 cursor-pointer',
                  topicoFiltro === TODOS
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent',
                )}
                onClick={() => definirFiltro('topico', TODOS)}
              >
                Todos ({notas.data?.length ?? 0})
              </button>
              {topicos.data.map((t) => {
                const contagem = (notas.data ?? []).filter((n) =>
                  n.topicos.some((top) => top.slug === t.slug),
                ).length
                if (contagem === 0) return null
                const ativo = topicoFiltro === t.slug
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-medium transition-colors shrink-0 flex items-center gap-1 cursor-pointer',
                      ativo
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                    onClick={() => definirFiltro('topico', t.slug)}
                  >
                    <span>#{t.nome}</span>
                    <span
                      className={cn(
                        'rounded-full px-1 py-0.2 text-[10px]',
                        ativo ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-background/80 text-muted-foreground',
                      )}
                    >
                      {contagem}
                    </span>
                  </button>
                )
              })}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 shrink-0 ml-auto border-dashed hover:border-solid"
              onClick={() => setGerenciadorAberto(true)}
            >
              <Settings2 className="size-3.5 text-muted-foreground" />
              <span>Gerenciar Tópicos</span>
            </Button>
          </div>
        )}

        <DialogGerenciarTopicos
          aberto={gerenciadorAberto}
          onAbertoChange={setGerenciadorAberto}
        />

        {notas.isPending ? (
          <SkeletonPagina variante="lista" />
        ) : filtradas.length === 0 ? (
          <EstadoVazio
            icone={NotebookPen}
            classeCor="text-estudos"
            classeFundo="bg-estudos/10"
            titulo={
              (notas.data ?? []).length === 0
                ? 'Nenhuma nota escrita ainda'
                : termoBusca !== ''
                  ? `Nada escrito sobre "${termoBusca}"`
                  : 'Nada com esses filtros'
            }
            descricao={
              (notas.data ?? []).length === 0
                ? 'A nota nasce dentro da matéria, na aba Notas.'
                : 'Tente outra palavra, ou afrouxe a matéria, o tópico e o semestre.'
            }
          />
        ) : (
          <ul className="space-y-2">
            {filtradas.map((nota) => (
              <li key={nota.id}>
                <Card>
                  <CardContent className="space-y-1.5">
                    <Link
                      to={`/notas/${nota.slug}`}
                      className="hover:text-estudos block text-sm font-medium"
                    >
                      {nota.titulo}
                    </Link>
                    <p className="text-muted-foreground text-[11px]">
                      {nota.materia_nome}
                    </p>
                    {trechoPorSlug.has(nota.slug) && (
                      <TrechoBusca texto={trechoPorSlug.get(nota.slug) ?? ''} />
                    )}
                    {nota.topicos.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {nota.topicos.map((topico) => (
                          <Badge
                            key={topico.id}
                            variant="secondary"
                            className="font-normal"
                          >
                            {topico.nome}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

function FiltroSelect({
  valor,
  aoMudar,
  rotuloTodos,
  opcoes,
}: {
  valor: string
  aoMudar: (valor: string) => void
  rotuloTodos: string
  opcoes: readonly { valor: string; rotulo: string }[]
}) {
  return (
    <Select value={valor} onValueChange={aoMudar}>
      <SelectTrigger>
        <SelectValue placeholder={rotuloTodos} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={TODOS}>{rotuloTodos}</SelectItem>
        {opcoes.map((opcao) => (
          <SelectItem key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
