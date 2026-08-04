import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { deISO } from '@/lib/datas'
import { cn } from '@/lib/utils'
import { COR_CAMADA, ROTULO_TIPO, type EventoComPrazo } from '../eventos'

/**
 * Como o prazo é apresentado. Atrasado e hoje ganham cor; o resto fica neutro,
 * senão a cor deixa de significar urgência.
 */
function prazo(dias: number): { texto: string; classe: string } {
  if (dias < 0) {
    const atraso = Math.abs(dias)
    return {
      texto: `${atraso} ${atraso === 1 ? 'dia atrás' : 'dias atrás'}`,
      classe: 'text-status-risco',
    }
  }
  if (dias === 0) return { texto: 'hoje', classe: 'text-status-risco' }
  if (dias === 1) return { texto: 'amanhã', classe: 'text-status-atencao' }
  if (dias <= 7)
    return { texto: `em ${dias} dias`, classe: 'text-status-atencao' }
  return { texto: `em ${dias} dias`, classe: 'text-muted-foreground' }
}

interface PainelImportantesProps {
  eventos: readonly EventoComPrazo[]
  /** Quantos dias o intervalo cobre — entra na descrição. */
  janelaDias: number
}

/**
 * Provas, contas e marcos do período visível, ao lado do calendário.
 *
 * A grade do calendário é boa para ver a forma do mês, mas ruim para responder
 * "o que vence primeiro?" — a resposta exige varrer os quadrados com o olho.
 * Esta lista responde direto, e só com compromissos datados: aula e treino se
 * repetem toda semana e afogariam as provas.
 */
export function PainelImportantes({
  eventos,
  janelaDias,
}: PainelImportantesProps) {
  return (
    <Card className="lg:sticky lg:top-6">
      <CardHeader>
        <CardTitle className="text-base">Prazos</CardTitle>
        <CardDescription>
          Provas, contas e marcos dos próximos {janelaDias} dias.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {eventos.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nada com prazo neste período.
          </p>
        ) : (
          <ul className="divide-border divide-y">
            {eventos.map((evento) => {
              const p = prazo(evento.dias)
              const conteudo = (
                <>
                  <span
                    aria-hidden
                    className="mt-1.5 size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: COR_CAMADA[evento.camada] }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">
                      {evento.titulo}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {ROTULO_TIPO[evento.tipo]} ·{' '}
                      <span className="tabular-nums">
                        {format(deISO(evento.inicio.slice(0, 10)), 'dd/MM')}
                      </span>
                    </span>
                  </span>
                  <span className={cn('shrink-0 text-xs', p.classe)}>
                    {p.texto}
                  </span>
                </>
              )

              return (
                <li key={evento.id}>
                  {evento.rota ? (
                    <Link
                      to={evento.rota}
                      className="hover:bg-accent/50 -mx-2 flex items-start gap-2.5 rounded-md px-2 py-2.5 transition-colors"
                    >
                      {conteudo}
                    </Link>
                  ) : (
                    <div className="flex items-start gap-2.5 py-2.5">
                      {conteudo}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
