/**
 * Autocomplete Provider
 * 
 * Provides variable suggestions for the expression editor.
 * Supports nested property access and type-aware filtering.
 */

import type {
  VariableSchema,
  VariableDefinition,
  VariableSuggestion,
} from '../types/variable-schema';
import { SchemaHelpers } from '../types/variable-schema';

/**
 * Autocomplete options
 */
export interface AutocompleteOptions {
  /** Filter by expected type */
  expectedType?: VariableSchema['type'] | VariableSchema['type'][];
  /** Maximum number of suggestions */
  maxSuggestions?: number;
  /** Include nested properties */
  includeNested?: boolean;
  /** Maximum nesting depth */
  maxDepth?: number;
}

/**
 * Autocomplete result
 */
export interface AutocompleteResult {
  /** List of suggestions */
  suggestions: VariableSuggestion[];
  /** The query that was matched */
  query: string;
  /** Start position of the expression being completed */
  startPosition: number;
  /** Whether more results are available */
  hasMore: boolean;
}

/**
 * Built-in functions available in expressions
 */
const BUILTIN_FUNCTIONS: VariableSuggestion[] = [
  {
    name: 'trim',
    label: 'trim(str)',
    insertText: 'trim(${1:str})',
    type: '(str: string) => string',
    description: 'Remove whitespace from both ends of a string',
    source: 'builtin',
    schema: { type: 'string' },
  },
  {
    name: 'toLowerCase',
    label: 'toLowerCase(str)',
    insertText: 'toLowerCase(${1:str})',
    type: '(str: string) => string',
    description: 'Convert string to lowercase',
    source: 'builtin',
    schema: { type: 'string' },
  },
  {
    name: 'toUpperCase',
    label: 'toUpperCase(str)',
    insertText: 'toUpperCase(${1:str})',
    type: '(str: string) => string',
    description: 'Convert string to uppercase',
    source: 'builtin',
    schema: { type: 'string' },
  },
  {
    name: 'parseInt',
    label: 'parseInt(str)',
    insertText: 'parseInt(${1:str})',
    type: '(str: string) => number',
    description: 'Parse string to integer',
    source: 'builtin',
    schema: { type: 'number' },
  },
  {
    name: 'parseFloat',
    label: 'parseFloat(str)',
    insertText: 'parseFloat(${1:str})',
    type: '(str: string) => number',
    description: 'Parse string to floating point number',
    source: 'builtin',
    schema: { type: 'number' },
  },
  {
    name: 'length',
    label: 'length(arr)',
    insertText: 'length(${1:arr})',
    type: '(arr: array) => number',
    description: 'Get the length of an array',
    source: 'builtin',
    schema: { type: 'number' },
  },
  {
    name: 'join',
    label: 'join(arr, sep)',
    insertText: 'join(${1:arr}, ${2:", "})',
    type: '(arr: array, sep: string) => string',
    description: 'Join array elements into a string',
    source: 'builtin',
    schema: { type: 'string' },
  },
  {
    name: 'keys',
    label: 'keys(obj)',
    insertText: 'keys(${1:obj})',
    type: '(obj: object) => string[]',
    description: 'Get object keys as an array',
    source: 'builtin',
    schema: { type: 'array', items: { type: 'string' } },
  },
  {
    name: 'values',
    label: 'values(obj)',
    insertText: 'values(${1:obj})',
    type: '(obj: object) => any[]',
    description: 'Get object values as an array',
    source: 'builtin',
    schema: { type: 'array', items: { type: 'any' } },
  },
  {
    name: 'typeof',
    label: 'typeof(val)',
    insertText: 'typeof(${1:val})',
    type: '(val: any) => string',
    description: 'Get the type of a value',
    source: 'builtin',
    schema: { type: 'string' },
  },
  {
    name: 'isArray',
    label: 'isArray(val)',
    insertText: 'isArray(${1:val})',
    type: '(val: any) => boolean',
    description: 'Check if value is an array',
    source: 'builtin',
    schema: { type: 'boolean' },
  },
];

/**
 * Autocomplete Provider
 */
export class AutocompleteProvider {
  private variables: VariableDefinition[];

  constructor(variables: VariableDefinition[] = []) {
    this.variables = variables;
  }

  /**
   * Update the available variables
   */
  setVariables(variables: VariableDefinition[]): void {
    this.variables = variables;
  }

