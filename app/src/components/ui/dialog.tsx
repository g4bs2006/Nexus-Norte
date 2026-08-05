import * as React from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { XIcon } from 'lucide-react'

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        'fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
        className,
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          // No MOBILE é uma folha ancorada embaixo; de `sm:` para cima volta a ser
          // o diálogo centralizado. Centralizado no celular tinha três problemas
          // com a mesma causa — o conteúdo estava preso ao meio da tela:
          //
          //  1. abrir o teclado derrubava o viewport para ~400px e o diálogo
          //     saltava, porque `-translate-y-1/2` recalcula a partir do centro;
          //  2. a mão que segura o aparelho não alcança o meio da tela, e é lá que
          //     ficavam os botões;
          //  3. sair exigia mirar num X pequeno, sem gesto nenhum.
          //
          // Ancorado embaixo, o conteúdo cresce para cima: a borda de baixo é a
          // borda da tela, onde o polegar já está, e o teclado empurra em vez de
          // reposicionar. `dvh` acompanha o teclado; `vh` não.
          // `pb` com safe-area no container, não no corpo: vale tanto para
          // diálogo com rodapé quanto sem, e mantém o rodapé acima da barra de
          // gesto em vez de atrás dela
          'fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-popover pb-[env(safe-area-inset-bottom)] text-sm text-popover-foreground ring-1 ring-foreground/10 duration-200 outline-none sm:pb-0',
          'data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-4 data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-bottom-4',
          'sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[calc(100dvh-2rem)] sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:duration-100',
          'sm:data-open:zoom-in-95 sm:data-open:slide-in-from-bottom-0 sm:data-closed:zoom-out-95 sm:data-closed:slide-out-to-bottom-0',
          className,
        )}
        {...props}
      >
        {/*
          A rolagem mora aqui dentro, não no container: era esse o motivo de o X
          rolar junto com o conteúdo e desaparecer em formulário longo. Com o
          container fixo, o botão de fechar fica sempre no mesmo lugar.

          O `p-4` desceu para cá junto com a rolagem, e isso mantém o
          `-mx-4 -mb-4` do DialogFooter funcionando — ele continua cancelando o
          padding do pai direto, que agora é este div.

          `pb` com `safe-area-inset-bottom`: no celular a folha encosta na borda,
          e sem isso a última linha fica atrás da barra de gesto do sistema.
        */}
        <div
          data-slot="dialog-body"
          className="grid gap-4 overflow-y-auto overscroll-contain p-4"
        >
          {children}
        </div>

        {showCloseButton && (
          <DialogPrimitive.Close data-slot="dialog-close" asChild>
            <Button
              variant="ghost"
              // `size-11` no toque: é botão de sair, e errar o alvo aqui significa
              // continuar preso no formulário
              className="absolute top-2 right-2 size-11 sm:size-8"
              size="icon-sm"
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </Button>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      // `pr` abre espaço para o X, que é absoluto e ficaria por cima do título.
      // Maior no mobile porque lá o alvo de fechar tem 44px.
      className={cn('flex flex-col gap-2 pr-12 sm:pr-8', className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        '-mx-4 -mb-4 flex flex-col-reverse gap-2 border-t bg-muted/50 p-4 sm:flex-row sm:justify-end',
        // No mobile a folha encosta na borda de baixo, então o rodapé não tem
        // canto arredondado para acompanhar — só o diálogo centralizado tem
        'rounded-none sm:rounded-b-xl',
        // Ação primária no alcance do polegar precisa de altura de dedo: o botão
        // padrão tem 32px, que é alvo de mouse
        '[&>button]:h-11 sm:[&>button]:h-8',
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        'font-heading text-base leading-none font-medium',
        className,
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        'text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground',
        className,
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
