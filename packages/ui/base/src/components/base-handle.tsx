import type { ComponentProps } from "react";
import { Handle, type HandleProps } from "@xyflow/react";

import { cn } from "../lib/utils";

export type BaseHandleProps = HandleProps;

export function BaseHandle({
  className,
  children,
  ...props
}: ComponentProps<typeof Handle>) {
  return (
    <Handle
      {...props}
      className={cn(
        "cursor-crosshair",
        "size-3 hover:border-primary/50 border-2 border-card-foreground/40",
        "transition-colors duration-200",
        className,
      )}
    >
      {children}
    </Handle>
  );
}
