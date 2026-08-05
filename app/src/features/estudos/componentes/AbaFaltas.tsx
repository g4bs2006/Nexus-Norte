import { useState } from 'react'
import { format } from 'date-fns'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BarraProgresso } from '@/components/BarraProgresso'
import { deISO, paraISO } from '@/lib/datas'
import { cn } from '@/lib/utils'
import { useCriarFalta, useAtualizarFalta, useExcluirFalta } from '../hooks'
import { faltasRestantes } from '../calculos'
import type { Falta } from '../types'

interface AbaFaltasProps {
  materiaId: string
  faltas: readonly Falta[]
  limiteFaltas: number
  hoje: Date
}

export function AbaFaltas({
  materiaId,
  faltas,
  limiteFaltas,
  hoje,
}: AbaFaltasProps) {
  const criar = useCriarFalta()
  const atualizar = useAtualizarFalta()
  const excluir = useExcluirFalta()

  const [data, setData] = useState(paraISO(hoje))
  const [motivo, setMotivo] = useState('')
  const [idEditando, setIdEditando] = useState<string | null>(null)

  const restantes = faltasRestantes(limiteFaltas, faltas.length)
  const percentualUsado =
    limiteFaltas > 0 ? (faltas.length / limiteFaltas) * 100 : 0
  const critico = limiteFaltas > 0 && restantes <= 2

  function iniciarEdicao(falta: Falta) {
    setIdEditando(falta.id)
    setData(falta.data)
    setMotivo(falta.motivo ?? '')
  }

  function cancelarEdicao() {
    setIdEditando(null)
    setData(paraISO(hoje))
    setMotivo('')
  }

  async function salvar() {
    if (data === '') return
    const dados = {
      data,
      motivo: motivo.trim() === '' ? null : motivo.trim(),
    }

    if (idEditando) {
      await atualizar.mutateAsync({ id: idEditando, dados })
      cancelarEdicao()
    } else {
      await criar.mutateAsync({
        materia_id: materiaId,
        ...dados,
      })
      setMotivo('')
    }
  }

  const pendente = criar.isPending || atualizar.isPending

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-muted-foreground text-xs">Faltas restantes</p>
              <p className={cn('metric-lg', critico && 'text-status-risco')}>
                {limiteFaltas === 0 ? '—' : restantes}
              </p>
            </div>
            <p className="text-muted-foreground text-xs tabular-nums">
              {faltas.length} usada{faltas.length === 1 ? '' : 's'}
              {limiteFaltas > 0 && ` de ${limiteFaltas}`}
            </p>
          </div>
          {limiteFaltas > 0 && (
            <BarraProgresso
              valor={percentualUsado}
              classeCor={critico ? 'bg-status-risco' : 'bg-estudos'}
              rotulo="Faltas usadas"
            />
          )}
          {limiteFaltas === 0 && (
            <p className="text-muted-foreground text-xs">
              Esta matéria não tem limite de faltas configurado.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="falta-data">
              Data
            </Label>
            <Input
              id="falta-data"
              type="date"
              className="h-8"
              value={data}
              onChange={(evento) => setData(evento.target.value)}
            />
          </div>
          <div className="min-w-[12rem] flex-1 space-y-1.5">
            <Label className="text-xs" htmlFor="falta-motivo">
              Motivo
            </Label>
            <Input
              id="falta-motivo"
              className="h-8"
              placeholder="Opcional"
              value={motivo}
              onChange={(evento) => setMotivo(evento.target.value)}
            />
          </div>
          <Button size="sm" onClick={() => void salvar()} disabled={pendente}>
            {idEditando ? (
              <Pencil className="size-4" />
            ) : (
              <Plus className="size-4" />
            )}
            {idEditando ? 'Salvar' : 'Registrar falta'}
          </Button>
          {idEditando && (
            <Button size="sm" variant="ghost" onClick={cancelarEdicao}>
              Cancelar
            </Button>
          )}
        </CardContent>
      </Card>

      {faltas.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="text-muted-foreground text-sm">
            Nenhuma falta registrada.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-border divide-y">
              {faltas.map((falta) => (
                <li
                  key={falta.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm tabular-nums">
                      {format(deISO(falta.data), 'dd/MM/yyyy')}
                    </p>
                    {falta.motivo && (
                      <p className="text-muted-foreground truncate text-xs">
                        {falta.motivo}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground size-7"
                      aria-label="Editar falta"
                      onClick={() => iniciarEdicao(falta)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-status-risco size-7 shrink-0"
                      aria-label="Remover falta"
                      onClick={() => excluir.mutate(falta.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