  /**
   * Get autocomplete suggestions for a given input
   */
  getSuggestions(
    input: string,
    cursorPosition: number,
    options: AutocompleteOptions = {}
  ): AutocompleteResult {
    const {
      expectedType,
      maxSuggestions = 50,
      includeNested = true,
      maxDepth = 3,
    } = options;

    // Find the expression being edited
    const { expression, startPosition } = this.findExpressionAtCursor(input, cursorPosition);

    if (expression === null) {
      // Not inside an expression, no suggestions
      return {
        suggestions: [],
        query: '',
        startPosition: cursorPosition,
        hasMore: false,
      };
    }

    // Parse the expression to find what we're completing
    const query = expression.trim();
    const suggestions: VariableSuggestion[] = [];

    // Check if we're completing a property path
    if (query.includes('.')) {
      const parts = query.split('.');
      const basePath = parts.slice(0, -1).join('.');
      const lastPart = parts[parts.length - 1] ?? '';

      const childSuggestions = this.getPropertySuggestions(basePath, lastPart, maxDepth);
      suggestions.push(...childSuggestions);
    } else {
      // Top-level completion
      const variableSuggestions = this.getVariableSuggestions(query, includeNested, maxDepth);
      suggestions.push(...variableSuggestions);

      // Add builtin functions
      const functionSuggestions = BUILTIN_FUNCTIONS.filter(
        f => f.name.toLowerCase().startsWith(query.toLowerCase())
      );
      suggestions.push(...functionSuggestions);
    }

    // Filter by expected type
    let filtered = suggestions;
    if (expectedType) {
      const types = Array.isArray(expectedType) ? expectedType : [expectedType];
      filtered = suggestions.filter(s => 
        types.includes(s.schema.type) || s.schema.type === 'any'
      );
    }

    // Sort by relevance
    filtered.sort((a, b) => {
      // Exact match first
      if (a.name.toLowerCase() === query.toLowerCase()) return -1;
      if (b.name.toLowerCase() === query.toLowerCase()) return 1;
      // Then by starts with
      const aStarts = a.name.toLowerCase().startsWith(query.toLowerCase());
      const bStarts = b.name.toLowerCase().startsWith(query.toLowerCase());
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      // Then alphabetically
      return a.name.localeCompare(b.name);
    });

    const hasMore = filtered.length > maxSuggestions;
    const limited = filtered.slice(0, maxSuggestions);

    return {
      suggestions: limited,
      query,
      startPosition,
      hasMore,
    };
  }

  /**
   * Find the expression being edited at cursor position
   */
  private findExpressionAtCursor(
    input: string,
    cursorPosition: number
  ): { expression: string | null; startPosition: number } {
    // Find {{ }} around cursor
    let openPos = -1;
    let closePos = -1;

    // Search backwards for {{
    for (let i = cursorPosition - 1; i >= 0; i--) {
      if (input.slice(i, i + 2) === '{{') {
        openPos = i + 2;
        break;
      }
      if (input.slice(i, i + 2) === '}}') {
        // Cursor is after a closed expression
        break;
      }
    }

    if (openPos === -1) {
      return { expression: null, startPosition: cursorPosition };
    }

    // Search forwards for }}
    for (let i = cursorPosition; i < input.length; i++) {
      if (input.slice(i, i + 2) === '}}') {
        closePos = i;
        break;
      }
      if (input.slice(i, i + 2) === '{{') {
        // Cursor is before a new expression starts
        closePos = i;
        break;
      }
    }

    if (closePos === -1) {
      closePos = input.length;
    }

    const expression = input.slice(openPos, cursorPosition);
    return { expression, startPosition: openPos };
  }

  /**
   * Get variable suggestions matching a query
   */
  private getVariableSuggestions(
    query: string,
    includeNested: boolean,
    maxDepth: number
  ): VariableSuggestion[] {
    const suggestions: VariableSuggestion[] = [];
    const lowerQuery = query.toLowerCase();

    for (const variable of this.variables) {
      if (variable.name.toLowerCase().startsWith(lowerQuery) || query === '') {
        const suggestion = this.variableToSuggestion(variable);

        // Add nested properties if applicable
        if (includeNested && SchemaHelpers.hasChildren(variable.schema)) {
          suggestion.children = this.getNestedSuggestions(
            variable.name,
            variable.schema,
            variable.sourceLabel ?? variable.source,
            maxDepth - 1
          );
        }

        suggestions.push(suggestion);
      }
    }

    return suggestions;
  }

