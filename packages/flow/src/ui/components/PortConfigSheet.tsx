/**
 * PortConfigSheet Component
 *
 * Sheet dialog for configuring a single SubFlow port.
 * Opened via context menu "Configure" option.
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
import { Checkbox } from '@repo/ui/components/shadcn/checkbox';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/ui/components/shadcn/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@repo/ui/components/shadcn/accordion';
import type {
  SubFlowPort,
  SubFlowInputPort,
  PortType,
  PortDataType,
  TriggerType,
  TriggerConfig,
} from '../../core/types/subflow';
import { Save, Trash2, Zap, Database, Settings2, FileCode } from 'lucide-react';
import { cn } from '@repo/ui/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface PortConfigSheetProps {
  /** The port being configured */
  port: SubFlowPort | SubFlowInputPort;
  /** Whether this is an input port */
  isInput?: boolean;
  /** Whether the sheet is open */
  isOpen: boolean;
  /** Callback when sheet should close */
  onOpenChange: (open: boolean) => void;
  /** Callback when port is updated */
  onSave?: (updates: Partial<SubFlowPort | SubFlowInputPort>) => void;
  /** Callback when port is deleted */
  onDelete?: () => void;
  /** Read-only mode */
  readOnly?: boolean;
}

// Port type options
const portTypeOptions: { value: PortType; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'trigger', label: 'Trigger', description: 'Event-based activation port', icon: <Zap className="w-4 h-4 text-green-400" /> },
  { value: 'flow', label: 'Flow', description: 'Sequential flow control port', icon: <Settings2 className="w-4 h-4 text-blue-400" /> },
  { value: 'data', label: 'Data', description: 'Data input/output port', icon: <Database className="w-4 h-4 text-purple-400" /> },
  { value: 'error', label: 'Error', description: 'Error handling port', icon: <FileCode className="w-4 h-4 text-red-400" /> },
];

// Data type options with more details
const dataTypeOptions: { value: PortDataType; label: string; description: string }[] = [
  { value: 'any', label: 'Any', description: 'Accepts any type of data' },
  { value: 'string', label: 'String', description: 'Text values' },
  { value: 'number', label: 'Number', description: 'Numeric values (int/float)' },
  { value: 'boolean', label: 'Boolean', description: 'True/false values' },
  { value: 'object', label: 'Object', description: 'JSON object with properties' },
  { value: 'array', label: 'Array', description: 'List of items' },
  { value: 'file', label: 'File', description: 'File or binary data' },
  { value: 'date', label: 'Date', description: 'Date/time values' },
];

// Trigger type options
const triggerTypeOptions: { value: TriggerType; label: string; description: string }[] = [
  { value: 'manual', label: 'Manual', description: 'Triggered by user action' },
  { value: 'webhook', label: 'Webhook', description: 'Triggered by HTTP request' },
  { value: 'schedule', label: 'Schedule', description: 'Triggered by cron schedule' },
  { value: 'event', label: 'Event', description: 'Triggered by system event' },
];

// ============================================================================
// Sub-components
// ============================================================================

interface TriggerConfigEditorProps {
  triggerConfig?: TriggerConfig;
  onChange: (config: TriggerConfig) => void;
  readOnly?: boolean;
}

