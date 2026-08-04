import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Atalho {
  teclas: string[]
  descricao: string
}

const GRUPOS: ReadonlyArray<{ titulo: string; atalhos: Atalho[] }> = [
  {
    titulo: 'Geral',
    atalhos: [
      { teclas: ['Ctrl', 'K'], descricao: 'Buscar e navegar' },
      { teclas: ['?'], descricao: 'Mostrar esta lista' },
      { teclas: ['Esc'], descricao: 'Fechar o que está aberto' },
    ],
  },
  {
    titulo: 'Ir para',
    atalhos: [
      { teclas: ['G', 'H'], descricao: 'Home' },
      { teclas: ['G', 'F'], descricao: 'Financeiro' },
      { teclas: ['G', 'E'], descricao: 'Estudos' },
      { teclas: ['G', 'T'], descricao: 'Treino' },
      { teclas: ['G', 'P'], descricao: 'Projetos' },
      { teclas: ['G', 'C'], descricao: 'Calendário' },
    ],
  },
]

function Tecla({ children }: { children: string }) {
  return (
    <kbd className="border-border bg-muted text-foreground rounded border border-b-2 px-1.5 py-0.5 font-mono text-[11px] leading-none">
      {children}
    </kbd>
  )
}

interface DialogAtalhosProps {
  aberto: boolean
  onAbertoChange: (aberto: boolean) => void
}

/** Lista de atalhos, aberta com `?`. */
export function DialogAtalhos({ aberto, onAbertoChange }: DialogAtalhosProps) {
  return (
    <Dialog open={aberto} onOpenChange={onAbertoChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Atalhos</DialogTitle>
          <DialogDescription>
            Teclas simples valem quando o foco não está num campo de texto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {GRUPOS.map((grupo) => (
            <div key={grupo.titulo} className="space-y-2">
              <p className="text-muted-foreground text-[11px] tracking-wide uppercase">
                {grupo.titulo}
              </p>
              <ul className="space-y-1.5">
                {grupo.atalhos.map((atalho) => (
                  <li
                    key={atalho.descricao}
                    className="flex items-center justify-between gap-4 text-sm"
                  >
                    <span>{atalho.descricao}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {atalho.teclas.map((tecla, i) => (
                        <span key={tecla} className="flex items-center gap-1">
                          {/* "então" deixa explícito que G+H é sequência, não combinação */}
                          {i > 0 && grupo.titulo === 'Ir para' && (
                            <span className="text-muted-foreground text-[10px]">
                              então
                            </span>
                          )}
                          <Tecla>{tecla}</Tecla>
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
