import { useEffect, useState, type ReactNode } from 'react'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { CheckDia } from '@/components/CheckDia'
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
import { deISO, paraISO } from '@/lib/datas'
import { useDefinirConclusao } from '@/features/estudos/hooks'
import { corDoEvento, type EventoCalendario } from '../eventos'

interface DialogPresencaAulaProps {
  /** Ocorrência da rotina com check (`ehOcorrenciaComCheck`). `null` = fechado. */
  evento?: EventoCalendario | null
  open?: boolean
  onOpenChange?: (aberto: boolean) => void
  trigger?: ReactNode | null
}

/**
 * O check de presença de uma aula, na data dela, aberto pelo calendário.
 *
 * Existe porque o check só era alcançável **no dia**: a Home e o hub de Estudos
 * listam "hoje" e gravam sempre `hojeISO`. Esquecer de marcar na terça era
 * definitivo — a aula ficava prevista para sempre, entrava no anel de "rotina
 * sem check" da faixa de carga e em "Ficou pra trás", indistinguível de falta.
 * E era no calendário, olhando a semana, que se percebia o buraco; lá o clique
 * levava para a matéria, que é outra página onde o check daquele dia não existe.
 *
 * **A data é a da ocorrência, não hoje.** É o ponto inteiro do diálogo: grava
 * `conclusoes_fluxograma (origemId, data do evento)`, a mesma chave que
 * `eventosFluxograma` lê para virar `estado: 'feito'`. Numa ocorrência remarcada
 * a data é a de **destino**, onde a aula de fato está — igual ao que a Home já
 * faz ao marcar uma remarcada que caiu hoje.
 *
 * Mantém o caminho antigo no rodapé ("Ver matéria"): o clique deixou de navegar,
 * e sumir com a navegação seria trocar um buraco por outro.
 */
export function DialogPresencaAula({
  evento,
  open,
  onOpenChange,
  trigger,
}: DialogPresencaAulaProps) {
  const [abertoInterno, setAbertoInterno] = useState(false)
  const aberto = open ?? abertoInterno
  const setAberto = onOpenChange ?? setAbertoInterno

  const definirConclusao = useDefinirConclusao()

  const feito = evento?.estado === 'feito'
  /*
   * Espelho local do check, para o toque responder na hora.
   *
   * Sem ele o diálogo ficaria parado até a invalidação voltar do servidor — e
   * quando é aberto pela grade de Horas ele recebe o evento resolvido a partir
   * de um id guardado na página, que só muda no próximo render da consulta.
   * Ressincroniza quando o valor real chega (`feito` está nas deps), então erro
   * na mutation não deixa a tela mentindo.
   */
  const [marcado, setMarcado] = useState(feito)
  useEffect(() => {
    if (aberto) setMarcado(feito)
  }, [aberto, feito])

  if (!evento) return null

  const data = evento.inicio.slice(0, 10)
  const hora = evento.diaInteiro ? null : evento.inicio.slice(11, 16)
  const horaFim = evento.fim ? evento.fim.slice(11, 16) : null
  const passado = data < paraISO(new Date())

  async function alternar(proximo: boolean) {
    if (!evento?.origemId) return
    setMarcado(proximo)
    try {
      await definirConclusao.mutateAsync({
        fluxogramaId: evento.origemId,
        data,
        concluido: proximo,
      })
    } catch {
      // O hook já mostra o toast do erro; aqui só desfazemos o espelho local,
      // senão o check fica marcado na tela com o banco sem a linha.
      setMarcado(!proximo)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      {trigger !== null && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button size="sm" variant="secondary">
              Ver aula
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{evento.titulo}</DialogTitle>
          <DialogDescription className="first-letter:uppercase">
            {format(deISO(data), "EEEE, d 'de' MMMM")}
            {hora && ` · ${hora}${horaFim ? `–${horaFim}` : ''}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <CheckDia
            id={`presenca-${evento.id}`}
            marcado={marcado}
            onAlternar={(proximo) => void alternar(proximo)}
            {...(evento.cor ? { cor: corDoEvento(evento) } : {})}
          >
            Compareci nesta aula
          </CheckDia>

          {/*
            Só no passado: no dia (ou adiante) a frase não explica nada, e o
            aviso ficaria no caminho do gesto mais comum, que é marcar hoje.
          */}
          {passado && (
            <p className="text-muted-foreground text-xs">
              O check é do dia acima, não de hoje — dá para marcar depois de o
              dia ter passado.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {evento.rota ? (
            <Button asChild variant="secondary">
              <Link to={evento.rota}>Ver matéria</Link>
            </Button>
          ) : (
            <span />
          )}
          <Button variant="ghost" onClick={() => setAberto(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
