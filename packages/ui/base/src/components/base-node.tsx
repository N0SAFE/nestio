import type { ComponentProps } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "../lib/utils";
import { HeaderWithIcon } from "./header-with-icon";

export function BaseNode({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "w-72 border border-card-foreground/10 rounded-xl bg-card/50 shadow-sm backdrop-blur-xl transition divide-y divide-card-foreground/10",
        // React Flow displays node elements inside of a `NodeWrapper` component,
        // which compiles down to a div with the class `react-flow__node`.
        // When a node is selected, the class `selected` is added to the
        // `react-flow__node` element. This allows us to style the node when it
        // is selected, using Tailwind's `&` selector.
        "[.react-flow\\_\\_node.selected_&]:border-primary",
        className,
      )}
      tabIndex={0}
      {...props}
    />
  );
}

/**
 * A container for a consistent header layout intended to be used inside the
 * `<BaseNode />` component.
 */
interface BaseNodeHeaderProps extends ComponentProps<"header"> {
  icon?: LucideIcon;
  title?: string;
  gradientColor?: string;
  actions?: React.ReactNode;
}

export function BaseNodeHeader({
  className,
  icon,
  title,
  gradientColor,
  actions,
  children,
  ...props
}: BaseNodeHeaderProps) {
  return (
    <header
      {...props}
      className={cn(
        "relative overflow-clip rounded-t-xl bg-card/50",
        className,
      )}
    >
      {/* Gradient background */}
      <div className="absolute inset-0">
        <div
          className={cn(
            "absolute h-full w-3/5 bg-gradient-to-r to-transparent",
            gradientColor ?? "from-primary/40"
          )}
        />
      </div>

      {/* Header content */}
      <div className="relative h-9 flex items-center justify-between gap-x-4 px-0.5 py-0.5">
        <div className="flex grow items-center pl-1">
          {icon && title ? (
            <HeaderWithIcon icon={icon} title={title} />
          ) : (
            children
          )}
        </div>

        {actions && (
          <div className="flex shrink-0 items-center gap-x-0.5 pr-0.5">
            <div className="mx-1 h-4 w-px bg-card-foreground/10" />
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

/**
 * The title text for the node. To maintain a native application feel, the title
 * text is not selectable.
 */
export function BaseNodeHeaderTitle({
  className,
  ...props
}: ComponentProps<"h3">) {
  return (
    <h3
      data-slot="base-node-title"
      className={cn("user-select-none flex-1 font-semibold", className)}
      {...props}
    />
  );
}

export function BaseNodeContent({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="base-node-content"
      className={cn(
        "flex flex-col divide-y divide-card-foreground/10",
        className
      )}
      {...props}
    />
  );
}

interface BaseNodeFooterProps extends ComponentProps<"div"> {
  nodeId?: string | number;
}

export function BaseNodeFooter({ className, nodeId, children, ...props }: BaseNodeFooterProps) {
  return (
    <div
      data-slot="base-node-footer"
      className={cn(
        "bg-card-foreground/10 overflow-clip rounded-b-md px-4 py-2 text-[10px] text-card-foreground/50",
        className,
      )}
      {...props}
    >
      {nodeId ? (
        <>
          Node: <span className="font-semibold">#{nodeId}</span>
        </>
      ) : children}
    </div>
  );
}
