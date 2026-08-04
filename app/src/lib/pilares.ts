import {
  CalendarDays,
  Dumbbell,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

/**
 * Identificadores dos pilares do sistema (plano, seção 0).
 * `calendario` e `home` não são pilares, mas compartilham a navegação.
 */
export type PilarId = 'financeiro' | 'estudos' | 'treino' | 'projetos'

export interface ItemNavegacao {
  readonly id: PilarId | 'home' | 'calendario'
  readonly nome: string
  readonly rota: string
  readonly icone: LucideIcon
  /**
   * Classes Tailwind literais — precisam ser strings estáticas para o JIT
   * do Tailwind detectá-las na varredura do código-fonte.
   */
  readonly classeTexto: string
  readonly classeFundoSuave: string
}

/**
 * Ordem de exibição na sidebar. Home primeiro (hub), calendário por último
 * (camada transversal).
 */
export const ITENS_NAVEGACAO: readonly ItemNavegacao[] = [
  {
    id: 'home',
    nome: 'Home',
    rota: '/',
    icone: LayoutDashboard,
    classeTexto: 'text-foreground',
    classeFundoSuave: 'bg-muted',
  },
  {
    id: 'financeiro',
    nome: 'Financeiro',
    rota: '/financeiro',
    icone: Wallet,
    classeTexto: 'text-financeiro',
    classeFundoSuave: 'bg-financeiro-soft',
  },
  {
    id: 'estudos',
    nome: 'Estudos',
    rota: '/estudos',
    icone: GraduationCap,
    classeTexto: 'text-estudos',
    classeFundoSuave: 'bg-estudos-soft',
  },
  {
    id: 'treino',
    nome: 'Treino',
    rota: '/treino',
    icone: Dumbbell,
    classeTexto: 'text-treino',
    classeFundoSuave: 'bg-treino-soft',
  },
  {
    id: 'projetos',
    nome: 'Projetos',
    rota: '/projetos',
    icone: FolderKanban,
    classeTexto: 'text-projetos',
    classeFundoSuave: 'bg-projetos-soft',
  },
  {
    id: 'calendario',
    nome: 'Calendário',
    rota: '/calendario',
    icone: CalendarDays,
    classeTexto: 'text-sono',
    classeFundoSuave: 'bg-sono-soft',
  },
] as const
