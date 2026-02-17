import * as React from "react";
import { cn } from "../lib/utils";

interface NodeCardDescriptionProps
  extends React.HTMLAttributes<HTMLDivElement> {
  description: string;
}

export const NodeCardDescription = React.forwardRef<
  HTMLDivElement,
  NodeCardDescriptionProps
>(({ className, description, ...props }, ref) => (
  <div ref={ref} className={cn("px-4 py-2", className)} {...props}>
    <div className="text-xs text-card-foreground">{description}</div>
  </div>
));
NodeCardDescription.displayName = "NodeCardDescription";