  /**
   * Get property suggestions for a path
   */
  private getPropertySuggestions(
    basePath: string,
    query: string,
    maxDepth: number
  ): VariableSuggestion[] {
    const suggestions: VariableSuggestion[] = [];
    const lowerQuery = query.toLowerCase();

    // Find the base variable
    const baseVarName = basePath.split('.')[0]!;
    const baseVariable = this.variables.find(v => v.name === baseVarName);

    if (!baseVariable) {
      return suggestions;
    }

    // Resolve the path to get the schema at this level
    const restPath = basePath.includes('.') 
      ? basePath.split('.').slice(1).join('.')
      : '';
    
    const schema = restPath
      ? SchemaHelpers.resolvePathSchema(baseVariable.schema, restPath)
      : baseVariable.schema;

    if (!schema) {
      return suggestions;
    }

    // Get properties from the schema
    if (schema.type === 'object') {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        if (propName.toLowerCase().startsWith(lowerQuery) || query === '') {
          const fullPath = `${basePath}.${propName}`;
          const suggestion: VariableSuggestion = {
            name: propName,
            label: propName,
            insertText: propName,
            type: SchemaHelpers.getTypeString(propSchema),
            description: propSchema.description,
            source: baseVariable.sourceLabel ?? baseVariable.source,
            schema: propSchema,
          };

          if (maxDepth > 0 && SchemaHelpers.hasChildren(propSchema)) {
            suggestion.children = this.getNestedSuggestions(
              fullPath,
              propSchema,
              baseVariable.sourceLabel ?? baseVariable.source,
              maxDepth - 1
            );
          }

          suggestions.push(suggestion);
        }
      }
    } else if (schema.type === 'array') {
      // Suggest array methods and index access
      suggestions.push({
        name: '[0]',
        label: '[index]',
        insertText: '[${1:0}]',
        type: SchemaHelpers.getTypeString(schema.items),
        description: 'Access array element by index',
        source: baseVariable.sourceLabel ?? baseVariable.source,
        schema: schema.items,
      });
      suggestions.push({
        name: 'length',
        label: 'length',
        insertText: 'length',
        type: 'number',
        description: 'Array length',
        source: 'builtin',
        schema: { type: 'number' },
      });
    }

    return suggestions;
  }

  /**
   * Get nested suggestions for an object/array schema
   */
  private getNestedSuggestions(
    basePath: string,
    schema: VariableSchema,
    source: string,
    depth: number
  ): VariableSuggestion[] {
    if (depth <= 0) return [];

    const suggestions: VariableSuggestion[] = [];

    if (schema.type === 'object') {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        const fullPath = `${basePath}.${propName}`;
        const suggestion: VariableSuggestion = {
          name: propName,
          label: propName,
          insertText: `${basePath}.${propName}`,
          type: SchemaHelpers.getTypeString(propSchema),
          description: propSchema.description,
          source,
          schema: propSchema,
        };

        if (SchemaHelpers.hasChildren(propSchema)) {
          suggestion.children = this.getNestedSuggestions(
            fullPath,
            propSchema,
            source,
            depth - 1
          );
        }

        suggestions.push(suggestion);
      }
    } else if (schema.type === 'array' && schema.items.type === 'object') {
      // For arrays of objects, show the object properties
      const itemSchema = schema.items;
      for (const [propName, propSchema] of Object.entries(itemSchema.properties)) {
        suggestions.push({
          name: `[0].${propName}`,
          label: `[index].${propName}`,
          insertText: `${basePath}[\${1:0}].${propName}`,
          type: SchemaHelpers.getTypeString(propSchema),
          description: propSchema.description,
          source,
          schema: propSchema,
        });
      }
    }

    return suggestions;
  }

  /**
   * Convert a variable definition to a suggestion
   */
  private variableToSuggestion(variable: VariableDefinition): VariableSuggestion {
    return {
      name: variable.name,
      label: variable.name,
      insertText: variable.name,
      type: SchemaHelpers.getTypeString(variable.schema),
      description: variable.schema.description ?? `From ${variable.sourceLabel ?? variable.source}`,
      source: variable.sourceLabel ?? variable.source,
      schema: variable.schema,
    };
  }

  /**
   * Validate an expression against available variables
   */
  validateExpression(expression: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Extract variable references
    const matches = expression.match(/\{\{(.+?)\}\}/g);
    if (!matches) {
      return { valid: true, errors: [] };
    }

    for (const match of matches) {
      const expr = match.slice(2, -2).trim();
      const varMatch = expr.match(/^([a-zA-Z_][a-zA-Z0-9_]*)/);

      if (varMatch) {
        const varName = varMatch[1]!;
        const variable = this.variables.find(v => v.name === varName);

        if (!variable) {
          errors.push(`Unknown variable: ${varName}`);
        } else if (expr.includes('.')) {
          // Validate path
          const path = expr.slice(varName.length + 1);
          const resolvedSchema = SchemaHelpers.resolvePathSchema(variable.schema, path);
          if (!resolvedSchema) {
            errors.push(`Invalid path: ${expr}`);
          }
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

/**
 * Create an autocomplete provider with initial variables
 */
export function createAutocompleteProvider(
  variables: VariableDefinition[] = []
): AutocompleteProvider {
  return new AutocompleteProvider(variables);
}
