import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Settings2 } from 'lucide-react'
import { CampoDecimal } from '@/components/CampoDecimal'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRegraInvestimento, useSalvarRegraInvestimento } from '../hooks'
import {
  schemaRegraInvestimento,
  type FormularioRegraInvestimento,
} from '../schemas'

const VAZIO: FormularioRegraInvestimento = {
  ativa: true,
  gatilho_tipo: 'sobra_meta',
  percentual: 50,
  dia_sugestao: 1,
}

/**
 * Configuração da regra de sugestão de investimento (resolução 10.45).
 *
 * O sistema não tem — nem deve ter — integração bancária: a regra só sugere
 * um valor, quem decide e registra o aporte continua sendo o usuário.
 */
export function DialogRegraInvestimento() {
  const [aberto, setAberto] = useState(false)
  const regra = useRegraInvestimento()
  const salvar = useSalvarRegraInvestimento()

  const form = useForm<FormularioRegraInvestimento>({
    resolver: zodResolver(schemaRegraInvestimento),
    defaultValues: VAZIO,
  })

  useEffect(() => {
    if (aberto) {
      form.reset(
        regra.data
          ? {
              ativa: regra.data.ativa,
              gatilho_tipo: regra.data.gatilho_tipo,
              percentual: regra.data.percentual,
              dia_sugestao: regra.data.dia_sugestao,
            }
          : VAZIO,
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, regra.data])

  const gatilho = form.watch('gatilho_tipo')

  async function submeter(valores: FormularioRegraInvestimento) {
    await salvar.mutateAsync({ id: regra.data?.id ?? null, dados: valores })
    setAberto(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" aria-label="Configurar sugestão de investimento">
          <Settings2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sugestão de investimento</DialogTitle>
          <DialogDescription>
            Só sugere um valor — quem registra o aporte é você.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(submeter)}
            className="space-y-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="ativa"
              render={({ field }) => (
                <FormItem className="flex flex-row-reverse items-center justify-end gap-2">
                  <FormLabel className="font-normal">Ativa</FormLabel>
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checado) => field.onChange(checado === true)}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gatilho_tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gatilho</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="sobra_meta">
                        % da sobra da meta mensal
                      </SelectItem>
                      <SelectItem value="percentual_receita">
                        % da receita do mês
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-[11px]">
                    {gatilho === 'sobra_meta'
                      ? 'Só sugere quando a meta mensal fecha com sobra.'
                      : 'Sugere todo mês, independente de ter sobrado — disciplina de investir antes de gastar.'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="percentual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Percentual</FormLabel>
                    <FormControl>
                      <CampoDecimal
                        placeholder="50"
                        valor={field.value}
                        onValorChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dia_sugestao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dia da sugestão</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        value={Number.isNaN(field.value) ? '' : field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={salvar.isPending}>
                {salvar.isPending ? 'Salvando…' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
