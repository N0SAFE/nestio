/**
 * PortContextMenu Component
 *
 * Context menu that appears when right-clicking on a SubFlow port.
 * Provides options to configure or manage the port.
 */

import React, { memo } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@repo/ui/components/shadcn/context-menu';
import { Settings, Trash2, Copy, Info } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface PortContextMenuProps {
  /** Child element (the port handle) */
  children: React.ReactNode;
  /** Port ID */
  portId: string;
  /** Port name */
  portName: string;
  /** Whether this is an input port */
  isInput: boolean;
  /** Callback when configure is clicked */
  onConfigure?: () => void;
  /** Callback when delete is clicked */
  onDelete?: () => void;
  /** Callback when copy is clicked */
  onCopy?: () => void;
  /** Callback when info is clicked */
  onInfo?: () => void;
  /** Read-only mode */
  readOnly?: boolean;
}

// ============================================================================
// PortContextMenu Component
// ============================================================================

export const PortContextMenu = memo(function PortContextMenu({
  children,
  portId,
  portName,
  isInput,
  onConfigure,
  onDelete,
  onCopy,
  onInfo,
  readOnly = false,
}: PortContextMenuProps) {
  // Wrapper to stop event propagation when clicking menu items
  const handleClick = (handler?: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    handler?.();
  };
  
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          {isInput ? 'Input Port' : 'Output Port'}: {portName}
        </div>
        <ContextMenuSeparator />
        
        {onConfigure && (
          <ContextMenuItem onClick={handleClick(onConfigure)}>
            <Settings className="w-4 h-4 mr-2" />
            Configure Port
          </ContextMenuItem>
        )}
        
        {onInfo && (
          <ContextMenuItem onClick={handleClick(onInfo)}>
            <Info className="w-4 h-4 mr-2" />
            Port Details
          </ContextMenuItem>
        )}
        
        {onCopy && (
          <ContextMenuItem onClick={handleClick(onCopy)}>
            <Copy className="w-4 h-4 mr-2" />
            Copy Port ID
          </ContextMenuItem>
        )}
        
        {!readOnly && onDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={handleClick(onDelete)} className="text-red-500">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Port
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
});

export default PortContextMenu;
