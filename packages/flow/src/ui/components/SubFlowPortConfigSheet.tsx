/**
 * SubFlowPortConfigSheet Component
 *
 * Sheet dialog for configuring SubFlow ports.
 * Opened via context menu on port right-click.
 */

import React, { memo, useCallback, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@repo/ui/components/shadcn/sheet';
import { Button } from '@repo/ui/components/shadcn/button';
import type {
  SubFlow,
  SubFlowInputPort,
  SubFlowOutputPort,
} from '../../core/types/subflow';
import SubFlowPortEditor from './SubFlowPortEditor';

// ============================================================================
// Types
// ============================================================================

export interface SubFlowPortConfigSheetProps {
  /** Whether the sheet is open */
  open: boolean;
  /** Callback when sheet should close */
  onOpenChange: (open: boolean) => void;
  /** The SubFlow being configured */
  subFlow: SubFlow;
  /** Callback when SubFlow is updated */
  onUpdate: (subFlow: SubFlow) => void;
  /** Read-only mode */
  readOnly?: boolean;
}

// ============================================================================
// SubFlowPortConfigSheet Component
// ============================================================================

export const SubFlowPortConfigSheet = memo(function SubFlowPortConfigSheet({
  open,
  onOpenChange,
  subFlow,
  onUpdate,
  readOnly = false,
}: SubFlowPortConfigSheetProps) {
  const [localInputs, setLocalInputs] = useState<SubFlowInputPort[]>(subFlow.inputs);
  const [localOutputs, setLocalOutputs] = useState<SubFlowOutputPort[]>(subFlow.outputs);
  const [hasChanges, setHasChanges] = useState(false);

  const handlePortsChange = useCallback(
    (inputs: SubFlowInputPort[], outputs: SubFlowOutputPort[]) => {
      setLocalInputs(inputs);
      setLocalOutputs(outputs);
      setHasChanges(true);
    },
    []
  );

  const handleSave = useCallback(() => {
    // Update internal nodes to match ports
    const inputNodes = localInputs.map((port, index) => {
      const existingNode = subFlow.nodes.find(
        (n) => n.type === 'input-port' && n.linkedPortId === port.id
      );
      return (
        existingNode ?? {
          id: `node-input-${port.id}`,
          type: 'input-port' as const,
          pluginId: 'system:input-port',
          label: port.name,
          position: { x: 50, y: 100 + index * 80 },
          data: { inputs: {}, outputs: {} },
          config: { portType: port.type, dataType: port.dataType },
          linkedPortId: port.id,
        }
      );
    });

    const outputNodes = localOutputs.map((port, index) => {
      const existingNode = subFlow.nodes.find(
        (n) => n.type === 'output-port' && n.linkedPortId === port.id
      );
      return (
        existingNode ?? {
          id: `node-output-${port.id}`,
          type: 'output-port' as const,
          pluginId: 'system:output-port',
          label: port.name,
          position: { x: 500, y: 100 + index * 80 },
          data: { inputs: {}, outputs: {} },
          config: { portType: port.type, dataType: port.dataType },
          linkedPortId: port.id,
        }
      );
    });

    // Keep other nodes (non-port nodes)
    const otherNodes = subFlow.nodes.filter(
      (n) => n.type !== 'input-port' && n.type !== 'output-port'
    );

    const updatedSubFlow: SubFlow = {
      ...subFlow,
      inputs: localInputs,
      outputs: localOutputs,
      nodes: [...inputNodes, ...outputNodes, ...otherNodes],
      updatedAt: new Date(),
    };

    onUpdate(updatedSubFlow);
    setHasChanges(false);
    onOpenChange(false);
  }, [localInputs, localOutputs, subFlow, onUpdate, onOpenChange]);

  const handleCancel = useCallback(() => {
    setLocalInputs(subFlow.inputs);
    setLocalOutputs(subFlow.outputs);
    setHasChanges(false);
    onOpenChange(false);
  }, [subFlow.inputs, subFlow.outputs, onOpenChange]);

  // Reset local state when SubFlow changes
  React.useEffect(() => {
    setLocalInputs(subFlow.inputs);
    setLocalOutputs(subFlow.outputs);
    setHasChanges(false);
  }, [subFlow.inputs, subFlow.outputs]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Configure Ports</SheetTitle>
          <SheetDescription>
            Configure input and output ports for <strong>{subFlow.name}</strong>.
            Ports define the interface of this SubFlow.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <SubFlowPortEditor
            inputs={localInputs}
            outputs={localOutputs}
            onChange={handlePortsChange}
            readOnly={readOnly}
          />
        </div>

        {!readOnly && (
          <div className="flex items-center justify-end gap-2 mt-6 pt-6 border-t">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges}>
              Save Changes
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
});

export default SubFlowPortConfigSheet;
