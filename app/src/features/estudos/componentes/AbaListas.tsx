import { useState } from 'react'
import { format } from 'date-fns'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { deISO, paraISO } from '@/lib/datas'
import { cn } from '@/lib/utils'
import {
  useCriarRegistroLista,
  useAtualizarRegistroLista,
  useExcluirRegistroLista,
} from '../hooks'
import { percentualAcerto } from '../calculos'
import { parsearQuestoesErradas } from '../schemas'
import type { RegistroLista } from '../types'

interface AbaListasProps {
  materiaId: string
  registros: readonly RegistroLista[]
  hoje: Date
}

/**
 * Registro pós-lista de exercícios (plano 3.3): total de questões, quais errou
 * e o tópico. A entrada de erradas é uma lista separada por vírgula, convertida
 * para `int[]` (resolução 10.7).
 */
export function AbaListas({ materiaId, registros, hoje }: AbaListasProps) {
  const criar = useCriarRegistroLista()
  const atualizar = useAtualizarRegistroLista()
  const excluir = useExcluirRegistroLista()

  const [nome, setNome] = useState('')
  const [data, setData] = useState(paraISO(hoje))
  const [total, setTotal] = useState('')
  const [erradas, setErradas] = useState('')
  const [topico, setTopico] = useState('')
  const [idEditando, setIdEditando] = useState<string | null>(null)

  const listaErradas = parsearQuestoesErradas(erradas)
  const totalNumero = Number(total)
  const acimaDoTotal =
    Number.isFinite(totalNumero) &&
    totalNumero > 0 &&
    listaErradas.some((numero) => numero > totalNumero)

  function iniciarEdicao(registro: RegistroLista) {
    setIdEditando(registro.id)
    setNome(registro.nome_lista)
    setData(registro.data)
    setTotal(String(registro.total_questoes))
    setErradas(registro.questoes_erradas.join(', '))
    setTopico(registro.topico ?? '')
  }

  function cancelarEdicao() {
    setIdEditando(null)
    setNome('')
    setData(paraISO(hoje))
    setTotal('')
    setErradas('')
    setTopico('')
  }

  async function salvar() {
    if (
      nome.trim() === '' ||
      !Number.isInteger(totalNumero) ||
      totalNumero <= 0
    ) {
      return
    }
    if (acimaDoTotal) return

    const dados = {
      nome_lista: nome.trim(),
      data,
      total_questoes: totalNumero,
      questoes_erradas: listaErradas,
      topico: topico.trim() === '' ? null : topico.trim(),
    }

    if (idEditando) {
      await atualizar.mutateAsync({ id: idEditando, dados })
      cancelarEdicao()
    } else {
      await criar.mutateAsync({
        materia_id: materiaId,
        ...dados,
      })
      setNome('')
      setTotal('')
      setErradas('')
      setTopico('')
    }
  }

  const pendente = criar.isPending || atualizar.isPending

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[10rem] flex-1 space-y-1.5">
              <Label className="text-xs" htmlFor="lista-nome">
                Lista
              </Label>
              <Input
                id="lista-nome"
                className="h-8"
                placeholder="Ex: Lista 3"
                value={nome}
                onChange={(evento) => setNome(evento.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="lista-data">
                Data
              </Label>
              <Input
                id="lista-data"
                type="date"
                className="h-8"
                value={data}
                onChange={(evento) => setData(evento.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="lista-total">
                Questões
              </Label>
              <Input
                id="lista-total"
                type="number"
                min="1"
                step="1"
                className="h-8 w-24 tabular-nums"
                placeholder="10"
                value={total}
                onChange={(evento) => setTotal(evento.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[10rem] flex-1 space-y-1.5">
              <Label className="text-xs" htmlFor="lista-erradas">
                Questões erradas
              </Label>
              <Input
                id="lista-erradas"
                className={cn('h-8', acimaDoTotal && 'border-destructive')}
                placeholder="Ex: 4, 7"
                value={erradas}
                onChange={(evento) => setErradas(evento.target.value)}
              />
            </div>
            <div className="min-w-[10rem] flex-1 space-y-1.5">
              <Label className="text-xs" htmlFor="lista-topico">
                Tópico
              </Label>
              <Input
                id="lista-topico"
                className="h-8"
                placeholder="Opcional"
                value={topico}
                onChange={(evento) => setTopico(evento.target.value)}
              />
            </div>
            <Button
              size="sm"
              onClick={() => void salvar()}
              disabled={pendente || acimaDoTotal}
            >
              {idEditando ? (
                <Pencil className="size-4" />
              ) : (
                <Plus className="size-4" />
              )}
              {idEditando ? 'Salvar' : 'Registrar'}
            </Button>
            {idEditando && (
              <Button size="sm" variant="ghost" onClick={cancelarEdicao}>
                Cancelar
              </Button>
            )}
          </div>

          {acimaDoTotal && (
            <p className="text-destructive text-xs">
              Há questão errada com número acima do total.
            </p>
          )}
        </CardContent>
      </Card>

      {registros.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="text-muted-foreground text-sm">
            Nenhuma lista registrada.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-border divide-y">
              {registros.map((registro) => {
                const acerto = percentualAcerto(
                  registro.total_questoes,
                  registro.questoes_erradas,
                )
                return (
                  <li
                    key={registro.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm">
                        {registro.nome_lista}
                        {registro.topico && (
                          <span className="text-muted-foreground ml-1.5 text-xs">
                            {registro.topico}
                          </span>
                        )}
                      </p>
                      <p className="text-muted-foreground text-xs tabular-nums">
                        {format(deISO(registro.data), 'dd/MM/yyyy')} ·{' '}
                        {registro.total_questoes -
                          registro.questoes_erradas.length}
                        /{registro.total_questoes} acertos
                        {registro.questoes_erradas.length > 0 &&
                          ` · errou ${registro.questoes_erradas.join(', ')}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {acerto !== null && (
                        <span
                          className={cn(
                            'text-sm tabular-nums mr-1',
                            acerto >= 70
                              ? 'text-status-ok'
                              : acerto >= 50
                                ? 'text-status-atencao'
                                : 'text-status-risco',
                          )}
                        >
                          {Math.round(acerto)}%
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground size-7"
                        aria-label="Editar registro"
                        onClick={() => iniciarEdicao(registro)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-status-risco size-7"
                        aria-label="Remover registro"
                        onClick={() => excluir.mutate(registro.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
