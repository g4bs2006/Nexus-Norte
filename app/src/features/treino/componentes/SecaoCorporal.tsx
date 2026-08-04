import { useMemo, useRef, useState } from 'react'
import { format } from 'date-fns'
import { ImageUp } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'
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
import { ESTILO_TOOLTIP } from '@/components/grafico'
import { deISO, paraISO } from '@/lib/datas'
import { enviarFotoProgresso } from '../api'
import { useSalvarRegistroCorporal } from '../hooks'
import type { RegistroCorporal } from '../types'

interface SecaoCorporalProps {
  registros: readonly RegistroCorporal[]
  hoje: Date
}

/**
 * Peso corporal — discreto, não protagonista (plano 4.3).
 *
 * O upload de foto é opcional e reaproveita a mesma mecânica de storage dos
 * documentos de Estudos: bucket privado, caminho salvo no registro.
 */
export function SecaoCorporal({ registros, hoje }: SecaoCorporalProps) {
  const salvar = useSalvarRegistroCorporal()
  const inputFoto = useRef<HTMLInputElement>(null)

  const [data, setData] = useState(paraISO(hoje))
  const [peso, setPeso] = useState('')
  const [enviando, setEnviando] = useState(false)

  const dados = useMemo(
    () =>
      [...registros]
        .filter((registro) => registro.peso !== null)
        .sort((a, b) => a.data.localeCompare(b.data))
        .map((registro) => ({
          dia: format(deISO(registro.data), 'dd/MM'),
          peso: registro.peso as number,
        })),
    [registros],
  )

  async function registrar(arquivo?: File) {
    const pesoNumero = Number(peso)
    const temPeso = peso.trim() !== '' && Number.isFinite(pesoNumero) && pesoNumero > 0
    if (!temPeso && !arquivo) return

    setEnviando(true)
    try {
      const caminho = arquivo ? await enviarFotoProgresso(data, arquivo) : null
      await salvar.mutateAsync({
        data,
        peso: temPeso ? pesoNumero : null,
        foto_storage_path: caminho,
      })
      setPeso('')
      if (inputFoto.current) inputFoto.current.value = ''
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : 'Falha ao registrar')
    } finally {
      setEnviando(false)
    }
  }

  const ultimo = dados[dados.length - 1]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Corpo</CardTitle>
        <CardDescription>
          Peso e foto de progresso — um registro por dia.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="corporal-data">
              Data
            </Label>
            <Input
              id="corporal-data"
              type="date"
              className="h-8"
              value={data}
              onChange={(evento) => setData(evento.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="corporal-peso">
              Peso (kg)
            </Label>
            <Input
              id="corporal-peso"
              type="number"
              step="0.1"
              min="1"
              placeholder={ultimo ? String(ultimo.peso) : '—'}
              className="h-8 w-24 tabular-nums"
              value={peso}
              onChange={(evento) => setPeso(evento.target.value)}
            />
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void registrar()}
            disabled={enviando}
          >
            Registrar
          </Button>

          <input
            ref={inputFoto}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(evento) => void registrar(evento.target.files?.[0])}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => inputFoto.current?.click()}
            disabled={enviando}
          >
            <ImageUp className="size-4" />
            Foto
          </Button>
        </div>

        {dados.length > 1 && (
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={dados}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--border)"
              />
              <XAxis
                dataKey="dia"
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                stroke="var(--border)"
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                stroke="var(--border)"
                width={40}
                domain={['dataMin - 2', 'dataMax + 2']}
              />
              <Tooltip
                formatter={(valor) => `${valor} kg`}
                contentStyle={ESTILO_TOOLTIP}
              />
              <Line
                type="monotone"
                dataKey="peso"
                stroke="var(--chart-3)"
                strokeWidth={2}
                dot={{ r: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
