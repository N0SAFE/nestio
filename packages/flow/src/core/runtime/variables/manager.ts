/**
 * Variable Manager
 * 
 * Core runtime component for managing flow variables with scoping support.
 * Variables are NOT plugins - they are fundamental infrastructure accessible
 * to all plugins through the ExecutionContext.
 */

import type {
  FlowVariable,
  VariableType,
  VariableScope,
} from '../../types/flow';
import type {
  VariableManager as IVariableManager,
  ScopeStack,
} from '../../types/context';
import { nanoid } from 'nanoid';

/**
 * Variable Manager Implementation
 */
export class VariableManager implements IVariableManager {
  private variables: Map<string, FlowVariable>;
  private scopeStack: ScopeStack;

  constructor(scopeStack: ScopeStack) {
    this.variables = new Map();
    this.scopeStack = scopeStack;
  }

  /**
   * Set a variable value
   */
  set(name: string, value: unknown, type?: VariableType): void {
    const scope = this.scopeStack.current();
    const variableType = type || this.inferType(value);

    const variable: FlowVariable = {
      id: nanoid(),
      name,
      type: variableType,
      value,
      scope: scope.level === 0 ? 'global' : 'local',
    };

    // Store in current scope
    scope.variables.set(name, variable);

    // Also store in global map for quick access
    this.variables.set(name, variable);
  }

  /**
   * Get a variable value
   */
  get<T>(name: string): T | undefined {
    const variable = this.resolve(name);
    return variable?.value as T | undefined;
  }

  /**
   * Resolve a variable (checks scope stack)
   */
  resolve(name: string): FlowVariable | undefined {
    // First check scope stack (respects scoping)
    const scopedVariable = this.scopeStack.resolve(name);
    if (scopedVariable) {
      return scopedVariable;
    }

    // Fall back to global map
    return this.variables.get(name);
  }

  /**
   * Check if variable exists
   */
  exists(name: string): boolean {
    return this.resolve(name) !== undefined;
  }

  /**
   * Delete a variable
   */
  delete(name: string): void {
    // Remove from current scope
    const scope = this.scopeStack.current();
    scope.variables.delete(name);

    // Remove from global map
    this.variables.delete(name);
  }

  /**
   * Clear all variables
   */
  clear(): void {
    this.variables.clear();
    this.scopeStack.clear();
  }

  /**
   * List all variables
   */
  list(): FlowVariable[] {
    return Array.from(this.variables.values());
  }

  /**
   * Infer variable type from value
   */
  private inferType(value: unknown): VariableType {
    if (value === null || value === undefined) {
      return 'any';
    }

    if (Array.isArray(value)) {
      return 'array';
    }

    if (value instanceof File) {
      return 'file';
    }

    const typeofValue = typeof value;

    switch (typeofValue) {
      case 'string':
        return 'string';
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'object':
        return 'object';
      default:
        return 'any';
    }
  }

  /**
   * Get variable with type checking
   */
  getTyped<T>(name: string, expectedType: VariableType): T | undefined {
    const variable = this.resolve(name);

    if (!variable) {
      return undefined;
    }

    if (variable.type !== expectedType && variable.type !== 'any') {
      throw new Error(
        `Variable "${name}" has type "${variable.type}" but expected "${expectedType}"`
      );
    }

    return variable.value as T;
  }

  /**
   * Set multiple variables at once
   */
  setMany(variables: Record<string, unknown>): void {
    for (const [name, value] of Object.entries(variables)) {
      this.set(name, value);
    }
  }

  /**
   * Get multiple variables at once
   */
  getMany(names: string[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const name of names) {
      result[name] = this.get(name);
    }

    return result;
  }

  /**
   * Clone all variables (for snapshots)
   */
  clone(): Map<string, FlowVariable> {
    const cloned = new Map<string, FlowVariable>();

    for (const [name, variable] of this.variables.entries()) {
      cloned.set(name, {
        ...variable,
        value: this.deepClone(variable.value),
      });
    }

    return cloned;
  }

  /**
   * Deep clone a value
   */
  private deepClone<T>(value: T): T {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value !== 'object') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.deepClone(item)) as T;
    }

    if (value instanceof Date) {
      return new Date(value.getTime()) as T;
    }

    if (value instanceof File) {
      // Files can't be cloned, return reference
      return value;
    }

    // Plain object
    const cloned = {} as T;
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        cloned[key] = this.deepClone(value[key]);
      }
    }

    return cloned;
  }
}
