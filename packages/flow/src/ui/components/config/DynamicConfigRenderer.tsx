/**
 * Dynamic Config Renderer
 *
 * Renders a config panel based on a dynamic schema definition.
 * This allows plugins to define their config structure declaratively.
 */

import React from 'react';
import type {
  DynamicConfigSchema,
  ConfigSectionDef,
  ConfigFieldDef,
  TextFieldDef,
  NumberFieldDef,
  SelectFieldDef,
  CheckboxFieldDef,
  ArrayFieldDef,
  GroupFieldDef,
  CodeFieldDef,
  ConditionFieldDef,
  ExpressionFieldDef,
  VariableSelectorFieldDef,
  DataPickerFieldDef,
  FilterFieldDef,
} from './schema';
import {
  ConfigSection,
  ConfigField,
  TextInput,
  TextArea,
  NumberInput,
  Select,
  Checkbox,
  Button,
  ArrayItem,
} from './ConfigComponents';
import { ConditionBuilder } from './ConditionBuilder';
import { VariableExpressionInput } from './VariableExpressionInput';
import { DataPickerBuilder } from './DataPickerBuilder';
import type { DataPickerConfig } from './DataPickerBuilder';
import { FilterBuilder, createDefaultFilterConfig } from './FilterBuilder';
import type { FilterConfig } from './FilterBuilder';
import type { VariableDefinition, VariableSchema } from '../../../core/types/variable-schema';
import type { ConditionSchema } from '../../../core/types/condition';

interface DynamicConfigRendererProps {
  schema: DynamicConfigSchema;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  /** Variables available for condition/expression fields */
  variables?: VariableDefinition[];
}

/**
 * Main dynamic config renderer component
 */
export function DynamicConfigRenderer({
  schema,
  config,
  onChange,
  variables = [],
}: DynamicConfigRendererProps) {
  return (
    <div className="flex flex-col">
      {schema.sections.map((section) => {
        // Check if section should be shown
        if (section.showWhen && !section.showWhen(config)) {
          return null;
        }

        return (
          <SectionRenderer
            key={section.id}
            section={section}
            config={config}
            onChange={onChange}
            variables={variables}
          />
        );
      })}
    </div>
  );
}

/**
 * Section renderer
 */
function SectionRenderer({
  section,
  config,
  onChange,
  variables,
}: {
  section: ConfigSectionDef;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  variables: VariableDefinition[];
}) {
  return (
    <ConfigSection title={section.title} description={section.description}>
      {section.fields.map((field) => (
        <FieldRenderer
          key={field.key}
          field={field}
          config={config}
          onChange={onChange}
          variables={variables}
        />
      ))}
    </ConfigSection>
  );
}

/**
 * Field renderer - dispatches to specific field type renderers
 */
function FieldRenderer({
  field,
  config,
  onChange,
  parentPath = '',
  variables = [],
}: {
  field: ConfigFieldDef;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  parentPath?: string;
  variables?: VariableDefinition[];
}) {
  // Check if field should be shown
  if (field.showWhen && !field.showWhen(config)) {
    return null;
  }

  const fullPath = parentPath ? `${parentPath}.${field.key}` : field.key;

  switch (field.type) {
    case 'text':
      return (
        <TextFieldRenderer
          field={field}
          config={config}
          onChange={onChange}
          path={fullPath}
        />
      );
    case 'number':
      return (
        <NumberFieldRenderer
          field={field}
          config={config}
          onChange={onChange}
          path={fullPath}
        />
      );
    case 'select':
      return (
        <SelectFieldRenderer
          field={field}
          config={config}
          onChange={onChange}
          path={fullPath}
        />
      );
    case 'checkbox':
      return (
        <CheckboxFieldRenderer
          field={field}
          config={config}
          onChange={onChange}
          path={fullPath}
        />
      );
    case 'array':
      return (
        <ArrayFieldRenderer
          field={field}
          config={config}
          onChange={onChange}
          path={fullPath}
          variables={variables}
        />
      );
    case 'group':
      return (
        <GroupFieldRenderer
          field={field}
          config={config}
          onChange={onChange}
          path={fullPath}
          variables={variables}
        />
      );
    case 'code':
      return (
        <CodeFieldRenderer
          field={field}
          config={config}
          onChange={onChange}
          path={fullPath}
        />
      );
    case 'condition':
      return (
        <ConditionFieldRenderer
          field={field}
          config={config}
          onChange={onChange}
          path={fullPath}
          variables={variables}
        />
      );
    case 'expression':
      return (
        <ExpressionFieldRenderer
          field={field}
          config={config}
          onChange={onChange}
          path={fullPath}
          variables={variables}
        />
      );
    case 'variable':
      return (
        <VariableSelectorFieldRenderer
          field={field}
          config={config}
          onChange={onChange}
          path={fullPath}
          variables={variables}
        />
      );
    case 'dataPicker':
      return (
        <DataPickerFieldRenderer
          field={field as DataPickerFieldDef}
          config={config}
          onChange={onChange}
          path={fullPath}
          variables={variables}
        />
      );
    case 'filter':
      return (
        <FilterFieldRenderer
          field={field as FilterFieldDef}
          config={config}
          onChange={onChange}
          path={fullPath}
          variables={variables}
        />
      );
    default:
      return null;
  }
}

