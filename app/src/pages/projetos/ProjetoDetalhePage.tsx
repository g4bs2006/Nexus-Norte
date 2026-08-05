import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, Pencil, Plus } from 'lucide-react'
import { DialogConfirmarExclusao } from '@/components/DialogConfirmarExclusao'
import { PageHeader } from '@/components/PageHeader'
import { SkeletonPagina } from '@/components/Skeletons'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BarraProgresso } from '@/components/BarraProgresso'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { deISO, paraISO } from '@/lib/datas'
import { cn } from '@/lib/utils'
import {
  diasDesdeUltimaAtualizacao,
  momentumBaixo,
  percentualConcluido,
} from '@/features/projetos/calculos'
import {
  useAtualizarLog,
  useAtualizarMarco,
  useAtualizarProjeto,
  useCriarLog,
  useCriarMarco,
  useExcluirLog,
  useExcluirMarco,
  useExcluirProjeto,
  useLogs,
  useMarcos,
  useProjetos,
} from '@/features/projetos/hooks'
import { DialogProjeto } from '@/features/projetos/componentes/DialogProjeto'
import {
  ROTULOS_STATUS_MARCO,
  ROTULOS_STATUS_PROJETO,
  type StatusMarco,
  type StatusProjeto,
} from '@/features/projetos/types'

const STATUS_PROJETO = Object.keys(ROTULOS_STATUS_PROJETO) as StatusProjeto[]
const STATUS_MARCO = Object.keys(ROTULOS_STATUS_MARCO) as StatusMarco[]

const CLASSE_MARCO: Record<StatusMarco, string> = {
  a_fazer: 'text-muted-foreground',
  fazendo: 'text-status-atencao',
  feito: 'text-status-ok',
}

