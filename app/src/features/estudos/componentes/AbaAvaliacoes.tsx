import { useState } from 'react'
import { format } from 'date-fns'
import { Plus, Trash2 } from 'lucide-react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { deISO } from '@/lib/datas'
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
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Avaliação</TableHead>
                  <TableHead className="w-12 text-right sm:w-20">
                    Peso
                  </TableHead>
                  <TableHead className="w-24">Nota</TableHead>
                  {/*
                    A data sai no mobile: sem ela as cinco colunas não cabem em
                    ~296px, e a prova já aparece datada no calendário e no painel
                    de eventos importantes. Nota é o que se edita aqui.
                  */}
                  <TableHead className="hidden w-28 sm:table-cell">
                    Data
                  </TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {avaliacoes.map((avaliacao) => (
                  <TableRow key={avaliacao.id}>
                    <TableCell className="max-w-0 truncate text-sm">
                      {avaliacao.nome}
                    </TableCell>
                    <TableCell className="metric-sm text-right">
                      {avaliacao.peso}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="—"
                        defaultValue={formatarDecimal(avaliacao.nota)}
                        onBlur={(evento) =>
                          salvarNota(avaliacao, evento.target.value)
                        }
                        className="h-8 w-20 tabular-nums"
                        aria-label={`Nota de ${avaliacao.nome}`}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-xs tabular-nums sm:table-cell">
                      {avaliacao.data
                        ? format(deISO(avaliacao.data), 'dd/MM/yyyy')
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-status-risco size-9 sm:size-7"
                        aria-label={`Excluir ${avaliacao.nome}`}
                        onClick={() => excluir.mutate(avaliacao.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
