import { NavLink } from 'react-router-dom'
import { ITENS_NAVEGACAO } from '@/lib/pilares'
import { cn } from '@/lib/utils'

/** Rótulos curtos só para a barra inferior, onde a largura é escassa. */
const CURTO: Record<string, string> = {
  home: 'Home',
  financeiro: 'Grana',
  estudos: 'Estudo',
  treino: 'Treino',
  projetos: 'Projeto',
  calendario: 'Agenda',
}

/**
 * Classes literais do indicador de ativo.
 *
 * Não derivar de `classeTexto` com `.replace()`: classe montada em runtime não
 * aparece na varredura do Tailwind e sairia do CSS em silêncio.
 */
const BARRA_ATIVA: Record<string, string> = {
  home: 'bg-foreground',
  financeiro: 'bg-financeiro',
  estudos: 'bg-estudos',
  treino: 'bg-treino',
  projetos: 'bg-projetos',
  calendario: 'bg-sono',
}

/**
 * Navegação inferior, exibida apenas no mobile.
 *
 * A sidebar lateral é escondida em telas pequenas: no celular o uso é registro
 * rápido do dia a dia (plano, seção 8), e uma barra inferior fica ao alcance do
 * polegar. `env(safe-area-inset-bottom)` respeita a área do gesto de home.
 *
 * Seis alvos numa faixa é apertado, então os rótulos usam versões curtas — o
 * ícone já carrega o reconhecimento, e "Financeiro" truncado em "Financ…" é pior
 * que uma palavra inteira mais curta.
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
          // O nome completo fica no rótulo acessível; o curto é só visual
          aria-label={nome}
          className={({ isActive }) =>
            cn(
              // 11px: mínimo recomendado pelo HIG. Em 10px o rótulo já pesava menos
              // que o ícone e não era o que se lia primeiro.
              'flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[11px] transition-colors',
              isActive ? 'text-foreground' : 'text-muted-foreground',
            )
          }
        >
          {({ isActive }) => (
            <>
              <span className="relative">
                <Icone className={cn('size-5', isActive && classeTexto)} />
                {/* Indicador de ativo em forma, não só em cor */}
                {isActive && (
                  <span
                    aria-hidden
                    className={cn(
                      'absolute -bottom-1 left-1/2 h-[2px] w-4 -translate-x-1/2 rounded-full',
                      BARRA_ATIVA[id] ?? 'bg-foreground',
                    )}
                  />
                )}
              </span>
              <span className="max-w-full truncate pt-0.5">
                {CURTO[id] ?? nome}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