const TriggerConfigEditor = memo(function TriggerConfigEditor({
  triggerConfig,
  onChange,
  readOnly,
}: TriggerConfigEditorProps) {
  const type = triggerConfig?.type ?? 'manual';
  const config = triggerConfig?.config ?? {};

  const handleTypeChange = (newType: TriggerType) => {
    onChange({ type: newType, config: {} });
  };

  const handleConfigChange = (key: string, value: unknown) => {
    onChange({
      type,
      config: { ...config, [key]: value },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Trigger Type */}
      <div className="flex flex-col gap-2">
        <Label>Trigger Type</Label>
        <Select
          value={type}
          onValueChange={(value) => handleTypeChange(value as TriggerType)}
          disabled={readOnly}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select trigger type" />
          </SelectTrigger>
          <SelectContent>
            {triggerTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex flex-col">
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Type-specific config */}
      {type === 'webhook' && (
        <div className="flex flex-col gap-3 p-3 bg-muted/30 rounded-lg">
          <div className="flex flex-col gap-2">
            <Label htmlFor="webhook-path">Endpoint Path</Label>
            <Input
              id="webhook-path"
              value={(config.path as string) ?? ''}
              onChange={(e) => handleConfigChange('path', e.target.value)}
              placeholder="/api/webhook/..."
              disabled={readOnly}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="webhook-method">HTTP Method</Label>
            <Select
              value={(config.method as string) ?? 'POST'}
              onValueChange={(value) => handleConfigChange('method', value)}
              disabled={readOnly}
            >
              <SelectTrigger id="webhook-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="webhook-auth"
              checked={(config.requireAuth as boolean) ?? false}
              onCheckedChange={(checked) => handleConfigChange('requireAuth', checked)}
              disabled={readOnly}
            />
            <Label htmlFor="webhook-auth" className="cursor-pointer">
              Require Authentication
            </Label>
          </div>
        </div>
      )}

      {type === 'schedule' && (
        <div className="flex flex-col gap-3 p-3 bg-muted/30 rounded-lg">
          <div className="flex flex-col gap-2">
            <Label htmlFor="cron-expression">Cron Expression</Label>
            <Input
              id="cron-expression"
              value={(config.cron as string) ?? ''}
              onChange={(e) => handleConfigChange('cron', e.target.value)}
              placeholder="0 * * * * (every hour)"
              disabled={readOnly}
            />
            <span className="text-xs text-muted-foreground">
              Format: minute hour day month weekday
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              value={(config.timezone as string) ?? 'UTC'}
              onValueChange={(value) => handleConfigChange('timezone', value)}
              disabled={readOnly}
            >
              <SelectTrigger id="timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="America/New_York">America/New_York</SelectItem>
                <SelectItem value="America/Los_Angeles">America/Los_Angeles</SelectItem>
                <SelectItem value="Europe/London">Europe/London</SelectItem>
                <SelectItem value="Europe/Paris">Europe/Paris</SelectItem>
                <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {type === 'event' && (
        <div className="flex flex-col gap-3 p-3 bg-muted/30 rounded-lg">
          <div className="flex flex-col gap-2">
            <Label htmlFor="event-name">Event Name</Label>
            <Input
              id="event-name"
              value={(config.eventName as string) ?? ''}
              onChange={(e) => handleConfigChange('eventName', e.target.value)}
              placeholder="user.created, file.uploaded, etc."
              disabled={readOnly}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="event-filter">Event Filter (JSON)</Label>
            <Textarea
              id="event-filter"
              value={(config.filter as string) ?? ''}
              onChange={(e) => handleConfigChange('filter', e.target.value)}
              placeholder='{"status": "active"}'
              rows={2}
              disabled={readOnly}
            />
          </div>
        </div>
      )}

      {type === 'manual' && (
        <div className="p-3 bg-muted/30 rounded-lg">
          <span className="text-sm text-muted-foreground">
            This port will be triggered manually via the UI or API call.
          </span>
        </div>
      )}
    </div>
  );
});

// ============================================================================
// PortConfigSheet Component
// ============================================================================

export const PortConfigSheet = memo(function PortConfigSheet({
  port,
  isInput = false,
  isOpen,
  onOpenChange,
  onSave,
  onDelete,
  readOnly = false,
}: PortConfigSheetProps) {
  // Local state for form - Basic
  const [name, setName] = useState(port.name);
  const [type, setType] = useState<PortType>(port.type);
  const [dataType, setDataType] = useState<PortDataType>(port.dataType ?? 'any');
  const [required, setRequired] = useState(port.required ?? false);
  const [description, setDescription] = useState(port.description ?? '');
  const [position, setPosition] = useState(port.position ?? 0);
  
  // Advanced settings
  const [defaultValue, setDefaultValue] = useState<string>(
    port.defaultValue !== undefined ? JSON.stringify(port.defaultValue, null, 2) : ''
  );
  const [jsonSchema, setJsonSchema] = useState<string>('');
  
  // Trigger config (for input ports)
  const inputPort = port as SubFlowInputPort;
  const [triggerConfig, setTriggerConfig] = useState<TriggerConfig | undefined>(
    inputPort.triggerConfig
  );

  // Reset form when port changes
  useEffect(() => {
    setName(port.name);
    setType(port.type);
    setDataType(port.dataType ?? 'any');
    setRequired(port.required ?? false);
    setDescription(port.description ?? '');
    setPosition(port.position ?? 0);
    setDefaultValue(
      port.defaultValue !== undefined ? JSON.stringify(port.defaultValue, null, 2) : ''
    );
    const ip = port as SubFlowInputPort;
    setTriggerConfig(ip.triggerConfig);
  }, [port]);

  // Handle save
  const handleSave = useCallback(() => {
    let parsedDefaultValue: unknown = undefined;
    if (defaultValue.trim()) {
      try {
        parsedDefaultValue = JSON.parse(defaultValue);
      } catch {
        parsedDefaultValue = defaultValue; // Use as string if not valid JSON
      }
    }

    const updates: Partial<SubFlowInputPort> = {
      name,
      type,
      dataType,
      required,
      description,
      position,
      defaultValue: parsedDefaultValue,
    };

    // Add trigger config for input trigger ports
    if (isInput && type === 'trigger') {
      updates.triggerConfig = triggerConfig;
    }

    onSave?.(updates);
    onOpenChange(false);
  }, [name, type, dataType, required, description, position, defaultValue, isInput, triggerConfig, onSave, onOpenChange]);

  // Handle delete
  const handleDelete = useCallback(() => {
    if (confirm(`Are you sure you want to delete port "${port.name}"?`)) {
      onDelete?.();
      onOpenChange(false);
    }
  }, [port.name, onDelete, onOpenChange]);

  const selectedPortType = portTypeOptions.find(p => p.value === type);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-[550px] sm:max-w-[550px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {selectedPortType?.icon}
            Configure {isInput ? 'Input' : 'Output'} Port
          </SheetTitle>
          <SheetDescription>
            Configure the properties and behavior of this port.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="basic" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="validation">Validation</TabsTrigger>
            {isInput && type === 'trigger' && (
              <TabsTrigger value="trigger">Trigger</TabsTrigger>
            )}
            {!(isInput && type === 'trigger') && (
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            )}
          </TabsList>
          
          {/* Basic Tab */}
          <TabsContent value="basic" className="flex flex-col gap-4 py-4">
            {/* Port Name */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="port-name">Port Name</Label>
              <Input
                id="port-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter port name"
                disabled={readOnly}
              />
            </div>

            {/* Port Type */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="port-type">Port Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {portTypeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => !readOnly && setType(option.value)}
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left',
                      type === option.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 bg-background',
                      readOnly && 'opacity-60 cursor-not-allowed'
                    )}
                  >
                    {option.icon}
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{option.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Data Type */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="data-type">Data Type</Label>
              <Select
                value={dataType}
                onValueChange={(value) => setDataType(value as PortDataType)}
                disabled={readOnly}
              >
                <SelectTrigger id="data-type">
                  <SelectValue placeholder="Select data type" />
                </SelectTrigger>
                <SelectContent>
                  {dataTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{option.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this port is for..."
                rows={2}
                disabled={readOnly}
              />
            </div>

            {/* Position */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="position">Position Order</Label>
              <Input
                id="position"
                type="number"
                min={0}
                value={position}
                onChange={(e) => setPosition(parseInt(e.target.value) || 0)}
                disabled={readOnly}
              />
              <span className="text-xs text-muted-foreground">
                Lower numbers appear higher on the node
              </span>
            </div>
          </TabsContent>
          
          {/* Validation Tab */}
          <TabsContent value="validation" className="flex flex-col gap-4 py-4">
            {/* Required */}
            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
              <Checkbox
                id="required"
                checked={required}
                onCheckedChange={(checked) => setRequired(checked as boolean)}
                disabled={readOnly}
              />
              <div className="flex flex-col">
                <Label htmlFor="required" className="cursor-pointer font-medium">
                  Required
                </Label>
                <span className="text-xs text-muted-foreground">
                  This port must be connected or have a value
                </span>
              </div>
            </div>

            {/* Default Value */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="default-value">Default Value</Label>
              <Textarea
                id="default-value"
                value={defaultValue}
                onChange={(e) => setDefaultValue(e.target.value)}
                placeholder='Enter default value (JSON supported)&#10;Examples: "text", 123, true, {"key": "value"}'
                rows={3}
                className="font-mono text-sm"
                disabled={readOnly}
              />
              <span className="text-xs text-muted-foreground">
                Value used when port is not connected. Use JSON for objects/arrays.
              </span>
            </div>

            {/* JSON Schema */}
            <Accordion type="single" collapsible>
              <AccordionItem value="schema">
                <AccordionTrigger className="text-sm">
                  Advanced: JSON Schema Validation
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-col gap-2 pt-2">
                    <Textarea
                      id="json-schema"
                      value={jsonSchema}
                      onChange={(e) => setJsonSchema(e.target.value)}
                      placeholder='{"type": "object", "properties": {...}}'
                      rows={6}
                      className="font-mono text-sm"
                      disabled={readOnly}
                    />
                    <span className="text-xs text-muted-foreground">
                      Optional JSON Schema for validating port data structure
                    </span>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>
          
          {/* Trigger Tab (for trigger ports) */}
          {isInput && type === 'trigger' && (
            <TabsContent value="trigger" className="py-4">
              <TriggerConfigEditor
                triggerConfig={triggerConfig}
                onChange={setTriggerConfig}
                readOnly={readOnly}
              />
            </TabsContent>
          )}
          
          {/* Advanced Tab */}
          {!(isInput && type === 'trigger') && (
            <TabsContent value="advanced" className="flex flex-col gap-4 py-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <span className="text-sm text-muted-foreground">
                  Additional advanced settings will be available here in future updates.
                </span>
              </div>
            </TabsContent>
          )}
        </Tabs>

        <SheetFooter className="flex justify-between gap-2 mt-6">
          {/* Delete Button */}
          {!readOnly && onDelete && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="mr-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Port
            </Button>
          )}

          {/* Save Button */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
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
      </SheetContent>
    </Sheet>
  );
});

export default PortConfigSheet;
