import { useState } from 'react'
import { format } from 'date-fns'
import { Pencil, Plus, Trash2 } from 'lucide-react'
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
import { deISO, paraISO } from '@/lib/datas'
import { cn } from '@/lib/utils'
import { useCriarLesao, useAtualizarLesao, useExcluirLesao } from '../hooks'
import type { RegistroLesao } from '../types'

interface SecaoLesoesProps {
  lesoes: readonly RegistroLesao[]
  hoje: Date
}

/** Registro de lesões: formulário simples e lista histórica (plano 4.3). */
export function SecaoLesoes({ lesoes, hoje }: SecaoLesoesProps) {
  const criar = useCriarLesao()
  const atualizar = useAtualizarLesao()
  const excluir = useExcluirLesao()

  const [data, setData] = useState(paraISO(hoje))
  const [regiao, setRegiao] = useState('')
  const [intensidade, setIntensidade] = useState('5')
  const [idEditando, setIdEditando] = useState<string | null>(null)

  function iniciarEdicao(lesao: RegistroLesao) {
    setIdEditando(lesao.id)
    setData(lesao.data)
    setRegiao(lesao.regiao)
    setIntensidade(String(lesao.intensidade))
  }

  function cancelarEdicao() {
    setIdEditando(null)
    setData(paraISO(hoje))
    setRegiao('')
    setIntensidade('5')
  }

  async function salvar() {
    const nivel = Number(intensidade)
    if (regiao.trim() === '') return
    if (!Number.isInteger(nivel) || nivel < 1 || nivel > 10) return

    const dados = {
      data,
      regiao: regiao.trim(),
      intensidade: nivel,
    }

    if (idEditando) {
      await atualizar.mutateAsync({ id: idEditando, dados })
      cancelarEdicao()
    } else {
      await criar.mutateAsync(dados)
      setRegiao('')
      setIntensidade('5')
    }
  }

  const pendente = criar.isPending || atualizar.isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Lesões e dores</CardTitle>
        <CardDescription>Intensidade de 1 a 10.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="lesao-data">
              Data
            </Label>
            <Input
              id="lesao-data"
              type="date"
              className="h-8"
              value={data}
              onChange={(evento) => setData(evento.target.value)}
            />
          </div>
          <div className="min-w-[10rem] flex-1 space-y-1.5">
            <Label className="text-xs" htmlFor="lesao-regiao">
              Região
            </Label>
            <Input
              id="lesao-regiao"
              className="h-8"
              placeholder="Ex: ombro direito"
              value={regiao}
              onChange={(evento) => setRegiao(evento.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="lesao-intensidade">
              Intensidade
            </Label>
            <Input
              id="lesao-intensidade"
              type="number"
              min="1"
              max="10"
              step="1"
              className="h-8 w-20 tabular-nums"
              value={intensidade}
              onChange={(evento) => setIntensidade(evento.target.value)}
            />
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void salvar()}
            disabled={pendente}
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

        {lesoes.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhum registro — o que é uma boa notícia.
          </p>
        ) : (
          <ul className="divide-border divide-y">
            {lesoes.map((lesao) => (
              <li
                key={lesao.id}
                className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm capitalize">{lesao.regiao}</p>
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {format(deISO(lesao.data), 'dd/MM/yyyy')}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span
                    className={cn(
                      'text-sm tabular-nums mr-1',
                      lesao.intensidade >= 7
                        ? 'text-status-risco'
                        : lesao.intensidade >= 4
                          ? 'text-status-atencao'
                          : 'text-muted-foreground',
                    )}
                  >
                    {lesao.intensidade}/10
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground size-7"
                    aria-label="Editar registro"
                    onClick={() => iniciarEdicao(lesao)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-status-risco size-7"
                    aria-label="Remover registro"
                    onClick={() => excluir.mutate(lesao.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
