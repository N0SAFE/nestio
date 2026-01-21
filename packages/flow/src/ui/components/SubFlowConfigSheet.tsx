/**
 * SubFlowConfigSheet Component
 *
 * Sheet dialog for configuring a SubFlow's properties.
 * Opened by clicking on the SubFlow settings button.
 */

import React, { memo, useCallback, useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@repo/ui/components/shadcn/sheet';
import { Button } from '@repo/ui/components/shadcn/button';
import { Input } from '@repo/ui/components/shadcn/input';
import { Label } from '@repo/ui/components/shadcn/label';
import { Textarea } from '@repo/ui/components/shadcn/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/shadcn/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/ui/components/shadcn/tabs';
import { Separator } from '@repo/ui/components/shadcn/separator';
import { ScrollArea } from '@repo/ui/components/shadcn/scroll-area';
import type {
  SubFlow,
  SubFlowType,
  SubFlowInputPort,
  SubFlowOutputPort,
  PortType,
  SubFlowPort,
} from '../../core/types/subflow';
import {
  Save,
  Trash2,
  Plus,
  Zap,
  Code2,
  Palette,
  Settings,
  ArrowRightToLine,
  ArrowLeftFromLine,
} from 'lucide-react';
import { cn } from '@repo/ui/lib/utils';
import { PortConfigSheet } from './PortConfigSheet';

// ============================================================================
// Types
// ============================================================================

export interface SubFlowConfigSheetProps {
  /** The SubFlow being configured */
  subFlow: SubFlow;
  /** Whether the sheet is open */
  isOpen: boolean;
  /** Callback when sheet should close */
  onOpenChange: (open: boolean) => void;
  /** Callback when SubFlow is updated */
  onSave?: (updates: Partial<SubFlow>) => void;
  /** Callback when SubFlow is deleted */
  onDelete?: () => void;
  /** Read-only mode */
  readOnly?: boolean;
}

// Color options
const colorOptions: { value: string; label: string; class: string }[] = [
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'red', label: 'Red', class: 'bg-red-500' },
  { value: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
];

// Category options
const categoryOptions = [
  'Trigger',
  'Data Processing',
  'Integration',
  'Utility',
  'Logic',
  'Communication',
  'Custom',
];

// ============================================================================
// Port List Component
// ============================================================================

interface PortListProps {
  ports: (SubFlowInputPort | SubFlowOutputPort)[];
  type: 'input' | 'output';
  onAdd: () => void;
  onEdit: (portId: string) => void;
  onDelete: (portId: string) => void;
  readOnly?: boolean;
}

const PortList = memo(function PortList({
  ports,
  type,
  onAdd,
  onEdit,
  onDelete,
  readOnly,
}: PortListProps) {
  const Icon = type === 'input' ? ArrowRightToLine : ArrowLeftFromLine;
  
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {type === 'input' ? 'Input Ports' : 'Output Ports'}
        </Label>
        {!readOnly && (
          <Button variant="outline" size="sm" onClick={onAdd}>
            <Plus className="w-3 h-3 mr-1" />
            Add
          </Button>
        )}
      </div>
      
      {ports.length === 0 ? (
        <div className="p-3 bg-muted/30 rounded-lg text-center text-sm text-muted-foreground">
          No {type} ports defined
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {ports.map((port) => (
            <div
              key={port.id}
              className="flex items-center justify-between p-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-2 h-2 rounded-full',
                    port.type === 'trigger' && 'bg-green-500',
                    port.type === 'flow' && 'bg-blue-500',
                    port.type === 'data' && 'bg-purple-500',
                    port.type === 'error' && 'bg-red-500'
                  )}
                />
                <span className="font-medium text-sm">{port.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({port.dataType ?? 'any'})
                </span>
                {port.required && (
                  <span className="text-[10px] px-1 py-0.5 bg-red-500/20 text-red-400 rounded">
                    required
                  </span>
                )}
              </div>
              
              {!readOnly && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { onEdit(port.id); }}
                    className="h-7 w-7 p-0"
                  >
                    <Settings className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { onDelete(port.id); }}
                    className="h-7 w-7 p-0 hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// ============================================================================
// SubFlowConfigSheet Component
// ============================================================================

export const SubFlowConfigSheet = memo(function SubFlowConfigSheet({
  subFlow,
  isOpen,
  onOpenChange,
  onSave,
  onDelete,
  readOnly = false,
}: SubFlowConfigSheetProps) {
  // Local state for form - Basic info
  const [name, setName] = useState(subFlow.name);
  const [type, setType] = useState<SubFlowType>(subFlow.type);
  const [description, setDescription] = useState(subFlow.description ?? '');
  const [color, setColor] = useState(subFlow.color ?? 'blue');
  const [category, setCategory] = useState(subFlow.category ?? '');
  const [version, setVersion] = useState(subFlow.version ?? '1.0.0');
  const [tags, setTags] = useState<string[]>(subFlow.tags ?? []);
  const [tagsInput, setTagsInput] = useState('');
  
  // Ports
  const [inputs, setInputs] = useState<SubFlowInputPort[]>(subFlow.inputs);
  const [outputs, setOutputs] = useState<SubFlowOutputPort[]>(subFlow.outputs);
  
  // Port editing state
  const [editingPort, setEditingPort] = useState<SubFlowInputPort | SubFlowOutputPort | null>(null);
  const [editingPortType, setEditingPortType] = useState<'input' | 'output' | null>(null);
  const [isPortConfigOpen, setIsPortConfigOpen] = useState(false);
  
  // Dimensions
  const [width, setWidth] = useState(subFlow.dimensions?.width ?? 400);
  const [height, setHeight] = useState(subFlow.dimensions?.height ?? 300);

  // Reset form when subFlow changes
  useEffect(() => {
    setName(subFlow.name);
    setType(subFlow.type);
    setDescription(subFlow.description ?? '');
    setColor(subFlow.color ?? 'blue');
    setCategory(subFlow.category ?? '');
    setVersion(subFlow.version ?? '1.0.0');
    setTags(subFlow.tags ?? []);
    setInputs(subFlow.inputs);
    setOutputs(subFlow.outputs);
    setWidth(subFlow.dimensions?.width ?? 400);
    setHeight(subFlow.dimensions?.height ?? 300);
  }, [subFlow]);

  // Handle save
  const handleSave = useCallback(() => {
    const updates: Partial<SubFlow> = {
      name,
      type,
      description,
      color,
      category,
      version,
      tags,
      inputs,
      outputs,
      dimensions: { width, height },
    };
    onSave?.(updates);
    onOpenChange(false);
  }, [name, type, description, color, category, version, tags, inputs, outputs, width, height, onSave, onOpenChange]);

  // Handle delete
  const handleDelete = useCallback(() => {
    if (confirm(`Are you sure you want to delete SubFlow "${subFlow.name}"?`)) {
      onDelete?.();
      onOpenChange(false);
    }
  }, [subFlow.name, onDelete, onOpenChange]);

  // Add tag
  const handleAddTag = useCallback(() => {
    if (tagsInput.trim() && !tags.includes(tagsInput.trim())) {
      setTags([...tags, tagsInput.trim()]);
      setTagsInput('');
    }
  }, [tagsInput, tags]);

  // Remove tag
  const handleRemoveTag = useCallback((tag: string) => {
    setTags(tags.filter(t => t !== tag));
  }, [tags]);

  // Add new port
  const handleAddPort = useCallback((portType: 'input' | 'output') => {
    const newPort: SubFlowInputPort | SubFlowOutputPort = {
      id: `${portType}-${String(Date.now())}`,
      name: `new_${portType}`,
      type: 'data' as PortType,
      dataType: 'any',
      required: false,
    };
    
    if (portType === 'input') {
      setInputs([...inputs, newPort as SubFlowInputPort]);
    } else {
      setOutputs([...outputs, newPort as SubFlowOutputPort]);
    }
  }, [inputs, outputs]);

  // Delete port
  const handleDeletePort = useCallback((portType: 'input' | 'output', portId: string) => {
    if (portType === 'input') {
      setInputs(inputs.filter(p => p.id !== portId));
    } else {
      setOutputs(outputs.filter(p => p.id !== portId));
    }
  }, [inputs, outputs]);

  // Edit port - opens PortConfigSheet
  const handleEditPort = useCallback((portType: 'input' | 'output', portId: string) => {
    const portList = portType === 'input' ? inputs : outputs;
    const port = portList.find(p => p.id === portId);
    if (port) {
      setEditingPort(port);
      setEditingPortType(portType);
      setIsPortConfigOpen(true);
    }
  }, [inputs, outputs]);

  // Save port edits from PortConfigSheet
  const handleSavePort = useCallback((updates: Partial<SubFlowPort>) => {
    if (!editingPort || !editingPortType) return;
    
    if (editingPortType === 'input') {
      setInputs(inputs.map(p => 
        p.id === editingPort.id ? { ...p, ...updates } as SubFlowInputPort : p
      ));
    } else {
      setOutputs(outputs.map(p => 
        p.id === editingPort.id ? { ...p, ...updates } as SubFlowOutputPort : p
      ));
    }
    
    setIsPortConfigOpen(false);
    setEditingPort(null);
    setEditingPortType(null);
  }, [editingPort, editingPortType, inputs, outputs]);

  // Delete the currently editing port
  const handleDeleteEditingPort = useCallback(() => {
    if (!editingPort || !editingPortType) return;
    if (editingPortType === 'input') {
      setInputs(inputs.filter(p => p.id !== editingPort.id));
    } else {
      setOutputs(outputs.filter(p => p.id !== editingPort.id));
    }
    setIsPortConfigOpen(false);
    setEditingPort(null);
    setEditingPortType(null);
  }, [editingPort, editingPortType, inputs, outputs]);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:max-w-[600px] p-0">
        <ScrollArea className="h-full">
          <div className="p-6">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {type === 'trigger' ? (
                  <Zap className="w-5 h-5 text-green-400" />
                ) : (
                  <Code2 className="w-5 h-5 text-blue-400" />
                )}
                Configure SubFlow
              </SheetTitle>
              <SheetDescription>
                Edit the properties and ports of this SubFlow.
              </SheetDescription>
            </SheetHeader>

            <Tabs defaultValue="general" className="mt-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="ports">Ports</TabsTrigger>
                <TabsTrigger value="appearance">Appearance</TabsTrigger>
              </TabsList>
              
              {/* General Tab */}
              <TabsContent value="general" className="flex flex-col gap-4 py-4">
                {/* Name */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="subflow-name">Name</Label>
                  <Input
                    id="subflow-name"
                    value={name}
                    onChange={(e) => { setName(e.target.value); }}
                    placeholder="Enter SubFlow name"
                    disabled={readOnly}
                  />
                </div>

                {/* Type */}
                <div className="flex flex-col gap-2">
                  <Label>Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { if (!readOnly) setType('trigger'); }}
                      className={cn(
                        'flex items-center gap-2 p-3 rounded-lg border-2 transition-all',
                        type === 'trigger'
                          ? 'border-green-500 bg-green-500/10'
                          : 'border-border hover:border-green-500/50',
                        readOnly && 'opacity-60 cursor-not-allowed'
                      )}
                    >
                      <Zap className="w-5 h-5 text-green-400" />
                      <div className="flex flex-col text-left">
                        <span className="font-medium">Trigger</span>
                        <span className="text-xs text-muted-foreground">
                          Entry point SubFlow
                        </span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => { if (!readOnly) setType('callable'); }}
                      className={cn(
                        'flex items-center gap-2 p-3 rounded-lg border-2 transition-all',
                        type === 'callable'
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-border hover:border-blue-500/50',
                        readOnly && 'opacity-60 cursor-not-allowed'
                      )}
                    >
                      <Code2 className="w-5 h-5 text-blue-400" />
                      <div className="flex flex-col text-left">
                        <span className="font-medium">Callable</span>
                        <span className="text-xs text-muted-foreground">
                          Reusable function
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Description */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="subflow-description">Description</Label>
                  <Textarea
                    id="subflow-description"
                    value={description}
                    onChange={(e) => { setDescription(e.target.value); }}
                    placeholder="Describe what this SubFlow does..."
                    rows={3}
                    disabled={readOnly}
                  />
                </div>

                {/* Category */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="subflow-category">Category</Label>
                  <Select
                    value={category}
                    onValueChange={(value) => { setCategory(value); }}
                    disabled={readOnly}
                  >
                    <SelectTrigger id="subflow-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Version */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="subflow-version">Version</Label>
                  <Input
                    id="subflow-version"
                    value={version}
                    onChange={(e) => { setVersion(e.target.value); }}
                    placeholder="1.0.0"
                    disabled={readOnly}
                  />
                </div>

                {/* Tags */}
                <div className="flex flex-col gap-2">
                  <Label>Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      value={tagsInput}
                      onChange={(e) => { setTagsInput(e.target.value); }}
                      placeholder="Add a tag..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      disabled={readOnly}
                    />
                    <Button
                      variant="outline"
                      onClick={handleAddTag}
                      disabled={readOnly || !tagsInput.trim()}
                    >
                      Add
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-muted rounded-full"
                        >
                          {tag}
                          {!readOnly && (
                            <button
                              type="button"
                              onClick={() => { handleRemoveTag(tag); }}
                              className="hover:text-red-400"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
              
              {/* Ports Tab */}
              <TabsContent value="ports" className="flex flex-col gap-6 py-4">
                <PortList
                  ports={inputs}
                  type="input"
                  onAdd={() => { handleAddPort('input'); }}
                  onEdit={(portId) => { handleEditPort('input', portId); }}
                  onDelete={(portId) => { handleDeletePort('input', portId); }}
                  readOnly={readOnly}
                />
                
                <Separator />
                
                <PortList
                  ports={outputs}
                  type="output"
                  onAdd={() => { handleAddPort('output'); }}
                  onEdit={(portId) => { handleEditPort('output', portId); }}
                  onDelete={(portId) => { handleDeletePort('output', portId); }}
                  readOnly={readOnly}
                />
              </TabsContent>
              
              {/* Appearance Tab */}
              <TabsContent value="appearance" className="flex flex-col gap-4 py-4">
                {/* Color */}
                <div className="flex flex-col gap-2">
                  <Label className="flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Color Theme
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {colorOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => { if (!readOnly) setColor(option.value); }}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-lg border-2 transition-all',
                          color === option.value
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50',
                          readOnly && 'opacity-60 cursor-not-allowed'
                        )}
                      >
                        <div className={cn('w-4 h-4 rounded-full', option.class)} />
                        <span className="text-sm">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dimensions */}
                <div className="flex flex-col gap-2">
                  <Label>Default Dimensions</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="width" className="text-xs text-muted-foreground">
                        Width (px)
                      </Label>
                      <Input
                        id="width"
                        type="number"
                        min={200}
                        max={800}
                        value={width}
                        onChange={(e) => { setWidth(parseInt(e.target.value) || 400); }}
                        disabled={readOnly}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="height" className="text-xs text-muted-foreground">
                        Height (px)
                      </Label>
                      <Input
                        id="height"
                        type="number"
                        min={150}
                        max={600}
                        value={height}
                        onChange={(e) => { setHeight(parseInt(e.target.value) || 300); }}
                        disabled={readOnly}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <SheetFooter className="flex justify-between gap-2 mt-6 pt-6 border-t">
              {/* Delete Button */}
              {!readOnly && onDelete && (
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  className="mr-auto"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete SubFlow
                </Button>
              )}

              {/* Save Button */}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { onOpenChange(false); }}>
                  Cancel
                </Button>
                {!readOnly && (
                  <Button onClick={handleSave}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                )}
              </div>
            </SheetFooter>
          </div>
        </ScrollArea>
      </SheetContent>
      
      {/* Port Configuration Sheet */}
      {editingPort && (
        <PortConfigSheet
          port={editingPort}
          isOpen={isPortConfigOpen}
          onOpenChange={(open) => {
            setIsPortConfigOpen(open);
            if (!open) {
              setEditingPort(null);
              setEditingPortType(null);
            }
          }}
          onSave={handleSavePort}
          onDelete={handleDeleteEditingPort}
        />
      )}
    </Sheet>
  );
});

export default SubFlowConfigSheet;
