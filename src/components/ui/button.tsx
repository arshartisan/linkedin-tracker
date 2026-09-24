import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/*
  Every button is a pill. The filled ones carry the two control recipes from
  globals.css - `shadow-primary` for the one lime key per screen,
  `shadow-raised` for everything else - so the depth lives in the shadow and no
  button needs a border. A press scales to 0.96 for tactile feedback; `static`
  switches that off where the motion would distract.
*/
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-medium leading-none outline-none select-none transition-[background-color,color,box-shadow,scale] duration-150 ease-out-strong focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-50 aria-invalid:ring-2 aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-primary hover:bg-primary-hover",
        destructive:
          "bg-rose-soft text-rose shadow-raised hover:bg-[#4c2324]",
        outline:
          "bg-secondary text-secondary-foreground shadow-raised hover:bg-surface-2",
        secondary:
          "bg-secondary text-secondary-foreground shadow-raised hover:bg-surface-2 data-[state=open]:bg-surface-2",
        ghost: "text-muted hover:bg-white/6 hover:text-text",
        link: "text-brand underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[30px] px-3 text-[13px] has-[>svg]:pl-2.5",
        xs: "h-6 px-2 text-[11px] has-[>svg]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-[26px] px-[9px] text-[12px] has-[>svg]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        lg: "h-9 px-4 text-[14px] has-[>svg]:pl-3.5",
        icon: "size-[30px]",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-[26px]",
        "icon-lg": "size-9",
      },
      static: {
        false: "active:scale-[0.96]",
        true: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      static: false,
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  static: isStatic = false,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, static: isStatic, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