/**
 * Get nested value from config
 */
function getValue<T>(
  config: Record<string, unknown>,
  path: string,
  defaultValue: T
): T {
  const parts = path.split('.');
  let current: unknown = config;

  for (const part of parts) {
    if (current == null || typeof current !== 'object') {
      return defaultValue;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return (current as T) ?? defaultValue;
}

/**
 * Set nested value in config
 */
function setValue(
  config: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> {
  const parts = path.split('.');
  const result = { ...config };

  if (parts.length === 0) {
    return result;
  }

  let current: Record<string, unknown> = result;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (part === undefined) continue;
    if (current[part] == null || typeof current[part] !== 'object') {
      current[part] = {};
    } else {
      current[part] = { ...(current[part] as Record<string, unknown>) };
    }
    current = current[part] as Record<string, unknown>;
  }

  const lastPart = parts[parts.length - 1];
  if (lastPart !== undefined) {
    current[lastPart] = value;
  }

  return result;
}

/**
 * Text field renderer
 */
function TextFieldRenderer({
  field,
  config,
  onChange,
  path,
}: {
  field: TextFieldDef;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  path: string;
}) {
  const defaultVal = (field.defaultValue as string | undefined) ?? '';
  const value = getValue<string>(config, path, defaultVal);

  const handleChange = (newValue: string) => {
    onChange(setValue(config, path, newValue));
  };

  if (field.multiline) {
    return (
      <ConfigField
        label={field.label}
        description={field.description}
        required={field.required}
      >
        <TextArea
          value={value}
          onChange={handleChange}
          placeholder={field.placeholder}
          rows={field.rows}
        />
      </ConfigField>
    );
  }

  return (
    <ConfigField
      label={field.label}
      description={field.description}
      required={field.required}
    >
      <TextInput
        value={value}
        onChange={handleChange}
        placeholder={field.placeholder}
      />
    </ConfigField>
  );
}

/**
 * Number field renderer
 */
function NumberFieldRenderer({
  field,
  config,
  onChange,
  path,
}: {
  field: NumberFieldDef;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  path: string;
}) {
  const defaultVal = (field.defaultValue as number | undefined) ?? 0;
  const value = getValue<number>(config, path, defaultVal);

  const handleChange = (newValue: number) => {
    onChange(setValue(config, path, newValue));
  };

  return (
    <ConfigField
      label={field.label}
      description={field.description}
      required={field.required}
    >
      <NumberInput
        value={value}
        onChange={handleChange}
        min={field.min}
        max={field.max}
        step={field.step}
        placeholder={field.placeholder}
      />
    </ConfigField>
  );
}

/**
 * Select field renderer
 */
function SelectFieldRenderer({
  field,
  config,
  onChange,
  path,
}: {
  field: SelectFieldDef;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  path: string;
}) {
  const defaultVal = (field.defaultValue as string | undefined) ?? '';
  const value = getValue<string>(config, path, defaultVal);

  const handleChange = (newValue: string) => {
    onChange(setValue(config, path, newValue));
  };

  return (
    <ConfigField
      label={field.label}
      description={field.description}
      required={field.required}
    >
      <Select
        value={value}
        onChange={handleChange}
        options={field.options.map((o) => ({
          label: o.label,
          value: String(o.value),
        }))}
        placeholder={field.placeholder}
      />
    </ConfigField>
  );
}

/**
 * Checkbox field renderer
 */
function CheckboxFieldRenderer({
  field,
  config,
  onChange,
  path,
}: {
  field: CheckboxFieldDef;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  path: string;
}) {
  const defaultVal = (field.defaultValue as boolean | undefined) ?? false;
  const value = getValue<boolean>(config, path, defaultVal);

  const handleChange = (newValue: boolean) => {
    onChange(setValue(config, path, newValue));
  };

  return <Checkbox checked={value} onChange={handleChange} label={field.label} />;
}

/**
 * Array field renderer
 */
function ArrayFieldRenderer({
  field,
  config,
  onChange,
  path,
  variables = [],
}: {
  field: ArrayFieldDef;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  path: string;
  variables?: VariableDefinition[];
}) {
  const defaultItems = field.defaultValue as unknown[] | undefined;
  const items = getValue<unknown[]>(config, path, defaultItems ?? []);

  const handleAddItem = () => {
    // Create new item with default values from schema
    const newItem: Record<string, unknown> = {};
    for (const itemField of field.itemSchema) {
      if (itemField.defaultValue !== undefined) {
        newItem[itemField.key] = itemField.defaultValue;
      } else if (itemField.type === 'text' || itemField.type === 'code') {
        newItem[itemField.key] = '';
      } else if (itemField.type === 'number') {
        newItem[itemField.key] = 0;
      } else if (itemField.type === 'checkbox') {
        newItem[itemField.key] = false;
      }
    }

    // Generate a unique ID if the schema has an id field
    const hasIdField = field.itemSchema.some((f) => f.key === 'id');
    if (hasIdField) {
      newItem.id = `item-${String(Date.now())}`;
    }

    onChange(setValue(config, path, [...items, newItem]));
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(setValue(config, path, newItems));
  };

  const handleItemChange = (
    index: number,
    itemConfig: Record<string, unknown>
  ) => {
    const newItems = [...items];
    newItems[index] = itemConfig;
    onChange(setValue(config, path, newItems));
  };

  const canRemove = (field.minItems ?? 0) < items.length;
  const canAdd = field.maxItems === undefined || items.length < field.maxItems;

  return (
    <ConfigField
      label={field.label}
      description={field.description}
      required={field.required}
    >
      <div className="flex flex-col gap-3 pl-4">
        {items.map((item, index) => (
          <ArrayItem
            key={index}
            index={index}
            onRemove={() => {
              handleRemoveItem(index);
            }}
            canRemove={canRemove}
          >
            {field.itemSchema.map((itemField) => (
              <FieldRenderer
                key={itemField.key}
                field={itemField}
                config={item as Record<string, unknown>}
                onChange={(newItemConfig) => {
                  handleItemChange(index, newItemConfig);
                }}
                variables={variables}
              />
            ))}
          </ArrayItem>
        ))}

        {canAdd && (
          <Button variant="secondary" size="sm" onClick={handleAddItem}>
            {field.addLabel ?? '+ Add Item'}
          </Button>
        )}
      </div>
    </ConfigField>
  );
}

/**
 * Group field renderer
 */
function GroupFieldRenderer({
  field,
  config,
  onChange,
  path,
  variables = [],
}: {
  field: GroupFieldDef;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  path: string;
  variables?: VariableDefinition[];
}) {
  return (
    <ConfigSection
      title={field.label}
      description={field.description}
      collapsible={field.collapsible}
      defaultCollapsed={field.defaultCollapsed}
    >
      {field.fields.map((groupField) => (
        <FieldRenderer
          key={groupField.key}
          field={groupField}
          config={config}
          onChange={onChange}
          parentPath={path}
          variables={variables}
        />
      ))}
    </ConfigSection>
  );
}

/**
 * Code field renderer
 */
function CodeFieldRenderer({
  field,
  config,
  onChange,
  path,
}: {
  field: CodeFieldDef;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  path: string;
}) {
  const defaultVal = (field.defaultValue as string | undefined) ?? '';
  const value = getValue<string>(config, path, defaultVal);

  const handleChange = (newValue: string) => {
    onChange(setValue(config, path, newValue));
  };

  return (
    <ConfigField
      label={field.label}
      description={field.description}
      required={field.required}
    >
      <TextArea
        value={value}
        onChange={handleChange}
        placeholder={field.placeholder}
        rows={field.rows ?? 4}
        className="font-mono text-sm"
      />
    </ConfigField>
  );
}

/**
 * Condition field renderer - uses the visual ConditionBuilder
 */
function ConditionFieldRenderer({
  field,
  config,
  onChange,
  path,
  variables = [],
}: {
  field: ConditionFieldDef;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  path: string;
  variables?: VariableDefinition[];
}) {
  const value = getValue<ConditionSchema | null>(config, path, null);

  const handleChange = (newValue: ConditionSchema) => {
    onChange(setValue(config, path, newValue));
  };

  return (
    <ConfigField
      label={field.label}
      description={field.description}
      required={field.required}
    >
      <ConditionBuilder
        value={value}
        onChange={handleChange}
        variables={variables}
      />
    </ConfigField>
  );
}

/**
 * Expression field renderer - uses VariableExpressionInput for autocomplete
 */
function ExpressionFieldRenderer({
  field,
  config,
  onChange,
  path,
  variables = [],
}: {
  field: ExpressionFieldDef;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  path: string;
  variables?: VariableDefinition[];
}) {
  const defaultVal = (field.defaultValue as string | undefined) ?? '';
  const value = getValue<string>(config, path, defaultVal);

  const handleChange = (newValue: string) => {
    onChange(setValue(config, path, newValue));
  };

  return (
    <ConfigField
      label={field.label}
      description={field.description}
      required={field.required}
    >
      <VariableExpressionInput
        value={value}
        onChange={handleChange}
        variables={variables}
        placeholder={field.placeholder}
        multiline={field.multiline}
        rows={field.rows}
      />
    </ConfigField>
  );
}

/**
 * Variable selector field renderer - dropdown to select a variable path
 */
function VariableSelectorFieldRenderer({
  field,
  config,
  onChange,
  path,
  variables = [],
}: {
  field: VariableSelectorFieldDef;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  path: string;
  variables?: VariableDefinition[];
}) {
  const defaultVal = (field.defaultValue as string | undefined) ?? '';
  const value = getValue<string>(config, path, defaultVal);

  const handleChange = (newValue: string) => {
    onChange(setValue(config, path, newValue));
  };

  // Filter variables by type if specified
  const filteredVars = field.filterType
    ? variables.filter((v) => field.filterType?.includes(v.schema.type))
    : variables;

  // Create options from filtered variables
  const options = filteredVars
    .filter(
      (v): v is VariableDefinition & { path: string } => v.path !== undefined
    )
    .map((v) => ({
      label: `${v.name} (${v.schema.type})`,
      value: v.path,
    }));

  return (
    <ConfigField
      label={field.label}
      description={field.description}
      required={field.required}
    >
      <Select
        value={value}
        onChange={handleChange}
        options={options}
        placeholder={field.placeholder ?? 'Select a variable...'}
      />
    </ConfigField>
  );
}

/**
 * Data picker field renderer - visual field mapping builder
 */
function DataPickerFieldRenderer({
  field,
  config,
  onChange,
  path,
  variables = [],
}: {
  field: DataPickerFieldDef;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  path: string;
  variables?: VariableDefinition[];
}) {
  const defaultVal: DataPickerConfig = { mode: 'pick', picks: [] };
  const value = getValue<DataPickerConfig>(config, path, defaultVal);

  const handleChange = (newValue: DataPickerConfig) => {
    onChange(setValue(config, path, newValue));
  };

  // Get source schema from config or variables if sourceSchemaKey is provided
  let sourceSchema: VariableSchema | undefined;
  if (field.sourceSchemaKey) {
    const schemaFromConfig = getValue<VariableSchema | undefined>(
      config,
      field.sourceSchemaKey,
      undefined
    );
    sourceSchema = schemaFromConfig;
  }

  // If no schema from config, try to derive from first variable
  if (!sourceSchema && variables.length > 0) {
    sourceSchema = variables[0]?.schema;
  }

  return (
    <ConfigField
      label={field.label}
      description={field.description}
      required={field.required}
    >
      <DataPickerBuilder
        value={value}
        onChange={handleChange}
        variables={variables}
        sourceSchema={sourceSchema}
      />
    </ConfigField>
  );
}

/**
 * Filter field renderer - visual filter builder for arrays
 */
function FilterFieldRenderer({
  field,
  config,
  onChange,
  path,
  variables = [],
}: {
  field: FilterFieldDef;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  path: string;
  variables?: VariableDefinition[];
}) {
  const defaultVal = createDefaultFilterConfig();
  const value = getValue<FilterConfig>(config, path, defaultVal);

  const handleChange = (newValue: FilterConfig) => {
    onChange(setValue(config, path, newValue));
  };

  // Get item schema from config or variables if itemSchemaKey is provided
  let itemSchema: VariableSchema | undefined;
  if (field.itemSchemaKey) {
    const schemaFromConfig = getValue<VariableSchema | undefined>(
      config,
      field.itemSchemaKey,
      undefined
    );
    itemSchema = schemaFromConfig;
  }

  // If no schema from config, try to derive from first array variable
  if (!itemSchema && variables.length > 0) {
    const arrayVar = variables.find((v) => v.schema.type === 'array');
    if (arrayVar?.schema.type === 'array' && 'items' in arrayVar.schema) {
      itemSchema = arrayVar.schema.items;
    }
  }

  return (
    <ConfigField
      label={field.label}
      description={field.description}
      required={field.required}
    >
      <FilterBuilder
        value={value}
        onChange={handleChange}
        itemSchema={itemSchema}
        variables={variables}
      />
    </ConfigField>
  );
}
