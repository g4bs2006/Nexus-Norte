import { NavLink } from 'react-router-dom'
import { ITENS_NAVEGACAO } from '@/lib/pilares'
import { cn } from '@/lib/utils'

/**
 * Navegação inferior, exibida apenas no mobile.
 *
 * A sidebar lateral é escondida em telas pequenas: no celular o uso é registro
 * rápido do dia a dia (plano, seção 8), e uma barra inferior fica ao alcance do
 * polegar. `pb-safe` respeita a área segura de aparelhos com gesto de home.
 */
export function BottomNav() {
  return (
    <nav
      className="bg-sidebar border-sidebar-border fixed inset-x-0 bottom-0 z-40 flex border-t md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {ITENS_NAVEGACAO.map(({ id, nome, rota, icone: Icone, classeTexto }) => (
        <NavLink
          key={id}
          to={rota}
          end={rota === '/'}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition-colors',
              isActive ? 'text-foreground' : 'text-muted-foreground',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icone className={cn('size-5', isActive && classeTexto)} />
              <span className="max-w-full truncate px-0.5">{nome}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
