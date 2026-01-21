/**
 * SubFlowPortEditor Component
 *
 * UI for configuring SubFlow input/output ports.
 * Allows adding, editing, and removing ports with types and validation.
 */

import React, { memo, useCallback, useState } from 'react';
import { Plus, Trash2, GripVertical, Save, X } from 'lucide-react';
import { Button } from '@repo/ui/components/shadcn/button';
import { Input } from '@repo/ui/components/shadcn/input';
import { Label } from '@repo/ui/components/shadcn/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/ui/components/shadcn/select';
import { cn } from '@repo/ui/lib/utils';
import type {
  SubFlowInputPort,
  SubFlowOutputPort,
  PortType,
  PortDataType,
} from '../../core/types/subflow';

// ============================================================================
// Types
// ============================================================================

export interface SubFlowPortEditorProps {
  /** Input ports */
  inputs: SubFlowInputPort[];
  /** Output ports */
  outputs: SubFlowOutputPort[];
  /** Callback when ports change */
  onChange: (inputs: SubFlowInputPort[], outputs: SubFlowOutputPort[]) => void;
  /** Read-only mode */
  readOnly?: boolean;
}

interface PortEditorRowProps {
  port: SubFlowInputPort | SubFlowOutputPort;
  isInput: boolean;
  onUpdate: (port: SubFlowInputPort | SubFlowOutputPort) => void;
  onDelete: () => void;
  readOnly?: boolean;
}

// ============================================================================
// Port Types
// ============================================================================

const portTypes: { value: PortType; label: string }[] = [
  { value: 'trigger', label: 'Trigger' },
  { value: 'flow', label: 'Flow' },
  { value: 'data', label: 'Data' },
  { value: 'error', label: 'Error' },
];

const dataTypes: { value: PortDataType; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'object', label: 'Object' },
  { value: 'array', label: 'Array' },
  { value: 'file', label: 'File' },
];

// ============================================================================
// Port Editor Row
// ============================================================================

