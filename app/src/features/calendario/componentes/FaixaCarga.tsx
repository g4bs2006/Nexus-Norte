import { format } from 'date-fns'
import { deISO } from '@/lib/datas'
import { cn } from '@/lib/utils'
import { escalaCarga, formatarCarga, type DiaCarga } from '../carga'
import { COR_CAMADA, ROTULO_TIPO } from '../eventos'

/** Altura da área da barra, em px. Fora do Tailwind porque entra em cálculo. */
const ALTURA_BARRA = 40

interface FaixaCargaProps {
  dias: readonly DiaCarga[]
  /** Dia focado na agenda, destacado na faixa. */
  selecionado?: string
  onSelecionar: (data: string) => void
}

/**
 * Carga da semana — a primeira coisa que se lê na página.
 *
 * Dois eixos separados de propósito, porque são perguntas diferentes: a **altura**
 * diz quanto do dia já está tomado pela rotina, e a **marca acima** diz o que
 * vence nele. A grade de mês misturava as duas num único bloco colorido, e era
 * por isso que uma prova tinha o mesmo peso visual que a terceira aula da semana.
 *
 * A barra é segmentada por pilar: "quinta é toda estudo" e "quinta é metade
 * treino" pesam igual em minutos e significam coisas diferentes.
 *
 * Escala relativa ao período visível — interessa qual dia pesa mais NESTA semana,
 * não comparar semanas entre si.
 */
export function FaixaCarga({
  dias,
  selecionado,
  onSelecionar,
}: FaixaCargaProps) {
  const escala = escalaCarga(dias)

  return (
    <ul className="flex items-end gap-1 sm:gap-1.5">
      {dias.map((dia) => {
        const data = deISO(dia.data)
        const ativo = dia.data === selecionado

        return (
          <li key={dia.data} className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => onSelecionar(dia.data)}
              aria-current={ativo ? 'date' : undefined}
              aria-label={resumoAcessivel(dia)}
              className={cn(
                'group flex w-full flex-col items-center gap-1 rounded-md px-0.5 py-1.5 transition-colors',
                'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                ativo ? 'bg-accent' : 'hover:bg-accent/50',
              )}
            >
              {/*
                Faixa dos prazos. Reservada mesmo vazia: sem a altura fixa, as
                barras de dias com e sem prazo não partiriam da mesma linha.
              */}
              <span className="flex h-3 items-center gap-0.5">
                {dia.prazos.slice(0, 3).map((prazo) => (
                  <span
                    key={prazo.id}
                    aria-hidden
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: COR_CAMADA[prazo.camada] }}
                  />
                ))}
                {dia.prazos.length > 3 && (
                  <span
                    aria-hidden
                    className="text-muted-foreground text-[9px] leading-none"
                  >
                    +{dia.prazos.length - 3}
                  </span>
                )}
              </span>

              {/* Barra segmentada, crescendo da base */}
              <span
                aria-hidden
                className="flex w-full flex-col justify-end overflow-hidden rounded-sm"
                style={{ height: ALTURA_BARRA }}
              >
                {dia.segmentos.map((segmento) => (
                  <span
                    key={segmento.camada}
                    className="w-full"
                    style={{
                      height: `${(segmento.minutos / escala) * ALTURA_BARRA}px`,
                      backgroundColor: COR_CAMADA[segmento.camada],
                      opacity: dia.ehPassado ? 0.45 : 1,
                    }}
                  />
                ))}
              </span>

              {/* A base ancora as barras e marca o hoje sem depender de cor */}
              <span
                aria-hidden
                className={cn(
                  'h-px w-full',
                  dia.ehHoje ? 'bg-foreground' : 'bg-border',
                )}
              />

              {/*
                Sinais de qualidade do dia. Formas diferentes, não cores: no tema
                claro `--sono` e `--status-atencao` são o MESMO hex, então cor
                aqui não distinguiria nada.
              */}
              <span className="flex h-2 items-center gap-1">
                {dia.sonoAbaixo && (
                  <span
                    aria-hidden
                    title="Dormiu abaixo da meta"
                    className="bg-sono h-0.5 w-2.5 rounded-full"
                  />
                )}
                {dia.checkPendente && (
                  <span
                    aria-hidden
                    title="Rotina sem check"
                    className="border-muted-foreground size-1.5 rounded-full border"
                  />
                )}
              </span>

              <span
                className={cn(
                  'text-[10px] tracking-wide uppercase',
                  dia.ehHoje
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground',
                )}
              >
                {format(data, 'EEEEEE')}
              </span>
              <span
                className={cn(
                  'font-mono text-xs tabular-nums',
                  dia.ehHoje ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {format(data, 'dd')}
              </span>

              {/*
                Tempo livre (resolução 10.48.1) — "quinta tem 3h20" é a
                resposta que se procura ao olhar a semana. Omitido em zero:
                dia sem folga já está dito pela barra cheia.

                Escondido no menor breakpoint: a coluna do dia já empilha sete
                elementos num `flex-1` de ~50px em tela de 375px, e a Agenda
                logo abaixo mostra o mesmo número com mais espaço para
                respirar. Volta a partir de `sm:`, onde a coluna tem folga de
                verdade.
              */}
              {dia.minutosLivres > 0 && (
                <span className="text-muted-foreground/70 hidden font-mono text-[9px] tabular-nums sm:inline">
                  {formatarCarga(dia.minutosLivres)}
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * O que o leitor de tela ouve no lugar das barras e marcas.
 *
 * Nenhuma das informações da faixa é transmitida só por forma: tudo o que a
 * barra, os pontos e os traços dizem está escrito aqui.
 */
function resumoAcessivel(dia: DiaCarga): string {
  const partes: string[] = [
    format(deISO(dia.data), "EEEE, d 'de' MMMM"),
    dia.ehHoje ? 'hoje' : '',
    dia.minutosRotina > 0
      ? `${formatarCarga(dia.minutosRotina)} de rotina`
      : 'sem rotina',
    `${formatarCarga(dia.minutosLivres)} livres`,
  ]

  for (const prazo of dia.prazos) {
    partes.push(`${ROTULO_TIPO[prazo.tipo]}: ${prazo.titulo}`)
  }
  if (dia.sonoAbaixo) partes.push('dormiu abaixo da meta')
  if (dia.checkPendente) partes.push('rotina sem check')

  return partes.filter(Boolean).join(', ')
}
