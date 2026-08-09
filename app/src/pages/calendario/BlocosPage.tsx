import { Link } from 'react-router-dom'
import { ArrowLeft, Briefcase } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { EstadoVazio } from '@/components/EstadoVazio'
import { SkeletonPagina } from '@/components/Skeletons'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DialogFluxogramaLivre } from '@/features/fluxograma/componentes/DialogFluxogramaLivre'
import { ListaBlocosFixos } from '@/features/fluxograma/componentes/ListaBlocosFixos'
import {
  useExcluirFluxogramaLivre,
  useFluxogramaLivre,
} from '@/features/fluxograma/hooks'

/**
 * Configuração dos blocos fixos sem pilar próprio — trabalho, sobretudo.
 *
 * Existia como um card no rodapé do Calendário, depois da agenda, da faixa de
 * carga e dos avisos: para chegar nele era preciso rolar a página mais pesada
 * do app inteiro, e ele não aparecia na navegação nem na paleta de comandos.
 * Como sub-página ele entra em `SUBPAGINAS` e passa a ser alcançável por busca.
 */
export default function BlocosPage() {
  const blocos = useFluxogramaLivre()
  const excluir = useExcluirFluxogramaLivre()

  const lista = blocos.data ?? []

  return (
    <>
      <PageHeader
        titulo="Blocos fixos"
        descricao="Trabalho e outros compromissos recorrentes que não pertencem a um pilar."
        pilar="sono"
        icone={Briefcase}
        acoes={
          <div className="flex items-center gap-1">
            <DialogFluxogramaLivre />
            <Button asChild variant="ghost" size="sm">
              <Link to="/calendario">
                <ArrowLeft className="size-4" />
                Calendário
              </Link>
            </Button>
          </div>
        }
      />

      {blocos.isPending ? (
        <SkeletonPagina variante="grade" />
      ) : blocos.isError ? (
        <Card className="border-status-risco/40">
          <CardContent className="text-status-risco text-sm">
            Erro ao carregar: {blocos.error.message}
          </CardContent>
        </Card>
      ) : lista.length === 0 ? (
        <EstadoVazio
          icone={Briefcase}
          classeCor="text-trabalho"
          classeFundo="bg-trabalho-soft"
          titulo="Nenhum bloco fixo"
          descricao="Um bloco é um compromisso que se repete toda semana no mesmo horário — o expediente, um curso, um voluntariado. Ele entra no calendário e conta na carga do dia."
          acao={<DialogFluxogramaLivre />}
        />
      ) : (
        <div className="surgir-grupo">
          <Card>
            <CardContent>
              <ListaBlocosFixos
                itens={lista}
                onExcluir={(id) => excluir.mutate(id)}
                excluindo={excluir.isPending}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
