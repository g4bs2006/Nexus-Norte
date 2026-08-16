import { Suspense, lazy, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Formula } from './Formula'

const CampoMatematico = lazy(() => import('./CampoMatematico'))

/** Uma tecla a digitar, na linha de dicas. */
function Atalho({ children }: { children: string }) {
  return (
    <code className="bg-muted rounded px-1 py-0.5 font-mono text-[11px]">
      {children}
    </code>
  )
}

interface DialogFormulaProps {
  /** Recebe o LaTeX pronto, sem os `$`. Quem chama decide onde inserir. */
  onInserir: (latex: string, bloco: boolean) => void
  /**
   * A fórmula a editar, quando o diálogo abre por duplo clique numa que já
   * existe. Ausente, ele abre em branco para escrever uma nova.
   *
   * Semeia o estado ao ABRIR, e não a cada render: enquanto se digita, quem
   * manda no campo é o próprio diálogo — reescrever por cima a cada tecla
   * devolveria o texto original e travaria a edição.
   */
  inicial?: { latex: string; bloco: boolean } | null
  /**
   * Controlado de fora desde que o menu `/` passou a abri-lo.
   *
   * Antes ele trazia o próprio gatilho — um botão permanente na barra do
   * editor. A barra saiu, e um diálogo que se abre sozinho não tem como ser
   * chamado por um menu.
   */
  aberto: boolean
  onAbertoChange: (aberto: boolean) => void
}

/**
 * Entrada de fórmula com MathLive, devolvendo LaTeX.
 *
 * Não é enfeite (spec 14/08, seção 5): digitar `\int_{0}^{\infty}` às cegas é
 * lento o suficiente para se desistir de anotar no app — e fricção é o que
 * matou as tentativas anteriores de manter um sistema pessoal. Aqui se escreve
 * a fórmula vendo a fórmula.
 *
 * O que sai é LaTeX cru, que é o que a nota guarda. Renderização é view; fonte
 * é texto (é o mesmo princípio que sustenta Markdown como fonte de verdade).
 *
 * MathLive entra por `lazy` porque é pesado e só serve a quem está escrevendo.
 */
export function DialogFormula({
  onInserir,
  inicial,
  aberto,
  onAbertoChange,
}: DialogFormulaProps) {
  const [latex, setLatex] = useState('')
  const [bloco, setBloco] = useState(false)

  const editando = inicial != null

  /*
   * Semeia ao ABRIR. A dependência é `aberto`, e não `inicial`: se o objeto
   * entrasse aqui, cada render do pai o recriaria e o campo voltaria ao texto
   * original no meio da digitação.
   */
  useEffect(() => {
    if (!aberto) return
    setLatex(inicial?.latex ?? '')
    /*
     * Só a EDIÇÃO impõe o `bloco` — ali ele é um fato da fórmula que está na
     * página. Fórmula nova mantém a última escolha da sessão: quem está
     * escrevendo uma lista de equações centralizadas as escreve em série, e
     * remarcar a caixa a cada uma era o trabalho manual que este diálogo
     * existe para tirar.
     */
    if (inicial) setBloco(inicial.bloco)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto])

  /**
   * `forcarBloco` vem do `Ctrl+Enter`, que insere em linha própria sem passar
   * pela caixa. A escolha fica marcada depois: se foi assim que se quis esta,
   * a próxima provavelmente é igual, e é o mesmo princípio do parágrafo acima.
   */
  function inserir(forcarBloco?: boolean) {
    const limpo = latex.trim()
    if (limpo === '') return
    const emBloco = forcarBloco ?? bloco
    onInserir(limpo, emBloco)
    setBloco(emBloco)
    setLatex('')
    onAbertoChange(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={onAbertoChange}>
      <DialogContent
        // O padrão é `sm:max-w-sm` (384px), estreito demais para uma fórmula
        // com o teclado do MathLive aberto embaixo.
        className="max-w-2xl!"
        /*
         * Clique fora NÃO fecha.
         *
         * O teclado virtual do MathLive é montado num portal, fora da árvore
         * do diálogo — então, para o Radix, tocar nele é "interagir fora" e o
         * diálogo fechava no meio da fórmula. Some-se a isso o alvo pequeno e
         * qualquer clique de mira errada custava o que já tinha sido escrito.
         *
         * Fechar continua tendo dois caminhos deliberados: `Esc` e o X.
         */
        onInteractOutside={(evento) => evento.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar fórmula' : 'Fórmula'}</DialogTitle>
          <DialogDescription>
            Escreva como se lê. O que a nota guarda é o LaTeX.
          </DialogDescription>
        </DialogHeader>

        <Suspense
          fallback={
            <p className="text-muted-foreground text-sm">Carregando editor…</p>
          }
        >
          <CampoMatematico
            valor={latex}
            onChange={setLatex}
            onConfirmar={inserir}
          />
        </Suspense>

        {/*
          Os atalhos que o MathLive já tem, escritos porque não se descobrem.
          Nenhum deles está no teclado virtual: `sum` vira o somatório COM os
          limites (`\sum_{}^{}`), não a letra grega solta, e é a diferença
          entre achar que o app não tem somatório e escrever um em três teclas.
        */}
        <p className="text-muted-foreground text-xs">
          Digite <Atalho>sum</Atalho> <Atalho>int</Atalho>{' '}
          <Atalho>prod</Atalho> <Atalho>sqrt</Atalho> <Atalho>oo</Atalho> para
          somatório, integral, produtório, raiz e infinito. <Atalho>/</Atalho>{' '}
          faz fração e <Atalho>^</Atalho> faz expoente.
        </p>

        {latex.trim() !== '' && (
          <div className="bg-muted/40 rounded-md p-3">
            <Formula latex={latex} bloco={bloco} />
          </div>
        )}

        <label className="text-muted-foreground flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={bloco}
            onChange={(evento) => setBloco(evento.target.checked)}
          />
          Em linha própria, centralizada
          <span className="text-muted-foreground/70">
            — ou <Atalho>Ctrl</Atalho>+<Atalho>Enter</Atalho> para inserir assim
          </span>
        </label>

        <DialogFooter>
          {/*
            `() => inserir()` e não `inserir`: passado direto, o evento de
            clique viraria o argumento `forcarBloco` — e um MouseEvent é
            truthy, então todo botão inseriria em bloco.
          */}
          <Button
            type="button"
            onClick={() => inserir()}
            disabled={latex.trim() === ''}
          >
            {editando ? 'Salvar' : 'Inserir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
