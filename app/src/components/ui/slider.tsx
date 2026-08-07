import * as React from 'react'
import { Slider as SliderPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

/**
 * Primitivo novo no design system — usado pelos cortes por categoria do
 * simulador (resolução 10.47.5). Mesmo padrão visual de `progress.tsx`
 * (trilho `bg-muted`, preenchido `bg-primary`), com o polegar que faltava
 * pra virar interativo.
 */
function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const valores = value ?? defaultValue ?? [min, max]

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      min={min}
      max={max}
      value={value}
      defaultValue={defaultValue}
      className={cn(
        'relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col',
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative grow overflow-hidden rounded-full bg-muted data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
        />
      </SliderPrimitive.Track>
      {valores.map((_, indice) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={indice}
          className="border-primary bg-background block size-4 shrink-0 rounded-full border shadow-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
