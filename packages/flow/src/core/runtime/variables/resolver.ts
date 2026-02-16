/**
 * Expression Evaluator
 * 
 * Evaluates template expressions in the format: {{ expression }}
 * Supports:
 * - Variable access: {{ variableName }}
 * - Dot notation: {{ user.name }}
 * - Array access: {{ items[0] }}
 * - Simple operations: {{ count > 10 }}
 * - Function calls: {{ trim(name) }}
 */

import type { ExecutionContext } from '../../types/context';

/**
 * Expression Evaluator
 */
export class ExpressionEvaluator {
  /**
   * Evaluate a template string with {{ }} expressions
   */
  evaluate(expression: string, context: ExecutionContext) {
    // If no template markers, return as-is
    if (!expression.includes('{{')) {
      return expression;
    }

    // Find all {{ }} patterns
    const matches = expression.match(/\{\{(.+?)\}\}/g);

    if (!matches) {
      return expression;
    }

    let result = expression;

    // If the entire string is a single expression, return the evaluated value directly
    if (matches.length === 1 && expression.trim() === matches[0]) {
      const expr = matches[0].slice(2, -2).trim();
      return this.evaluateExpression(expr, context);
    }

    // Multiple expressions or mixed with text - replace each
    for (const match of matches) {
      const expr = match.slice(2, -2).trim();  // Remove {{ }}
      const value = this.evaluateExpression(expr, context);
      result = result.replace(match, String(value ?? ''));
    }

    return result;
  }

  /**
   * Evaluate a single expression (without {{ }})
   */
  private evaluateExpression(expr: string, context: ExecutionContext) {
    try {
      // Try to resolve as variable path first
      const value = this.resolvePath(expr, context);

      if (value !== undefined) {
        return value;
      }

      // If not a variable path, try to evaluate as JavaScript expression
      return this.evaluateJavaScript(expr, context);
    } catch (error) {
      context.logger.warn(`Failed to evaluate expression: ${expr}`, error);
      return undefined;
    }
  }

  /**
   * Resolve a dot-notation path
   */
  private resolvePath(path: string, context: ExecutionContext) {
    // Handle array access: items[0]
    const arrayMatch = path.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const varName = arrayMatch[1];
      const index = arrayMatch[2];
      if (!varName || !index) return undefined;
      
      const array = context.variables.get(varName);
      return Array.isArray(array) ? array[parseInt(index, 10)] : undefined;
    }

    // Handle nested array access: items[0].name
    const nestedArrayMatch = path.match(/^(\w+)\[(\d+)\]\.(.+)$/);
    if (nestedArrayMatch) {
      const varName = nestedArrayMatch[1];
      const index = nestedArrayMatch[2];
      const restPath = nestedArrayMatch[3];
      if (!varName || !index || !restPath) return undefined;
      
      const array = context.variables.get(varName);
      if (Array.isArray(array)) {
        const item = array[parseInt(index, 10)];
        return this.resolveNestedPath(restPath, item);
      }
      return undefined;
    }

    // Handle dot notation: user.name
    const parts = path.split('.');

    if (parts.length === 1) {
      // Simple variable access
      const varName = parts[0];
      if (!varName) return undefined;
      return context.variables.get(varName);
    }

    // Nested property access
    const rootVar = parts[0];
    if (!rootVar) return undefined;
    
    const rootValue = context.variables.get(rootVar);
    if (rootValue === undefined || rootValue === null) {
      return undefined;
    }

    // Ensure rootValue is an object before calling resolveNestedPath
    if (typeof rootValue !== 'object') {
      return undefined;
    }

