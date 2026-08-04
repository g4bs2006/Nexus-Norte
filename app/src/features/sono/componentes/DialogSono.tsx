import { useState } from 'react'
import { subDays } from 'date-fns'
import { Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DIAS_SEMANA } from '@/lib/constants'
import { paraISO } from '@/lib/datas'
import { formatarHoras, horasEntre } from '../calculos'
import {
  usePlanejamentoCompleto,
  useSalvarPlanejamentoSono,
  useSalvarRegistroSono,
} from '../hooks'

const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0] as const

interface DialogSonoProps {
  hoje: Date
}

/**
 * Registro de sono e definição da meta semanal.
 *
 * O schema de sono existe desde a Fase 0 (plano 1.3) e é consumido pela Home
 * (7.1) e pelo Calendário (6.1), mas nenhuma page do plano previa a entrada
 * desses dados — esta é a tela que fechava esse ciclo.
 */
export function DialogSono({ hoje }: DialogSonoProps) {
  const [aberto, setAberto] = useState(false)
  const salvarRegistro = useSalvarRegistroSono()
  const salvarPlano = useSalvarPlanejamentoSono()
  const planejamento = usePlanejamentoCompleto()

  // Padrão: ontem — o registro normalmente é feito na manhã seguinte
  const [data, setData] = useState(paraISO(subDays(hoje, 1)))
  const [dormir, setDormir] = useState('23:30')
  const [acordar, setAcordar] = useState('07:00')

  const [diaAlvo, setDiaAlvo] = useState('1')
  const [dormirAlvo, setDormirAlvo] = useState('23:30')
  const [acordarAlvo, setAcordarAlvo] = useState('07:00')

  const horasRegistro = horasEntre(dormir, acordar)
  const horasAlvo = horasEntre(dormirAlvo, acordarAlvo)

  async function submeterRegistro() {
    await salvarRegistro.mutateAsync({
      data,
      hora_dormir_real: dormir,
      hora_acordar_real: acordar,
    })
    setAberto(false)
  }

  async function submeterPlano() {
    await salvarPlano.mutateAsync({
      dia_semana: Number(diaAlvo),
      hora_dormir_alvo: dormirAlvo,
      hora_acordar_alvo: acordarAlvo,
    })
  }

  const planoDoDia = (planejamento.data ?? []).find(
    (item) => item.dia_semana === Number(diaAlvo),
  )

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-xs">
          <Moon className="size-3.5" />
          Registrar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sono</DialogTitle>
          <DialogDescription>
            As horas são calculadas automaticamente, tratando a virada da
            meia-noite.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="registro">
          <TabsList>
            <TabsTrigger value="registro">Registro</TabsTrigger>
            <TabsTrigger value="meta">Meta semanal</TabsTrigger>
          </TabsList>

          <TabsContent value="registro" className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="sono-data">Data</Label>
              <Input
                id="sono-data"
                type="date"
                value={data}
                onChange={(evento) => setData(evento.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sono-dormir">Dormi às</Label>
                <Input
                  id="sono-dormir"
                  type="time"
                  value={dormir}
                  onChange={(evento) => setDormir(evento.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sono-acordar">Acordei às</Label>
                <Input
                  id="sono-acordar"
                  type="time"
                  value={acordar}
                  onChange={(evento) => setAcordar(evento.target.value)}
                />
              </div>
            </div>

            <p className="text-muted-foreground text-sm">
              Total:{' '}
              <span className="text-foreground tabular-nums">
                {formatarHoras(horasRegistro)}
              </span>
            </p>

            <DialogFooter>
              <Button
                onClick={() => void submeterRegistro()}
                disabled={salvarRegistro.isPending}
              >
                {salvarRegistro.isPending ? 'Salvando…' : 'Salvar registro'}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="meta" className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Dia da semana</Label>
              <Select
                value={diaAlvo}
                onValueChange={(valor) => {
                  setDiaAlvo(valor)
                  // Carrega o alvo já salvo para o dia escolhido, se houver
                  const existente = (planejamento.data ?? []).find(
                    (item) => item.dia_semana === Number(valor),
                  )
                  if (existente) {
                    setDormirAlvo(existente.hora_dormir_alvo.slice(0, 5))
                    setAcordarAlvo(existente.hora_acordar_alvo.slice(0, 5))
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDEM_DIAS.map((dia) => (
                    <SelectItem key={dia} value={String(dia)}>
                      {DIAS_SEMANA[dia]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="alvo-dormir">Dormir às</Label>
                <Input
                  id="alvo-dormir"
                  type="time"
                  value={dormirAlvo}
                  onChange={(evento) => setDormirAlvo(evento.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="alvo-acordar">Acordar às</Label>
                <Input
                  id="alvo-acordar"
                  type="time"
                  value={acordarAlvo}
                  onChange={(evento) => setAcordarAlvo(evento.target.value)}
                />
              </div>
            </div>

            <p className="text-muted-foreground text-sm">
              Meta:{' '}
              <span className="text-foreground tabular-nums">
                {formatarHoras(horasAlvo)}
              </span>
              {planoDoDia && ' · já definida para este dia'}
            </p>

            <DialogFooter>
              <Button
                onClick={() => void submeterPlano()}
                disabled={salvarPlano.isPending}
              >
                {salvarPlano.isPending ? 'Salvando…' : 'Salvar meta'}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
