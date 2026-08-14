import {
  Briefcase,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Dumbbell,
  FolderKanban,
  GraduationCap,
  History,
  LayoutDashboard,
  NotebookPen,
  Receipt,
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

/**
 * Páginas que existem mas não são pilares, para a paleta de comando.
 *
 * Ficam **fora** de `ITENS_NAVEGACAO` de propósito: aquela lista alimenta a
 * sidebar e a barra inferior do mobile, e a barra já tem seis alvos numa faixa —
 * um sétimo apertaria todos. Mas sem estar em lugar nenhum da navegação, a lista
 * de lançamentos tinha *um único* caminho no app inteiro (um botão de texto
 * pequeno no canto de um card do painel), e no celular era como se não existisse.
 */
export interface SubPagina {
  readonly id: string
  readonly nome: string
  /** O que a página responde — é o que faz a busca casar por intenção. */
  readonly termos: string
  readonly rota: string
  readonly icone: LucideIcon
  readonly classeTexto: string
}

export const SUBPAGINAS: readonly SubPagina[] = [
  {
    id: 'lancamentos',
    nome: 'Lançamentos',
    termos: 'lançamentos despesas gastos entradas saídas extrato',
    rota: '/financeiro/lancamentos',
    icone: Receipt,
    classeTexto: 'text-financeiro',
  },
  {
    id: 'planejamento',
    nome: 'Planejamento',
    termos:
      'planejamento compromissos recorrentes parcelas projeção simulador investimento futuro',
    rota: '/financeiro/planejamento',
    icone: CalendarClock,
    classeTexto: 'text-financeiro',
  },
  {
    id: 'notas',
    nome: 'Notas',
    termos:
      'notas caderno anotações conhecimento resumo fórmulas wiki tópicos zettelkasten',
    rota: '/notas',
    icone: NotebookPen,
    classeTexto: 'text-estudos',
  },
  {
    id: 'ritual-semanal',
    nome: 'Ritual de domingo',
    termos: 'ritual domingo planejar semana sono rotina financeiro',
    rota: '/calendario/semana',
    icone: CalendarCheck,
    classeTexto: 'text-sono',
  },
  {
    id: 'historico',
    nome: 'Histórico',
    termos: 'histórico heatmap consistência aderência memória timeline linha do tempo',
    rota: '/calendario/historico',
    icone: History,
    classeTexto: 'text-sono',
  },
  {
    id: 'blocos-fixos',
    nome: 'Blocos fixos',
    termos: 'trabalho blocos fixos expediente rotina horário semanal recorrente',
    rota: '/calendario/blocos',
    icone: Briefcase,
    classeTexto: 'text-trabalho',
  },
] as const