const PortEditorRow = memo(function PortEditorRow({
  port,
  isInput,
  onUpdate,
  onDelete,
  readOnly,
}: PortEditorRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPort, setEditedPort] = useState(port);

  const handleSave = useCallback(() => {
    onUpdate(editedPort);
    setIsEditing(false);
  }, [editedPort, onUpdate]);

  const handleCancel = useCallback(() => {
    setEditedPort(port);
    setIsEditing(false);
  }, [port]);

  if (isEditing) {
    return (
      <div className="grid grid-cols-[auto_1fr_120px_120px_auto] gap-2 items-center p-2 bg-muted/50 rounded-lg">
        <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
        
        <div className="space-y-1">
          <Input
            value={editedPort.name}
            onChange={(e) => setEditedPort({ ...editedPort, name: e.target.value })}
            placeholder="Port name"
            className="h-8"
          />
          <Input
            value={editedPort.description ?? ''}
            onChange={(e) => setEditedPort({ ...editedPort, description: e.target.value })}
            placeholder="Description (optional)"
            className="h-7 text-xs"
          />
        </div>
        
        <Select
          value={editedPort.type}
          onValueChange={(value: PortType) => setEditedPort({ ...editedPort, type: value })}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {portTypes.map((pt) => (
              <SelectItem key={pt.value} value={pt.value}>
                {pt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select
          value={editedPort.dataType ?? 'any'}
          onValueChange={(value: PortDataType) => setEditedPort({ ...editedPort, dataType: value })}
          disabled={editedPort.type === 'trigger' || editedPort.type === 'flow'}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {dataTypes.map((dt) => (
              <SelectItem key={dt.value} value={dt.value}>
                {dt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            className="h-8 w-8 p-0"
          >
            <Save className="w-4 h-4 text-green-500" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid grid-cols-[auto_1fr_120px_120px_auto] gap-2 items-center p-2 rounded-lg hover:bg-muted/30 transition-colors',
        readOnly && 'opacity-50'
      )}
    >
      <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
      
      <div>
        <div className="font-medium text-sm">{port.name}</div>
        {port.description && (
          <div className="text-xs text-muted-foreground">{port.description}</div>
        )}
      </div>
      
      <div className="text-sm capitalize">
        <span className={cn(
          'px-2 py-0.5 rounded-full text-xs font-medium',
          port.type === 'trigger' && 'bg-green-500/20 text-green-400',
          port.type === 'flow' && 'bg-blue-500/20 text-blue-400',
          port.type === 'data' && 'bg-purple-500/20 text-purple-400',
          port.type === 'error' && 'bg-red-500/20 text-red-400'
        )}>
          {port.type}
        </span>
      </div>
      
      <div className="text-sm text-muted-foreground">
        {port.dataType ?? 'N/A'}
      </div>
      
      {!readOnly && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-8 px-2 text-xs"
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-8 w-8 p-0"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </Button>
        </div>
      )}
    </div>
  );
});

// ============================================================================
// SubFlowPortEditor Component
// ============================================================================

export const SubFlowPortEditor = memo(function SubFlowPortEditor({
  inputs,
  outputs,
  onChange,
  readOnly = false,
}: SubFlowPortEditorProps) {
  const handleAddInput = useCallback(() => {
    const newPort: SubFlowInputPort = {
      id: `input-${Date.now()}`,
      name: `input_${inputs.length + 1}`,
      type: 'data',
      dataType: 'any',
      required: false,
    };
    onChange([...inputs, newPort], outputs);
  }, [inputs, outputs, onChange]);

  const handleAddOutput = useCallback(() => {
    const newPort: SubFlowOutputPort = {
      id: `output-${Date.now()}`,
      name: `output_${outputs.length + 1}`,
      type: 'data',
      dataType: 'any',
    };
    onChange(inputs, [...outputs, newPort]);
  }, [inputs, outputs, onChange]);

  const handleUpdateInput = useCallback(
    (index: number, port: SubFlowInputPort | SubFlowOutputPort) => {
      const updated = [...inputs];
      updated[index] = port as SubFlowInputPort;
      onChange(updated, outputs);
    },
    [inputs, outputs, onChange]
  );

  const handleUpdateOutput = useCallback(
    (index: number, port: SubFlowInputPort | SubFlowOutputPort) => {
      const updated = [...outputs];
      updated[index] = port as SubFlowOutputPort;
      onChange(inputs, updated);
    },
    [inputs, outputs, onChange]
  );

  const handleDeleteInput = useCallback(
    (index: number) => {
      onChange(
        inputs.filter((_, i) => i !== index),
        outputs
      );
    },
    [inputs, outputs, onChange]
  );

  const handleDeleteOutput = useCallback(
    (index: number) => {
      onChange(
        inputs,
        outputs.filter((_, i) => i !== index)
      );
    },
    [inputs, outputs, onChange]
  );

  return (
    <div className="space-y-6 p-4">
      {/* Input Ports Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold">Input Ports</h3>
            <p className="text-xs text-muted-foreground">
              Data coming into this SubFlow
            </p>
          </div>
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddInput}
              className="gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Input
            </Button>
          )}
        </div>

        <div className="space-y-1">
          {inputs.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-lg">
              No input ports. Click "Add Input" to create one.
            </div>
          ) : (
            inputs.map((port, index) => (
              <PortEditorRow
                key={port.id}
                port={port}
                isInput={true}
                onUpdate={(p) => handleUpdateInput(index, p)}
                onDelete={() => handleDeleteInput(index)}
                readOnly={readOnly}
              />
            ))
          )}
        </div>
      </div>

      {/* Output Ports Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold">Output Ports</h3>
            <p className="text-xs text-muted-foreground">
              Data going out of this SubFlow
            </p>
          </div>
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddOutput}
              className="gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Output
            </Button>
          )}
        </div>

        <div className="space-y-1">
          {outputs.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-lg">
              No output ports. Click "Add Output" to create one.
            </div>
          ) : (
            outputs.map((port, index) => (
              <PortEditorRow
                key={port.id}
                port={port}
                isInput={false}
                onUpdate={(p) => handleUpdateOutput(index, p)}
                onDelete={() => handleDeleteOutput(index)}
                readOnly={readOnly}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
});

export default SubFlowPortEditor;