export default function ProjetoDetalhePage() {
  const { projetoId } = useParams<{ projetoId: string }>()
  const navigate = useNavigate()
  const hoje = useMemo(() => new Date(), [])

  const projetos = useProjetos()
  const marcos = useMarcos()
  const logs = useLogs()

  const atualizarProjeto = useAtualizarProjeto()
  const excluirProjeto = useExcluirProjeto()
  const criarMarco = useCriarMarco()
  const atualizarMarco = useAtualizarMarco()
  const excluirMarco = useExcluirMarco()
  const criarLog = useCriarLog()
  const atualizarLog = useAtualizarLog()
  const excluirLog = useExcluirLog()

  const [nomeMarco, setNomeMarco] = useState('')
  const [dataMarco, setDataMarco] = useState('')
  const [conteudoLog, setConteudoLog] = useState('')
  const [idLogEditando, setIdLogEditando] = useState<string | null>(null)
  const [textoLogEditando, setTextoLogEditando] = useState('')

  const projeto = projetos.data?.find((item) => item.id === projetoId)

  const doProjeto = useMemo(
    () => (marcos.data ?? []).filter((marco) => marco.projeto_id === projetoId),
    [marcos.data, projetoId],
  )

  const logsDoProjeto = useMemo(
    () => (logs.data ?? []).filter((log) => log.projeto_id === projetoId),
    [logs.data, projetoId],
  )

  if (projetos.isPending) {
    return (
      <>
        <PageHeader titulo="Projeto" pilar="projetos" />
        <SkeletonPagina variante="detalhe" />
      </>
    )
  }

  if (!projeto || !projetoId) {
    return (
      <>
        <PageHeader
          titulo="Projeto não encontrado"
          descricao="Este projeto não existe ou foi excluído."
          pilar="projetos"
        />
        <Button asChild variant="secondary" size="sm">
          <Link to="/projetos">
            <ArrowLeft className="size-4" />
            Voltar para Projetos
          </Link>
        </Button>
      </>
    )
  }

  const percentual = percentualConcluido(doProjeto)
  const dias = diasDesdeUltimaAtualizacao(logsDoProjeto, hoje)
  const esfriou = momentumBaixo(dias) && projeto.status !== 'concluido'

  // Capturado após o guard: o narrowing de `projetoId` não atravessa o closure
  // das funções abaixo.
  const idProjeto: string = projetoId

  async function adicionarMarco() {
    if (nomeMarco.trim() === '') return
    await criarMarco.mutateAsync({
      projeto_id: idProjeto,
      nome: nomeMarco.trim(),
      data_prevista: dataMarco === '' ? null : dataMarco,
    })
    setNomeMarco('')
    setDataMarco('')
  }

  async function adicionarLog() {
    if (conteudoLog.trim() === '') return
    await criarLog.mutateAsync({
      projeto_id: idProjeto,
      data: paraISO(hoje),
      conteudo: conteudoLog.trim(),
    })
    setConteudoLog('')
  }

  return (
    <>
      <PageHeader
        titulo={projeto.nome}
        descricao={projeto.descricao ?? undefined}
        pilar="projetos"
        acoes={
          <div className="flex items-center gap-1">
            <DialogProjeto hoje={hoje} projeto={projeto} />
            <DialogConfirmarExclusao
              titulo="Excluir projeto"
              mensagem={`Todos os marcos e logs de progresso do projeto "${projeto.nome}" serão excluídos.`}
              onConfirmar={async () => {
                await excluirProjeto.mutateAsync(projeto.id)
                navigate('/projetos')
              }}
              pendente={excluirProjeto.isPending}
            />
            <Button asChild variant="ghost" size="sm">
              <Link to="/projetos">
                <ArrowLeft className="size-4" />
                Voltar
              </Link>
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select
                  value={projeto.status}
                  onValueChange={(valor) =>
                    atualizarProjeto.mutate({
                      id: projetoId,
                      dados: { status: valor },
                    })
                  }
                >
                  <SelectTrigger size="sm" className="w-[12rem]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_PROJETO.map((valor) => (
                      <SelectItem key={valor} value={valor}>
                        {ROTULOS_STATUS_PROJETO[valor]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="text-right">
                <p className="text-muted-foreground text-xs">Prazo</p>
                <p className="text-sm tabular-nums">
                  {projeto.prazo_alvo
                    ? format(deISO(projeto.prazo_alvo), 'dd/MM/yyyy')
                    : '—'}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-muted-foreground flex justify-between text-xs">
                <span>Marcos concluídos</span>
                <span className="tabular-nums">
                  {percentual === null
                    ? 'sem marcos'
                    : `${Math.round(percentual)}%`}
                </span>
              </div>
              <BarraProgresso
                valor={percentual ?? 0}
                classeCor="bg-projetos"
                rotulo="Marcos concluídos"
              />
            </div>

            <p
              className={cn(
                'text-xs',
                esfriou ? 'text-status-atencao' : 'text-muted-foreground',
              )}
            >
              {dias === null
                ? 'Nenhum progresso registrado ainda'
                : dias === 0
                  ? 'Atualizado hoje'
                  : `Última atualização há ${dias} ${dias === 1 ? 'dia' : 'dias'}`}
            </p>
          </CardContent>
        </Card>

        {/* Marcos (plano 5.3) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Marcos</CardTitle>
            <CardDescription>
              Checklist do que precisa acontecer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[10rem] flex-1 space-y-1.5">
                <Label className="text-xs" htmlFor="marco-nome">
                  Novo marco
                </Label>
                <Input
                  id="marco-nome"
                  className="h-8"
                  value={nomeMarco}
                  onChange={(evento) => setNomeMarco(evento.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="marco-data">
                  Data prevista
                </Label>
                <Input
                  id="marco-data"
                  type="date"
                  className="h-8"
                  value={dataMarco}
                  onChange={(evento) => setDataMarco(evento.target.value)}
                />
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void adicionarMarco()}
                disabled={criarMarco.isPending}
              >
                <Plus className="size-4" />
                Adicionar
              </Button>
            </div>

            {doProjeto.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nenhum marco definido.
              </p>
            ) : (
              <ul className="divide-border divide-y">
                {doProjeto.map((marco) => (
                  <li
                    key={marco.id}
                    className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p
                        className={cn(
                          'truncate text-sm',
                          marco.status === 'feito' &&
                            'text-muted-foreground line-through',
                        )}
                      >
                        {marco.nome}
                      </p>
                      {marco.data_prevista && (
                        <p className="text-muted-foreground text-xs tabular-nums">
                          prevista{' '}
                          {format(deISO(marco.data_prevista), 'dd/MM/yyyy')}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Select
                        value={marco.status}
                        onValueChange={(valor) =>
                          atualizarMarco.mutate({
                            id: marco.id,
                            dados: { status: valor },
                          })
                        }
                      >
                        <SelectTrigger
                          size="sm"
                          className={cn('w-[8rem]', CLASSE_MARCO[marco.status])}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_MARCO.map((valor) => (
                            <SelectItem key={valor} value={valor}>
                              {ROTULOS_STATUS_MARCO[valor]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <DialogConfirmarExclusao
                        titulo={`Remover ${marco.nome}`}
                        mensagem="O marco sai do projeto e do cálculo de progresso. Se ele tinha prazo, deixa de aparecer no calendário."
                        onConfirmar={() => excluirMarco.mutate(marco.id)}
                        pendente={excluirMarco.isPending}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Log de progresso — a ação diária do pilar (plano 5.4) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Log de progresso</CardTitle>
            <CardDescription>
              Registrar aqui é a ação do dia deste pilar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs" htmlFor="log-conteudo">
                  O que avançou hoje?
                </Label>
                <Input
                  id="log-conteudo"
                  className="h-8"
                  value={conteudoLog}
                  onChange={(evento) => setConteudoLog(evento.target.value)}
                  onKeyDown={(evento) => {
                    if (evento.key === 'Enter') void adicionarLog()
                  }}
                />
              </div>
              <Button
                size="sm"
                onClick={() => void adicionarLog()}
                disabled={criarLog.isPending}
              >
                Registrar
              </Button>
            </div>

            {logsDoProjeto.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nenhum registro ainda.
              </p>
            ) : (
              <ol className="space-y-3">
                {logsDoProjeto.map((log) => (
                  <li key={log.id} className="flex gap-3">
                    <div className="flex flex-col items-center pt-1">
                      <span
                        aria-hidden
                        className="bg-projetos size-1.5 shrink-0 rounded-full"
                      />
                      <span className="bg-border mt-1 w-px flex-1" />
                    </div>
                    <div className="min-w-0 flex-1 pb-1">
                      {idLogEditando === log.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            className="h-8 text-sm"
                            value={textoLogEditando}
                            onChange={(e) =>
                              setTextoLogEditando(e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (
                                e.key === 'Enter' &&
                                textoLogEditando.trim()
                              ) {
                                void atualizarLog.mutateAsync({
                                  id: log.id,
                                  dados: { conteudo: textoLogEditando.trim() },
                                })
                                setIdLogEditando(null)
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              if (textoLogEditando.trim()) {
                                void atualizarLog.mutateAsync({
                                  id: log.id,
                                  dados: { conteudo: textoLogEditando.trim() },
                                })
                                setIdLogEditando(null)
                              }
                            }}
                          >
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setIdLogEditando(null)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm">{log.conteudo}</p>
                          <p className="text-muted-foreground text-xs tabular-nums">
                            {format(deISO(log.data), 'dd/MM/yyyy')}
                          </p>
                        </>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground size-11 shrink-0 sm:size-7"
                        aria-label="Editar registro"
                        onClick={() => {
                          setIdLogEditando(log.id)
                          setTextoLogEditando(log.conteudo)
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <DialogConfirmarExclusao
                        titulo="Remover registro do diário"
                        mensagem="O texto será apagado. É registro escrito à mão, então não há de onde reconstruí-lo."
                        onConfirmar={() => excluirLog.mutate(log.id)}
                        pendente={excluirLog.isPending}
                      />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
