/**
 * Constant Plugin Configuration UI
 *
 * UI component for configuring constant variables in the flow editor.
 */

import React, { useState } from 'react';
import { Button } from '@repo/ui/components/shadcn/button';
import { Input } from '@repo/ui/components/shadcn/input';
import { Label } from '@repo/ui/components/shadcn/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/shadcn/select';
import { Textarea } from '@repo/ui/components/shadcn/textarea';
import { Trash2, Plus } from 'lucide-react';
import type { ConstantConfig, ConstantDefinition } from '../../../core/plugins/actions/constant';
import type { NodeConfigProps } from '../../../core/types/plugin';

export function ConstantConfig({ config, onChange }: NodeConfigProps) {
  // Ensure config has proper structure
  const value: ConstantConfig = {
    constants: [],
    ...(config as Partial<ConstantConfig>),
  };
  const [namespace, setNamespace] = useState(value.namespace ?? '');

  const addConstant = () => {
    const newConstant: ConstantDefinition = {
      key: '',
      value: '',
      type: 'string',
    };

    onChange({
      ...value,
      constants: [...value.constants, newConstant],
    } as ConstantConfig);
  };

  const removeConstant = (index: number) => {
    onChange({
      ...value,
      constants: value.constants.filter((_, i) => i !== index),
    } as ConstantConfig);
  };

  const updateConstant = (index: number, updates: Partial<ConstantDefinition>) => {
    const updated = [...value.constants];
    const current = updated[index];
    if (!current) return;
    updated[index] = { ...current, ...updates } as ConstantDefinition;
    onChange({
      ...value,
      constants: updated,
    } as ConstantConfig);
  };

  const updateNamespace = (newNamespace: string) => {
    setNamespace(newNamespace);
    onChange({
      ...value,
      namespace: newNamespace || undefined,
    } as ConstantConfig);
  };

  const parseValue = (rawValue: string, type: ConstantDefinition['type']): unknown => {
    switch (type) {
      case 'number':
        return Number(rawValue);
      case 'boolean':
        return rawValue === 'true';
      case 'null':
        return null;
      case 'array':
        try {
          return JSON.parse(rawValue) as unknown[];
        } catch {
          return [];
        }
      case 'object':
        try {
          return JSON.parse(rawValue) as Record<string, unknown>;
        } catch {
          return {};
        }
      default:
        return rawValue;
    }
  };

  const stringifyValue = (val: unknown, type: ConstantDefinition['type']): string => {
    if (type === 'array' || type === 'object') {
      return JSON.stringify(val, null, 2);
    }
    if (type === 'null') {
      return 'null';
    }
    if (type === 'boolean') {
      return String(val);
    }
    return String(val);
  };

  return (
    <div className="space-y-4">
      {/* Namespace */}
      <div className="space-y-2">
        <Label htmlFor="namespace">Namespace (Optional)</Label>
        <Input
          id="namespace"
          placeholder="e.g., api, config, settings"
          value={namespace}
          onChange={(e) => {
            updateNamespace(e.target.value);
          }}
        />
        <p className="text-xs text-muted-foreground">
          Groups constants under a namespace (e.g., namespace.key)
        </p>
      </div>

      {/* Constants List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Constants</Label>
          <Button onClick={addConstant} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-1" />
            Add Constant
          </Button>
        </div>

        {value.constants.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg">
            No constants defined. Click "Add Constant" to create one.
          </div>
        )}

        {value.constants.map((constant, index) => {
          const idx = String(index);
          return (
          <div
            key={index}
            className="p-4 border rounded-lg space-y-3 bg-muted/20"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 grid grid-cols-2 gap-3">
                {/* Key */}
                <div className="space-y-1">
                  <Label htmlFor={`key-${idx}`} className="text-xs">
                    Key
                  </Label>
                  <Input
                    id={`key-${idx}`}
                    placeholder="e.g., apiUrl"
                    value={constant.key}
                    onChange={(e) => {
                      updateConstant(index, { key: e.target.value });
                    }}
                  />
                </div>

                {/* Type */}
                <div className="space-y-1">
                  <Label htmlFor={`type-${idx}`} className="text-xs">
                    Type
                  </Label>
                  <Select
                    value={constant.type}
                    onValueChange={(type) => {
                      updateConstant(index, {
                        type: type as ConstantDefinition['type'],
                      });
                    }}
                  >
                    <SelectTrigger id={`type-${idx}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="string">String</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="boolean">Boolean</SelectItem>
                      <SelectItem value="null">Null</SelectItem>
                      <SelectItem value="array">Array</SelectItem>
                      <SelectItem value="object">Object</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Delete Button */}
              <Button
                onClick={() => {
                  removeConstant(index);
                }}
                size="icon"
                variant="ghost"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Value */}
            <div className="space-y-1">
              <Label htmlFor={`value-${idx}`} className="text-xs">
                Value
              </Label>
              {constant.type === 'boolean' ? (
                <Select
                  value={constant.value === true ? 'true' : 'false'}
                  onValueChange={(val) => {
                    updateConstant(index, { value: val === 'true' });
                  }}
                >
                  <SelectTrigger id={`value-${idx}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">true</SelectItem>
                    <SelectItem value="false">false</SelectItem>
                  </SelectContent>
                </Select>
              ) : constant.type === 'array' || constant.type === 'object' ? (
                <Textarea
                  id={`value-${idx}`}
                  placeholder={
                    constant.type === 'array'
                      ? '["item1", "item2"]'
                      : '{"key": "value"}'
                  }
                  value={stringifyValue(constant.value, constant.type)}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                    updateConstant(index, {
                      value: parseValue(e.target.value, constant.type) as ConstantDefinition['value'],
                    });
                  }}
                  className="font-mono text-xs"
                  rows={4}
                />
              ) : constant.type === 'null' ? (
                <Input id={`value-${idx}`} value="null" disabled />
              ) : (
                <Input
                  id={`value-${idx}`}
                  type={constant.type === 'number' ? 'number' : 'text'}
                  placeholder={
                    constant.type === 'number'
                      ? 'e.g., 42'
                      : 'e.g., Hello World'
                  }
                  value={stringifyValue(constant.value, constant.type)}
                  onChange={(e) => {
                    updateConstant(index, {
                      value: parseValue(e.target.value, constant.type) as ConstantDefinition['value'],
                    });
                  }}
                />
              )}
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label htmlFor={`desc-${idx}`} className="text-xs">
                Description (Optional)
              </Label>
              <Input
                id={`desc-${idx}`}
                placeholder="What is this constant for?"
                value={constant.description ?? ''}
                onChange={(e) => {
                  updateConstant(index, {
                    description: e.target.value || undefined,
                  });
                }}
              />
            </div>
          </div>
        );
        })}
      </div>
    </div>
  );
}
