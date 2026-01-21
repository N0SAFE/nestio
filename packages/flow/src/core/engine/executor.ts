/**
 * Flow Executor
 * 
 * Main execution engine for flows.
 * Handles node execution, edge traversal, and flow control.
 */

import type { Flow, FlowNode, FlowEdge } from '../types/flow';
import type { ExecutionContext as IExecutionContext } from '../types/context';
import { ExecutionContext } from './context';
import { VariableManager } from '../runtime/variables/manager';
import { ScopeStack } from '../runtime/variables/scope';
import { ExpressionEvaluator } from '../runtime/variables/resolver';
import { pluginRegistry } from '../plugins/registry';
import { nanoid } from 'nanoid';

/**
 * Flow Executor Options
 */
export interface ExecutorOptions {
  /**
   * Maximum execution time in milliseconds
   */
  timeout?: number;

  /**
   * Initial variables
   */
  initialVariables?: Record<string, any>;

  /**
   * Debug mode
   */
  debug?: boolean;
}

/**
 * Flow Executor Implementation
 */
export class FlowExecutor {
  protected context: ExecutionContext;
  protected evaluator: ExpressionEvaluator;
  protected options: ExecutorOptions;

  constructor(
    flowId: string,
    executionId: string,
    options: ExecutorOptions = {}
  ) {
    const scopes = new ScopeStack();
    const variables = new VariableManager(scopes);

    this.context = new ExecutionContext(flowId, executionId, variables, scopes);
    this.evaluator = new ExpressionEvaluator();
    this.options = options;

    // Set initial variables
    if (options.initialVariables) {
      for (const [name, value] of Object.entries(options.initialVariables)) {
        this.context.variables.set(name, value);
      }
    }
  }

  /**
   * Execute a flow
   */
  async execute(flow: Flow): Promise<void> {
    try {
      this.context.state.status = 'running';
      this.context.state.startTime = new Date();

      this.context.events.emit('execution:start', {
        executionId: this.context.executionId,
        flowId: this.context.flowId,
      });

      // Find trigger nodes (entry points)
      const triggers = flow.nodes.filter(n => n.type === 'trigger');

      if (triggers.length === 0) {
        throw new Error('No trigger nodes found in flow');
      }

      // Execute from each trigger
      for (const trigger of triggers) {
        await this.executeNode(trigger, flow);
      }

      this.context.state.status = 'completed';
      this.context.state.endTime = new Date();

      this.context.events.emit('execution:complete', {
        executionId: this.context.executionId,
        flowId: this.context.flowId,
      });
    } catch (error) {
      this.context.state.status = 'failed';
      this.context.state.error = error as Error;
      this.context.state.endTime = new Date();

      this.context.events.emit('execution:failed', {
        executionId: this.context.executionId,
        flowId: this.context.flowId,
        error,
      });

      throw error;
    }
  }

  /**
   * Execute a single node
   */
  protected async executeNode(node: FlowNode, flow: Flow): Promise<void> {
    // Check if should skip
    if (this.context.shouldSkipNode(node.id)) {
      this.context.events.emit('node:skipped', { node, context: this.context });
      await this.executeNextNodes(node, flow);
      return;
    }

    // Check if should stop
    if (this.context.shouldStopAtNode(node.id)) {
      this.context.state.status = 'paused';
      this.context.events.emit('execution:paused', {
        executionId: this.context.executionId,
        nodeId: node.id,
      });
      return;
    }

    // Update state
    this.context.state.currentNode = node.id;
    this.context.state.nodeStartTime = Date.now();

    this.context.events.emit('node:start', { node, context: this.context });

    try {
      // Prepare inputs
      this.prepareInputs(node);

      // Execute node (plugin execution will be implemented later)
      const outputs = await this.executeNodePlugin(node);

      // Store outputs
      node.data.outputs = outputs;
      this.context.outputs = outputs;

      // Add to execution path
      this.context.addToPath(node.id, node.label, 'success');

      this.context.events.emit('node:success', { node, outputs, context: this.context });

      // Execute next nodes
      await this.executeNextNodes(node, flow);
    } catch (error) {
      this.context.addToPath(node.id, node.label, 'error');

      this.context.events.emit('node:error', { node, error, context: this.context });

      throw error;
    }
  }

  /**
   * Execute node plugin (placeholder for plugin system)
   */
  protected async executeNodePlugin(node: FlowNode): Promise<Record<string, unknown>> {
    // Get plugin from registry
    const plugin = pluginRegistry.get(node.pluginId);

    if (!plugin) {
      throw new Error(`Plugin ${node.pluginId} not found`);
    }

    // Execute plugin
    try {
      const result = await plugin.execute(this.context, node.config);
      return result as Record<string, unknown>;
    } catch (error) {
      this.context.logger.error(`Error executing plugin ${node.pluginId}:`, error);
      throw error;
    }
  }

