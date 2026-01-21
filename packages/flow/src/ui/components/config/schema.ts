/**
 * Dynamic Config Schema Types
 *
 * Defines the schema format for plugin configurations that can be
 * dynamically rendered into UI components.
 */

/**
 * Base field definition shared by all field types
 */
interface BaseFieldDef {
  /** Field key in config object */
  key: string;
  /** Display label */
  label: string;
  /** Optional description/help text */
  description?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Default value */
  defaultValue?: unknown;
  /** Condition to show this field (evaluates against config) */
  showWhen?: (config: Record<string, unknown>) => boolean;
}

/**
 * Text input field
 */
export interface TextFieldDef extends BaseFieldDef {
  type: 'text';
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
}

/**
 * Number input field
 */
export interface NumberFieldDef extends BaseFieldDef {
  type: 'number';
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

/**
 * Select/dropdown field
 */
export interface SelectFieldDef extends BaseFieldDef {
  type: 'select';
  options: { label: string; value: string | number }[];
  placeholder?: string;
}

/**
 * Checkbox/boolean field
 */
export interface CheckboxFieldDef extends BaseFieldDef {
  type: 'checkbox';
}

/**
 * Array field - repeatable list of items
 */
export interface ArrayFieldDef extends BaseFieldDef {
  type: 'array';
  /** Schema for each item in the array */
  itemSchema: ConfigFieldDef[];
  /** Minimum number of items */
  minItems?: number;
  /** Maximum number of items */
  maxItems?: number;
  /** Label for add button */
  addLabel?: string;
  /** Whether items can be reordered */
  sortable?: boolean;
}

/**
 * Group of fields with a title
 */
export interface GroupFieldDef extends BaseFieldDef {
  type: 'group';
  /** Fields in this group */
  fields: ConfigFieldDef[];
  /** Whether group is collapsible */
  collapsible?: boolean;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
}

/**
 * Code/expression editor field
 */
export interface CodeFieldDef extends BaseFieldDef {
  type: 'code';
  language?: 'javascript' | 'json' | 'text';
  placeholder?: string;
  rows?: number;
}

/**
 * Condition builder field - visual condition builder
 */
export interface ConditionFieldDef extends BaseFieldDef {
  type: 'condition';
  /** Variables available for condition building (passed at render time) */
  // Variables are injected by DynamicConfigRenderer from flow analysis
}

/**
 * Expression field - input with variable autocomplete
 */
export interface ExpressionFieldDef extends BaseFieldDef {
  type: 'expression';
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  /** Variables available for autocomplete (passed at render time) */
  // Variables are injected by DynamicConfigRenderer from flow analysis
}

/**
 * Variable selector field - dropdown to select a variable
 */
export interface VariableSelectorFieldDef extends BaseFieldDef {
  type: 'variable';
  /** Filter variables by type */
  filterType?: string[];
  placeholder?: string;
}

/**
 * Data picker field - visual field mapping builder
 */
export interface DataPickerFieldDef extends BaseFieldDef {
  type: 'dataPicker';
  /** Source schema key (references a field in config that contains source schema) */
  sourceSchemaKey?: string;
}

/**
 * Filter field - visual filter builder for arrays
 */
export interface FilterFieldDef extends BaseFieldDef {
  type: 'filter';
  /** Item schema key (references a field in config that contains item schema) */
  itemSchemaKey?: string;
}

/**
 * Union of all field definition types
 */
export type ConfigFieldDef =
  | TextFieldDef
  | NumberFieldDef
  | SelectFieldDef
  | CheckboxFieldDef
  | ArrayFieldDef
  | GroupFieldDef
  | CodeFieldDef
  | ConditionFieldDef
  | ExpressionFieldDef
  | VariableSelectorFieldDef
  | DataPickerFieldDef
  | FilterFieldDef;

/**
 * Section definition - groups related fields together
 */
export interface ConfigSectionDef {
  /** Section ID */
  id: string;
  /** Section title */
  title: string;
  /** Optional description */
  description?: string;
  /** Fields in this section */
  fields: ConfigFieldDef[];
  /** Condition to show this section */
  showWhen?: (config: Record<string, unknown>) => boolean;
}

/**
 * Complete config schema for a plugin
 */
export interface DynamicConfigSchema {
  /** Sections in the config panel */
  sections: ConfigSectionDef[];
}

/**
 * Props for the dynamic config renderer
 */
export interface DynamicConfigRendererProps {
  schema: DynamicConfigSchema;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

/**
 * Helper to create a text field definition
 */
export function textField(
  key: string,
  label: string,
  options?: Partial<Omit<TextFieldDef, 'type' | 'key' | 'label'>>
): TextFieldDef {
  return { type: 'text', key, label, ...options };
}

/**
 * Helper to create a number field definition
 */
export function numberField(
  key: string,
  label: string,
  options?: Partial<Omit<NumberFieldDef, 'type' | 'key' | 'label'>>
): NumberFieldDef {
  return { type: 'number', key, label, ...options };
}

/**
 * Helper to create a select field definition
 */
export function selectField(
  key: string,
  label: string,
  options: { label: string; value: string | number }[],
  extra?: Partial<Omit<SelectFieldDef, 'type' | 'key' | 'label' | 'options'>>
): SelectFieldDef {
  return { type: 'select', key, label, options, ...extra };
}

/**
 * Helper to create a checkbox field definition
 */
export function checkboxField(
  key: string,
  label: string,
  options?: Partial<Omit<CheckboxFieldDef, 'type' | 'key' | 'label'>>
): CheckboxFieldDef {
  return { type: 'checkbox', key, label, ...options };
}

/**
 * Helper to create an array field definition
 */
export function arrayField(
  key: string,
  label: string,
  itemSchema: ConfigFieldDef[],
  options?: Partial<Omit<ArrayFieldDef, 'type' | 'key' | 'label' | 'itemSchema'>>
): ArrayFieldDef {
  return { type: 'array', key, label, itemSchema, ...options };
}

/**
 * Helper to create a group field definition
 */
export function groupField(
  key: string,
  label: string,
  fields: ConfigFieldDef[],
  options?: Partial<Omit<GroupFieldDef, 'type' | 'key' | 'label' | 'fields'>>
): GroupFieldDef {
  return { type: 'group', key, label, fields, ...options };
}

/**
 * Helper to create a code field definition
 */
export function codeField(
  key: string,
  label: string,
  options?: Partial<Omit<CodeFieldDef, 'type' | 'key' | 'label'>>
): CodeFieldDef {
  return { type: 'code', key, label, ...options };
}

/**
 * Helper to create a condition field definition
 */
export function conditionField(
  key: string,
  label: string,
  options?: Partial<Omit<ConditionFieldDef, 'type' | 'key' | 'label'>>
): ConditionFieldDef {
  return { type: 'condition', key, label, ...options };
}

/**
 * Helper to create an expression field definition
 */
export function expressionField(
  key: string,
  label: string,
  options?: Partial<Omit<ExpressionFieldDef, 'type' | 'key' | 'label'>>
): ExpressionFieldDef {
  return { type: 'expression', key, label, ...options };
}

/**
 * Helper to create a variable selector field definition
 */
export function variableField(
  key: string,
  label: string,
  options?: Partial<Omit<VariableSelectorFieldDef, 'type' | 'key' | 'label'>>
): VariableSelectorFieldDef {
  return { type: 'variable', key, label, ...options };
}

/**
 * Helper to create a data picker field definition
 */
export function dataPickerField(
  key: string,
  label: string,
  options?: Partial<Omit<DataPickerFieldDef, 'type' | 'key' | 'label'>>
): DataPickerFieldDef {
  return { type: 'dataPicker', key, label, ...options };
}

/**
 * Helper to create a filter field definition
 */
export function filterField(
  key: string,
  label: string,
  options?: Partial<Omit<FilterFieldDef, 'type' | 'key' | 'label'>>
): FilterFieldDef {
  return { type: 'filter', key, label, ...options };
}

/**
 * Helper to create a section definition
 */
export function section(
  id: string,
  title: string,
  fields: ConfigFieldDef[],
  options?: Partial<Omit<ConfigSectionDef, 'id' | 'title' | 'fields'>>
): ConfigSectionDef {
  return { id, title, fields, ...options };
}

/**
 * Helper to create a complete config schema
 */
export function configSchema(sections: ConfigSectionDef[]): DynamicConfigSchema {
  return { sections };
}