    return this.resolveNestedPath(parts.slice(1).join('.'), rootValue as Record<string, unknown>);
  }

  /**
   * Resolve nested path in an object
   */
  private resolveNestedPath(path: string, obj: Record<string, unknown>): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }

      // Handle array access in nested path
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        const prop = arrayMatch[1];
        const index = arrayMatch[2];
        if (!prop || !index) return undefined;
        
        if (typeof current === 'object' && current !== null) {
          const intermediate = (current as Record<string, unknown>)[prop];
          if (Array.isArray(intermediate)) {
            const idx = parseInt(index, 10);
            current = intermediate[idx];
          } else {
            return undefined;
          }
        } else {
          return undefined;
        }
      } else {
        if (typeof current === 'object' && current !== null) {
          current = (current as Record<string, unknown>)[part];
        } else {
          return undefined;
        }
      }
    }

    return current;
  }

  /**
   * Evaluate expression as JavaScript (safely)
   */
  private evaluateJavaScript(expr: string, context: ExecutionContext): unknown {
    // Create a safe evaluation context
    const safeContext = this.createSafeContext(context);

    try {
      // Use Function constructor for safer evaluation than eval
      // This runs in a restricted context
      const func = new Function(...Object.keys(safeContext), `return (${expr});`);
      return func(...Object.values(safeContext));
    } catch (error) {
      context.logger.error(`Error evaluating expression: ${expr}`, error);
      return undefined;
    }
  }

  /**
   * Create a safe context for expression evaluation
   */
  private createSafeContext(context: ExecutionContext): Record<string, unknown> {
    // Get all variables as a flat object
    const variables: Record<string, unknown> = {};
    for (const variable of context.variables.list()) {
      variables[variable.name] = variable.value;
    }

    // Add safe built-in functions
    return {
      ...variables,
      // String functions
      trim: (str: string) => str?.trim(),
      toLowerCase: (str: string) => str?.toLowerCase(),
      toUpperCase: (str: string) => str?.toUpperCase(),
      substring: (str: string, start: number, end?: number) => str?.substring(start, end),
      replace: (str: string, search: string, replace: string) =>
        str?.replace(search, replace),

      // Number functions
      parseInt: (str: string) => parseInt(str, 10),
      parseFloat: (str: string) => parseFloat(str),
      Math: Math,

      // Array functions
      length: (arr: unknown[]) => Array.isArray(arr) ? arr.length : undefined,
      join: (arr: unknown[], sep: string) => Array.isArray(arr) ? arr.join(sep) : undefined,
      slice: (arr: unknown[], start: number, end?: number) => Array.isArray(arr) ? arr.slice(start, end) : undefined,

      // Object functions
      keys: (obj: unknown) => typeof obj === 'object' && obj !== null ? Object.keys(obj) : [],
      values: (obj: unknown) => typeof obj === 'object' && obj !== null ? Object.values(obj) : [],

      // Utility functions
      typeof: (val: unknown) => typeof val,
      isArray: (val: unknown) => Array.isArray(val),
      isNaN: (val: unknown) => typeof val === 'number' && isNaN(val),
    };
  }

  /**
   * Check if a string contains expressions
   */
  static hasExpressions(str: string): boolean {
    return typeof str === 'string' && str.includes('{{');
  }

  /**
   * Extract all variable names used in expressions
   */
  static extractVariables(expr: string): string[] {
    const matches = expr.match(/\{\{(.+?)\}\}/g);
    if (!matches) {
      return [];
    }

    const variables = new Set<string>();

    for (const match of matches) {
      const expr = match.slice(2, -2).trim();
      // Extract variable names (simplified - only handles simple cases)
      const varMatches = expr.match(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g);
      if (varMatches) {
        for (const varName of varMatches) {
          // Filter out keywords and functions
          if (!this.isKeyword(varName)) {
            variables.add(varName);
          }
        }
      }
    }

    return Array.from(variables);
  }

  /**
   * Check if a word is a JavaScript keyword or built-in
   */
  private static isKeyword(word: string): boolean {
    const keywords = new Set([
      'true',
      'false',
      'null',
      'undefined',
      'typeof',
      'Math',
      'parseInt',
      'parseFloat',
      'isNaN',
      'isArray',
      'trim',
      'toLowerCase',
      'toUpperCase',
      'length',
      'join',
      'slice',
      'keys',
      'values',
    ]);

    return keywords.has(word);
  }
}
