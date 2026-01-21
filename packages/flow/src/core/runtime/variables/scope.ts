/**
 * Scope Stack
 * 
 * Manages variable scoping for nested execution contexts
 * (e.g., sub-flows, loops, conditional blocks).
 */

import type { FlowVariable } from '../../types/flow';
import type { Scope, ScopeStack as IScopeStack } from '../../types/context';

/**
 * Scope Stack Implementation
 */
export class ScopeStack implements IScopeStack {
  private stack: Scope[] = [];

  constructor() {
    // Create global scope
    this.stack.push({
      name: 'global',
      level: 0,
      variables: new Map(),
    });
  }

  /**
   * Push a new scope onto the stack
   */
  push(name: string): void {
    this.stack.push({
      name,
      level: this.stack.length,
      variables: new Map(),
    });
  }

  /**
   * Pop the current scope from the stack
   */
  pop(): void {
    if (this.stack.length > 1) {
      // Never pop the global scope
      this.stack.pop();
    }
  }

  /**
   * Get the current scope
   */
  current(): Scope {
    const scope = this.stack[this.stack.length - 1];
    if (!scope) {
      throw new Error('No scopes in stack - this should never happen');
    }
    return scope;
  }

  /**
   * Get the global scope
   */
  global(): Scope {
    const scope = this.stack[0];
    if (!scope) {
      throw new Error('Global scope not found - this should never happen');
    }
    return scope;
  }

  /**
   * Resolve a variable by searching up the scope chain
   */
  resolve(name: string): FlowVariable | undefined {
    // Search from current scope up to global
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const scope = this.stack[i];
      if (!scope) continue;
      
      const variable = scope.variables.get(name);
      if (variable) {
        return variable;
      }
    }

    return undefined;
  }

  /**
   * Clear all scopes except global
   */
  clear(): void {
    // Keep only global scope
    const globalScope = this.stack[0];
    if (!globalScope) {
      throw new Error('Global scope not found - this should never happen');
    }
    globalScope.variables.clear();
    this.stack = [globalScope];
  }

  /**
   * Get all scopes (for debugging/snapshots)
   */
  getAllScopes(): Scope[] {
    return [...this.stack];
  }

  /**
   * Get scope by level
   */
  getScope(level: number): Scope | undefined {
    return this.stack[level];
  }

  /**
   * Get current scope level
   */
  getLevel(): number {
    return this.stack.length - 1;
  }

  /**
   * Check if we're in global scope
   */
  isGlobalScope(): boolean {
    return this.stack.length === 1;
  }

  /**
   * Clone scope stack (for snapshots)
   */
  clone(): Array<{
    name: string;
    level: number;
    variables: Record<string, any>;
  }> {
    return this.stack.map((scope) => ({
      name: scope.name,
      level: scope.level,
      variables: Object.fromEntries(
        Array.from(scope.variables.entries()).map(([key, variable]) => [
          key,
          variable.value,
        ])
      ),
    }));
  }

  /**
   * Restore scope stack from clone (for resume)
   */
  restore(
    clonedScopes: Array<{
      name: string;
      level: number;
      variables: Record<string, any>;
    }>
  ): void {
    this.clear();

    for (const clonedScope of clonedScopes) {
      if (clonedScope.level === 0) {
        // Restore global scope variables
        const globalScope = this.global();
        for (const [name, value] of Object.entries(clonedScope.variables)) {
          globalScope.variables.set(name, {
            id: `restored-${name}`,
            name,
            type: this.inferType(value),
            value,
            scope: 'global',
          });
        }
      } else {
        // Push new scope and restore variables
        this.push(clonedScope.name);
        const scope = this.current();

        for (const [name, value] of Object.entries(clonedScope.variables)) {
          scope.variables.set(name, {
            id: `restored-${name}`,
            name,
            type: this.inferType(value),
            value,
            scope: 'local',
          });
        }
      }
    }
  }

  /**
   * Infer variable type from value
   */
  private inferType(value: any): import('../../types/flow.js').VariableType {
    if (value === null || value === undefined) return 'any';
    if (Array.isArray(value)) return 'array';
    if (value instanceof File) return 'file';

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
}
