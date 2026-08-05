import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Plus } from 'lucide-react'
import { DialogConfirmarExclusao } from '@/components/DialogConfirmarExclusao'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { deISO, paraISO } from '@/lib/datas'
import { formatarDecimal, parseDecimal } from '@/lib/numeros'
import { NOTA_MINIMA_APROVACAO } from '@/lib/constants'
import {
  useAtualizarAvaliacao,
  useCriarAvaliacao,
  useExcluirAvaliacao,
  useSalvarConfigMedia,
} from '../hooks'
import type { Avaliacao, ConfigCalculoMedia } from '../types'

interface AbaAvaliacoesProps {
  materiaId: string
  avaliacoes: readonly Avaliacao[]
  config: ConfigCalculoMedia | null
}

export function AbaAvaliacoes({
  materiaId,
  avaliacoes,
  config,
}: AbaAvaliacoesProps) {
  const criar = useCriarAvaliacao()
  const atualizar = useAtualizarAvaliacao()
  const excluir = useExcluirAvaliacao()
  const salvarConfig = useSalvarConfigMedia()

  // Uma vez por render, não uma vez por linha: só serve para separar prova que já
  // aconteceu de prova futura
  const hojeISO = useMemo(() => paraISO(new Date()), [])

  const [nome, setNome] = useState('')
  const [peso, setPeso] = useState('1')
  const [data, setData] = useState('')

  const tipoMedia = config?.tipo ?? 'ponderada'
  const [notaManual, setNotaManual] = useState(
    config?.nota_manual === undefined || config?.nota_manual === null
      ? ''
      : String(config.nota_manual),
  )

  async function adicionar() {
    const pesoNumero = parseDecimal(peso)
    if (nome.trim() === '' || !Number.isFinite(pesoNumero) || pesoNumero <= 0) {
      return
    }
    await criar.mutateAsync({
      materia_id: materiaId,
      nome: nome.trim(),
      peso: pesoNumero,
      data: data === '' ? null : data,
    })
    setNome('')
    setPeso('1')
    setData('')
  }

  /** Salva a nota ao sair do campo — evita mutation a cada tecla. */
  function salvarNota(avaliacao: Avaliacao, bruto: string) {
    // Campo vazio é "sem nota", não zero: `parseDecimal` devolve NaN nos dois
    // casos, então o vazio é distinguido antes de decidir por `null`.
    const lido = parseDecimal(bruto)
    const nova = bruto.trim() === '' ? null : lido
    if (nova !== null && !Number.isFinite(nova)) return
    if (nova === avaliacao.nota) return
    atualizar.mutate({ id: avaliacao.id, dados: { nota: nova } })
  }

  return (
    <div className="space-y-5">
      {/* Modo de cálculo da média (plano 3.3) */}
      <Card>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Cálculo da média</Label>
              <Select
                value={tipoMedia}
                onValueChange={(valor) => {
                  if (valor === 'ponderada') {
                    salvarConfig.mutate({
                      materiaId,
                      config: {
                        tipo: 'ponderada',
                        nota_manual: null,
                        observacao: null,
                      },
                    })
                  } else {
                    // Média manual precisa de um valor inicial válido
                    salvarConfig.mutate({
                      materiaId,
                      config: {
                        tipo: 'manual',
                        nota_manual: parseDecimal(notaManual) || 0,
                        observacao: config?.observacao ?? null,
                      },
                    })
                  }
                }}
              >
                <SelectTrigger size="sm" className="w-[12rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ponderada">Média ponderada</SelectItem>
                  <SelectItem value="manual">Nota manual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {tipoMedia === 'manual' && (
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="nota-manual">
                  Nota
                </Label>
                <Input
                  id="nota-manual"
                  // `text`, não `number`: nota 7,5 vem com vírgula do teclado do
                  // celular, e vírgula num campo numérico chega como vazio
                  type="text"
                  inputMode="decimal"
                  className="h-8 w-24 tabular-nums"
                  value={notaManual}
                  onChange={(evento) => setNotaManual(evento.target.value)}
                  onBlur={() =>
                    salvarConfig.mutate({
                      materiaId,
                      config: {
                        tipo: 'manual',
                        nota_manual: parseDecimal(notaManual) || 0,
                        observacao: config?.observacao ?? null,
                      },
                    })
                  }
                />
              </div>
            )}
          </div>
          <p className="text-muted-foreground text-xs">
            {tipoMedia === 'ponderada'
              ? 'Σ(nota × peso) ÷ Σ(peso), contando apenas avaliações já corrigidas.'
              : 'A nota informada substitui o cálculo automático.'}
          </p>
        </CardContent>
      </Card>

      {/* Nova avaliação */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-2">
          <div className="min-w-[10rem] flex-1 space-y-1.5">
            <Label className="text-xs" htmlFor="nova-avaliacao">
              Avaliação
            </Label>
            <Input
              id="nova-avaliacao"
              className="h-8"
              placeholder="Ex: P1"
              value={nome}
              onChange={(evento) => setNome(evento.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="novo-peso">
              Peso
            </Label>
            <Input
              id="novo-peso"
              type="text"
              inputMode="decimal"
              className="h-8 w-20 tabular-nums"
              value={peso}
              onChange={(evento) => setPeso(evento.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="nova-data">
              Data
            </Label>
            <Input
              id="nova-data"
              type="date"
              className="h-8"
              value={data}
              onChange={(evento) => setData(evento.target.value)}
            />
          </div>
          <Button
            size="sm"
            onClick={() => void adicionar()}
            disabled={criar.isPending}
          >
            <Plus className="size-4" />
            Adicionar
          </Button>
        </CardContent>
      </Card>

      {avaliacoes.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="text-muted-foreground text-sm">
            Nenhuma avaliação cadastrada.
          </CardContent>
        </Card>
      ) : (
        /*
          Lista, não tabela — e **a mesma** marcação nas duas larguras.
          A tabela tinha cinco colunas que não cabiam em ~296px, então a data era
          escondida com `hidden sm:table-cell` e o nome truncava em `max-w-0`:
          no celular a tela mostrava menos justamente onde ela é mais usada. E
          esconder a data é pior do que parece, porque é ela que diz se a prova
          já aconteceu — o que muda o sentido de um campo de nota vazio.

          Uma lista só, e não uma tabela no desktop com uma lista no mobile: duas
          marcações do mesmo dado divergem na primeira mudança. Como a linha empilha
          nome-e-peso em cima e data-e-nota embaixo, ela funciona apertada sem
          precisar de outra versão.
        */
        <Card>
          <CardContent className="p-0">
            <ul className="divide-border divide-y">
              {avaliacoes.map((avaliacao) => {
                const feita =
                  avaliacao.data !== null && avaliacao.data <= hojeISO

                return (
                  <li
                    key={avaliacao.id}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                        <span className="break-words">{avaliacao.nome}</span>
                        <span className="text-muted-foreground text-xs tabular-nums">
                          peso {formatarDecimal(avaliacao.peso)}
                        </span>
                      </p>
                      <p className="text-muted-foreground text-xs tabular-nums">
                        {avaliacao.data
                          ? format(deISO(avaliacao.data), 'dd/MM/yyyy')
                          : 'sem data'}
                        {/*
                          Nota vazia numa prova que já passou é pendência; numa
                          prova futura é o estado normal. Sem esta distinção, os
                          dois casos apareciam idênticos.
                        */}
                        {feita && avaliacao.nota === null && (
                          <span className="text-status-atencao ml-2">
                            sem nota
                          </span>
                        )}
                      </p>
                    </div>

                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="—"
                      defaultValue={formatarDecimal(avaliacao.nota)}
                      onBlur={(evento) =>
                        salvarNota(avaliacao, evento.target.value)
                      }
                      className="h-11 w-16 shrink-0 text-center tabular-nums sm:h-8"
                      aria-label={`Nota de ${avaliacao.nome}`}
                    />

                    <DialogConfirmarExclusao
                      titulo={`Excluir ${avaliacao.nome}`}
                      mensagem={
                        avaliacao.nota === null
                          ? `${avaliacao.nome} sai da matéria e do cálculo da média projetada.`
                          : `A nota ${formatarDecimal(avaliacao.nota)} de ${avaliacao.nome} será perdida e a média recalculada sem ela.`
                      }
                      onConfirmar={() => excluir.mutate(avaliacao.id)}
                      pendente={excluir.isPending}
                    />
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <p className="text-muted-foreground text-xs">
        A média projetada assume nota {NOTA_MINIMA_APROVACAO.toFixed(1)} nas
        avaliações ainda sem nota.
      </p>
    </div>
  )
}
