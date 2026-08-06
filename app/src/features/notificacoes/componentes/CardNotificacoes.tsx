// app/src/features/notificacoes/componentes/CardNotificacoes.tsx
import { Bell, BellOff } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useNotificacoes } from '../hooks'

/**
 * Ativar/desativar notificação push (discussão em uso, 06/08). Sem tela de
 * configuração própria ainda — vive como card na Home, único lugar do app
 * hoje que não é específico de um pilar.
 */
export function CardNotificacoes() {
  const { suportado, permissao, inscrito, carregando, ativar, desativar } =
    useNotificacoes()

  // Navegador sem suporte (raro, mas existe): nada a fazer, não vale
  // ocupar espaço explicando o que não vai funcionar.
  if (!suportado) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="size-4" />
          Notificações
        </CardTitle>
        <CardDescription>
          Aula e treino 15 min antes, conta no dia do vencimento, prova e
          meta um dia antes do prazo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {permissao === 'denied' ? (
          <p className="text-muted-foreground text-sm">
            Bloqueadas nas configurações do navegador — pra reativar, mude a
            permissão de notificação deste site e recarregue a página.
          </p>
        ) : inscrito ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => desativar.mutate()}
            disabled={desativar.isPending}
          >
            <BellOff className="size-4" />
            {desativar.isPending ? 'Desativando…' : 'Desativar'}
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => ativar.mutate()}
            disabled={ativar.isPending || carregando}
          >
            <Bell className="size-4" />
            {ativar.isPending ? 'Ativando…' : 'Ativar notificações'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
