interface ConfiguracaoAusenteProps {
  variaveis: readonly string[]
}

/**
 * Tela de configuração ausente.
 *
 * O client do Supabase lança quando as variáveis não existem, e como ele é
 * importado no topo da árvore isso derrubava o app antes do primeiro render —
 * resultado: página em branco com um erro só no console. Numa Vercel recém
 * conectada esse é o estado padrão, já que `.env.local` não vai para o git.
 *
 * Uma tela que diz o que falta e onde configurar economiza a ida ao console.
 */
export function ConfiguracaoAusente({ variaveis }: ConfiguracaoAusenteProps) {
  return (
    <div className="bg-background text-foreground flex min-h-dvh items-center justify-center p-6">
      <div className="border-border bg-card w-full max-w-md space-y-4 rounded-lg border p-6">
        <div className="space-y-1.5">
          <h1 className="text-lg">Falta configurar o Supabase</h1>
          <p className="text-muted-foreground text-sm">
            O app carregou, mas não sabe a qual banco se conectar.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">
            {variaveis.length === 1
              ? 'Variável ausente:'
              : 'Variáveis ausentes:'}
          </p>
          <ul className="space-y-1">
            {variaveis.map((nome) => (
              <li
                key={nome}
                className="bg-muted border-border rounded border px-2 py-1 font-mono text-xs"
              >
                {nome}
              </li>
            ))}
          </ul>
        </div>

        <div className="text-muted-foreground space-y-2 text-xs leading-relaxed">
          <p>
            <strong className="text-foreground">Local:</strong> copie{' '}
            <code className="font-mono">app/.env.example</code> para{' '}
            <code className="font-mono">app/.env.local</code> e preencha.
          </p>
          <p>
            <strong className="text-foreground">Na Vercel:</strong> adicione em
            Settings → Environment Variables e faça um novo deploy. Elas são
            lidas no build, então mudar a variável sem redeploy não tem efeito.
          </p>
        </div>
      </div>
    </div>
  )
}
