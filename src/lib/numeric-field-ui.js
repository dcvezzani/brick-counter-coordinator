import { cn } from '@/lib/utils'

export const numericInputWrapperClass = cn(
  'flex min-h-11 shrink-0 basis-[38%] items-center self-stretch px-3',
)

export const numericInputFieldClass = cn(
  'placeholder:text-muted-foreground w-full border-0 bg-transparent p-0 text-base shadow-none outline-none md:text-sm',
  'focus-visible:ring-0 focus-visible:outline-none',
  'disabled:cursor-not-allowed',
)

export const numericHandleButtonClass = cn(
  'bg-background text-muted-foreground border-border absolute top-1/2 left-1/2 z-20 flex h-8 w-10 -translate-y-1/2 items-center justify-center rounded-full border shadow-xs select-none',
  'focus-visible:ring-ring/50 outline-none focus-visible:ring-3',
)

/** 2D stepped swipe handle — centering via inline translate only (no Tailwind translate). */
export const steppedHandleButtonClass = cn(
  'bg-background text-muted-foreground border-border absolute top-1/2 left-1/2 z-20 flex h-8 w-10 items-center justify-center rounded-full border shadow-xs select-none',
  'focus-visible:ring-ring/50 outline-none focus-visible:ring-3',
)

export const numericStepButtonClass = cn(
  'text-muted-foreground hover:text-foreground absolute z-10 flex cursor-pointer items-center justify-center font-medium select-none',
  'focus-visible:ring-ring/50 rounded-sm outline-none focus-visible:ring-3',
  'disabled:cursor-not-allowed disabled:opacity-50',
)
