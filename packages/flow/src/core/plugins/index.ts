/**
 * Core Plugins
 * 
 * Essential plugins for the flow builder.
 * These are always available and cannot be removed.
 */

export { PluginRegistry, pluginRegistry } from './registry';

// Condition plugins
export {
  ifConditionPlugin,
  switchConditionPlugin,
} from './conditions';
export type {
  IfConditionConfig,
  SwitchConditionConfig,
} from './conditions';

// Loop plugins
export {
  forLoopPlugin,
  whileLoopPlugin,
  forEachLoopPlugin,
} from './loops';
export type {
  ForLoopConfig,
  WhileLoopConfig,
  ForEachLoopConfig,
} from './loops';

// Flow control plugins
export {
  // startTriggerPlugin, // Deprecated - use SubFlow-based triggers
  endFlowPlugin,
  delayPlugin,
} from './flow-control';
export type {
  // StartTriggerConfig, // Deprecated
  EndFlowConfig,
  DelayConfig,
} from './flow-control';

// Subflow plugins
export {
  callSubflowPlugin,
  defineSubflowPlugin,
} from './subflows';
export type {
  CallSubflowConfig,
  SubflowParameter,
  DefineSubflowConfig,
  ParameterDefinition,
} from './subflows';

// Action plugins
export {
  transformPlugin,
  codeExecutorPlugin,
  httpRequestPlugin,
  splitPlugin,
  joinPlugin,
  constantPlugin,
} from './actions';
export type {
  TransformConfig,
  TransformRule,
  CodeExecutorConfig,
  HttpRequestConfig,
  HttpMethod,
  SplitConfig,
  JoinConfig,
  ConstantConfig,
  ConstantDefinition,
} from './actions';

/**
 * Register all core plugins
 */
import {
  ifConditionPlugin,
  switchConditionPlugin,
  forLoopPlugin,
  whileLoopPlugin,
  forEachLoopPlugin,
  endFlowPlugin,
  delayPlugin,
  callSubflowPlugin,
  defineSubflowPlugin,
  transformPlugin,
  codeExecutorPlugin,
  httpRequestPlugin,
  splitPlugin,
  joinPlugin,
  constantPlugin,
} from './index';
import { pluginRegistry } from './registry';

export function registerCorePlugins(): void {
  // Conditions
  pluginRegistry.register(ifConditionPlugin);
  pluginRegistry.register(switchConditionPlugin);

  // Loops
  pluginRegistry.register(forLoopPlugin);
  pluginRegistry.register(whileLoopPlugin);
  pluginRegistry.register(forEachLoopPlugin);

  // Flow control
  // Note: startTriggerPlugin is deprecated - use SubFlow-based triggers instead
  // pluginRegistry.register(startTriggerPlugin);
  pluginRegistry.register(endFlowPlugin);
  pluginRegistry.register(delayPlugin);

  // Subflows
  pluginRegistry.register(callSubflowPlugin);
  pluginRegistry.register(defineSubflowPlugin);

  // Actions
  pluginRegistry.register(transformPlugin);
  pluginRegistry.register(codeExecutorPlugin);
  pluginRegistry.register(httpRequestPlugin);
  pluginRegistry.register(splitPlugin);
  pluginRegistry.register(joinPlugin);
  pluginRegistry.register(constantPlugin);
}