  /**
   * Prepare node inputs by resolving expressions
   */
  protected prepareInputs(node: FlowNode): void {
    const inputs: Record<string, any> = {};

    for (const [key, value] of Object.entries(node.data.inputs)) {
      if (typeof value === 'string' && value.includes('{{')) {
        // Resolve expression
        inputs[key] = this.evaluator.evaluate(value, this.context);
      } else {
        inputs[key] = value;
      }
    }

    this.context.inputs = inputs;
  }

  /**
   * Execute next nodes based on edges
   */
  protected async executeNextNodes(node: FlowNode, flow: Flow): Promise<void> {
    const outgoingEdges = flow.edges.filter(e => e.source === node.id);

    // Special handling for condition nodes
    if (node.pluginId === 'if-condition') {
      await this.executeIfCondition(node, outgoingEdges, flow);
      return;
    }

    if (node.pluginId === 'switch-condition') {
      await this.executeSwitchCondition(node, outgoingEdges, flow);
      return;
    }

    // Special handling for loop nodes
    if (node.pluginId === 'for-loop') {
      await this.executeForLoop(node, outgoingEdges, flow);
      return;
    }

    if (node.pluginId === 'while-loop') {
      await this.executeWhileLoop(node, outgoingEdges, flow);
      return;
    }

    if (node.pluginId === 'foreach-loop') {
      await this.executeForEachLoop(node, outgoingEdges, flow);
      return;
    }

    // Regular flow
    for (const edge of outgoingEdges) {
      // Check edge condition if present
      if (edge.condition) {
        const conditionResult = this.evaluator.evaluate(
          edge.condition.expression,
          this.context
        );

        if (!conditionResult) {
          continue; // Skip this edge
        }
      }

      // Find target node
      const targetNode = flow.nodes.find(n => n.id === edge.target);
      if (!targetNode) {
        console.warn(`Target node ${edge.target} not found`);
        continue;
      }

      this.context.events.emit('edge:traversed', { edge, context: this.context });

      // Execute target node
      await this.executeNode(targetNode, flow);
    }
  }

  /**
   * Execute if/else-if/else condition node
   */
  protected async executeIfCondition(
    node: FlowNode,
    edges: FlowEdge[],
    flow: Flow
  ): Promise<void> {
    const config = node.config as {
      ifCondition: string;
      ifHandle: string;
      elseIfBranches: Array<{ id: string; condition: string; handle: string }>;
      elseHandle: string;
    };

    // Evaluate if condition
    const ifResult = this.evaluator.evaluate(config.ifCondition, this.context);
    if (ifResult) {
      // Execute if branch
      const ifEdge = edges.find(e => e.sourceHandle === config.ifHandle);
      if (ifEdge) {
        await this.executeEdge(ifEdge, flow);
      }
      return;
    }

    // Evaluate else-if branches in order
    for (const elseIfBranch of config.elseIfBranches) {
      const elseIfResult = this.evaluator.evaluate(elseIfBranch.condition, this.context);
      if (elseIfResult) {
        // Execute this else-if branch
        const elseIfEdge = edges.find(e => e.sourceHandle === elseIfBranch.handle);
        if (elseIfEdge) {
          await this.executeEdge(elseIfEdge, flow);
        }
        return;
      }
    }

    // No condition matched, execute else branch
    const elseEdge = edges.find(e => e.sourceHandle === config.elseHandle);
    if (elseEdge) {
      await this.executeEdge(elseEdge, flow);
    }
  }

  /**
   * Execute switch/case condition node
   */
  protected async executeSwitchCondition(
    node: FlowNode,
    edges: FlowEdge[],
    flow: Flow
  ): Promise<void> {
    const config = node.config as {
      expression: string;
      cases: Array<{ value: unknown; handle: string; label?: string }>;
      defaultHandle?: string;
    };

    // Evaluate expression
    const expressionValue = this.evaluator.evaluate(config.expression, this.context);

    // Check each case in order
    for (const caseItem of config.cases) {
      if (expressionValue === caseItem.value) {
        // Match found - execute this case
        const caseEdge = edges.find(e => e.sourceHandle === caseItem.handle);
        if (caseEdge) {
          await this.executeEdge(caseEdge, flow);
        }
        return;
      }
    }

    // No case matched, execute default if present
    if (config.defaultHandle) {
      const defaultEdge = edges.find(e => e.sourceHandle === config.defaultHandle);
      if (defaultEdge) {
        await this.executeEdge(defaultEdge, flow);
      }
    }
  }

