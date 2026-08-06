import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as api from './api'

const chaves = {
  inscrito: ['notificacoes', 'inscrito'] as const,
}

/**
 * Estado da notificação: suportado, permissão do navegador e se já existe
 * inscrição salva. `permissao` é lida direto de `Notification.permission` —
 * não é dado do banco, então fica em `useState` com um efeito, não em query.
 */
export function useNotificacoes() {
  const [permissao, setPermissao] = useState(api.permissaoAtual)
  const queryClient = useQueryClient()

  useEffect(() => {
    setPermissao(api.permissaoAtual())
  }, [])

  const inscrito = useQuery({
    queryKey: chaves.inscrito,
    queryFn: api.estaInscrito,
    enabled: api.suportado(),
  })

  const ativar = useMutation({
    mutationFn: api.ativar,
    onSuccess: () => {
      setPermissao(api.permissaoAtual())
      void queryClient.invalidateQueries({ queryKey: chaves.inscrito })
      toast.success('Notificações ativadas')
    },
    onError: (erro: Error) => toast.error(erro.message),
  })

  const desativar = useMutation({
    mutationFn: api.desativar,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chaves.inscrito })
      toast.success('Notificações desativadas')
    },
    onError: (erro: Error) => toast.error(erro.message),
  })

  return {
    suportado: api.suportado(),
    permissao,
    inscrito: inscrito.data ?? false,
    carregando: inscrito.isPending,
    ativar,
    desativar,
  }
}

/**
 * Clicar numa notificação com o app já aberto foca a janela, mas focar não
 * navega sozinho — o service worker manda essa mensagem (`sw.ts`,
 * `notificationclick`) e é aqui que ela vira uma troca de rota de verdade.
 * Precisa estar dentro do `BrowserRouter` (é por isso que mora num hook
 * chamado de `App`, não de `main.tsx`).
 */
export function useNavegacaoPorNotificacao() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    function aoReceberMensagem(evento: MessageEvent) {
      if (evento.data?.tipo === 'navegar' && typeof evento.data.rota === 'string') {
        navigate(evento.data.rota)
      }
    }

    navigator.serviceWorker.addEventListener('message', aoReceberMensagem)
    return () =>
      navigator.serviceWorker.removeEventListener('message', aoReceberMensagem)
  }, [navigate])
}