  /**
   * Execute for loop
   */
  protected async executeForLoop(
    node: FlowNode,
    edges: FlowEdge[],
    flow: Flow
  ): Promise<void> {
    const config = node.config as {
      start: number;
      end: number;
      step: number;
      indexVariable: string;
      loopHandle: string;
    };

    // Find loop body edge
    const loopEdge = edges.find(e => e.sourceHandle === config.loopHandle);
    if (!loopEdge) {
      return;
    }

    // Execute loop iterations
    for (let i = config.start; i < config.end; i += config.step) {
      // Set loop variable
      this.context.variables.set(config.indexVariable, i);

      // Execute loop body
      await this.executeEdge(loopEdge, flow);

      // Check if execution was paused or stopped
      if (this.context.state.status !== 'running') {
        break;
      }
    }

    // Find and execute next edge (after loop completion)
    const nextEdge = edges.find(e => e.sourceHandle !== config.loopHandle);
    if (nextEdge) {
      await this.executeEdge(nextEdge, flow);
    }
  }

  /**
   * Execute while loop
   */
  protected async executeWhileLoop(
    node: FlowNode,
    edges: FlowEdge[],
    flow: Flow
  ): Promise<void> {
    const config = node.config as {
      condition: string;
      maxIterations: number;
      loopHandle: string;
    };

    // Find loop body edge
    const loopEdge = edges.find(e => e.sourceHandle === config.loopHandle);
    if (!loopEdge) {
      return;
    }

    let iterations = 0;
    
    // Execute while condition is true
    while (iterations < config.maxIterations) {
      // Evaluate condition
      const conditionResult = this.evaluator.evaluate(config.condition, this.context);
      
      if (!conditionResult) {
        break; // Condition is false, exit loop
      }

      // Execute loop body
      await this.executeEdge(loopEdge, flow);

      iterations++;

      // Check if execution was paused or stopped
      if (this.context.state.status !== 'running') {
        break;
      }
    }

    // Find and execute next edge (after loop completion)
    const nextEdge = edges.find(e => e.sourceHandle !== config.loopHandle);
    if (nextEdge) {
      await this.executeEdge(nextEdge, flow);
    }
  }

  /**
   * Execute foreach loop
   */
  protected async executeForEachLoop(
    node: FlowNode,
    edges: FlowEdge[],
    flow: Flow
  ): Promise<void> {
    const config = node.config as {
      array: string;
      itemVariable: string;
      indexVariable?: string;
      loopHandle: string;
    };

    // Find loop body edge
    const loopEdge = edges.find(e => e.sourceHandle === config.loopHandle);
    if (!loopEdge) {
      return;
    }

    // Evaluate array expression
    const arrayValue = this.evaluator.evaluate(config.array, this.context);
    
    if (!Array.isArray(arrayValue)) {
      throw new Error(`ForEach loop: ${config.array} is not an array`);
    }

    // Execute loop for each item
    for (let i = 0; i < arrayValue.length; i++) {
      // Set item variable
      this.context.variables.set(config.itemVariable, arrayValue[i]);
      
      // Set index variable if specified
      if (config.indexVariable) {
        this.context.variables.set(config.indexVariable, i);
      }

      // Execute loop body
      await this.executeEdge(loopEdge, flow);

      // Check if execution was paused or stopped
      if (this.context.state.status !== 'running') {
        break;
      }
    }

    // Find and execute next edge (after loop completion)
    const nextEdge = edges.find(e => e.sourceHandle !== config.loopHandle);
    if (nextEdge) {
      await this.executeEdge(nextEdge, flow);
    }
  }

  /**
   * Execute a single edge (traverse to target node)
   */
  protected async executeEdge(edge: FlowEdge, flow: Flow): Promise<void> {
    const targetNode = flow.nodes.find(n => n.id === edge.target);
    if (!targetNode) {
      console.warn(`Target node ${edge.target} not found`);
      return;
    }

    this.context.events.emit('edge:traversed', { edge, context: this.context });
    await this.executeNode(targetNode, flow);
  }

  /**
   * Pause execution
   */
  pause(): void {
    this.context.state.status = 'paused';
    this.context.events.emit('execution:paused', {
      executionId: this.context.executionId,
    });
  }

  /**
   * Get execution context
   */
  getContext(): IExecutionContext {
    return this.context;
  }

  /**
   * Get execution state
   */
  getState() {
    return this.context.state;
  }

  /**
   * Get execution path
   */
  getExecutionPath() {
    return this.context.executionPath;
  }

  /**
   * Get variables
   */
  getVariables() {
    return this.context.variables;
  }
}

/**
 * Create and execute a flow
 */
export async function executeFlow(
  flow: Flow,
  options: ExecutorOptions = {}
): Promise<FlowExecutor> {
  const executionId = nanoid();
  const executor = new FlowExecutor(flow.id, executionId, options);

  await executor.execute(flow);

  return executor;
}
