/**
 * Flow Builder Package
 * 
 * Main entry point for the flow builder system.
 * Exports core types, runtime components, utilities, and all plugins.
 */

// Core types (interfaces only)
export type * from './core/types/index';

// Flow Analysis (context analyzer and autocomplete)
export {
  FlowContextAnalyzer,
  AutocompleteProvider,
} from './core/analysis/index';
export type {
  NodeContextInfo,
  FlowAnalysisResult,
  AutocompleteSuggestion,
  AutocompleteContext,
  SuggestionFilter,
} from './core/analysis/index';

// Variable management implementations (Core runtime, not plugins)
export { VariableManager, ScopeStack, ExpressionEvaluator } from './core/runtime/variables/index';

// Execution engine
export { ExecutionContext, FlowExecutor, executeFlow } from './core/engine/index';
export type { ExecutorOptions } from './core/engine/index';

// Event system
export { EventEmitter } from './core/events/index';
export type {
  EventHandler,
  FlowEvent,
  NodeEvent,
  ExecutionEvent,
  EdgeEvent,
  VariableEvent,
  SnapshotEvent,
} from './core/events/index';

// Plugin system - registry and registration
export { PluginRegistry, pluginRegistry, registerCorePlugins } from './core/plugins/index';

// Condition plugins
export {
  ifConditionPlugin,
  switchConditionPlugin,
} from './core/plugins/index';
export type {
  IfConditionConfig,
  SwitchConditionConfig,
} from './core/plugins/index';

// Loop plugins
export {
  forLoopPlugin,
  whileLoopPlugin,
  forEachLoopPlugin,
} from './core/plugins/index';
export type {
  ForLoopConfig,
  WhileLoopConfig,
  ForEachLoopConfig,
} from './core/plugins/index';

// Flow control plugins
export {
  startTriggerPlugin,
  endFlowPlugin,
  delayPlugin,
} from './core/plugins/index';
export type {
  StartTriggerConfig,
  EndFlowConfig,
  DelayConfig,
} from './core/plugins/index';

// Subflow plugins
export {
  callSubflowPlugin,
  defineSubflowPlugin,
} from './core/plugins/index';
export type {
  CallSubflowConfig,
  SubflowParameter,
  DefineSubflowConfig,
  ParameterDefinition,
} from './core/plugins/index';

// Action plugins
export {
  transformPlugin,
  codeExecutorPlugin,
  httpRequestPlugin,
  splitPlugin,
  joinPlugin,
} from './core/plugins/index';
export type {
  TransformConfig,
  TransformRule,
  CodeExecutorConfig,
  HttpRequestConfig,
  HttpMethod,
  SplitConfig,
  JoinConfig,
} from './core/plugins/index';

// Utilities - Flow Builder
export {
  FlowBuilder,
  createFlow,
  fromFlow,
  NodeFactory,
} from './utils/index';

// Utilities - Serialization
export {
  serializeFlow,
  deserializeFlow,
  validateFlowStructure,
  exportFlowToFile,
  importFlowFromFile,
  cloneFlow,
  mergeFlows,
  extractSubflow,
  getFlowStatistics,
} from './utils/index';

// Utilities - Validation
export {
  validateFlow,
} from './utils/index';
export type {
  ValidationError,
  ValidationResult,
} from './utils/index';

// Re-export commonly used types for convenience
export type {
  Flow,
  FlowNode,
  FlowEdge,
  FlowVariable,
  SubFlow,
  NodeType,
  VariableType,
  ExecutionContext as IExecutionContext,
  ExecutionOptions,
  ExecutionResult,
  FlowPlugin,
  PluginCategory,
  NodeUIPattern,
} from './core/types/index';

// SubFlow architecture types
export type {
  PortType,
  PortDataType,
  SubFlowPort,
  SubFlowInputPort,
  SubFlowOutputPort,
  InternalNodeType,
  InternalNodeData,
  InternalNode as SubFlowInternalNode,
  InternalEdge,
  SubFlowType,
  SubFlowViewState,
  SubFlowEdge,
  SubFlowBasedFlow,
  SubFlowBasedFlowVariable,
  FlowExecutionContext,
  SubFlowExecutionState,
  SubFlowReference,
  SubFlowValidationResult,
  SubFlowTemplate,
} from './core/types/subflow';

// SubFlow factory functions
export {
  createTriggerSubFlow,
  createCallableSubFlow,
  createSubFlowBasedFlow,
} from './core/types/subflow';

// UI Components (for React applications)
export {
  FlowEditor,
  SubFlowEditor,
  SubFlowCanvas,
  NodePalette,
  PropertyPanel,
  VariableInspector,
  ExecutionControls,
  useFlowStore,
  useFlowExecution,
  useFlowAnalysis,
  useNodeAutocomplete,
} from './ui/index';

// SubFlow Node Components
export {
  SubFlowNode,
  InternalNode as InternalNodeComponent,
  PortNode,
} from './ui/components/nodes';
export type {
  SubFlowNodeData,
  SubFlowNodeProps,
  InternalNodeComponentData,
  InternalNodeComponentProps,
  PortNodeData,
  PortNodeProps,
} from './ui/components/nodes';

// Config Panel Components (for custom plugin configs)
export {
  ConfigSection,
  ConfigField,
  TextInput,
  NumberInput,
  Select,
  Checkbox,
  TextArea,
  Button,
  ArrayItem,
  DynamicConfigRenderer,
  ConfigSheet,
  VariableExpressionInput,
  // Schema helpers
  configSchema,
  section,
  textField,
  numberField,
  selectField,
  checkboxField,
  arrayField,
  groupField,
  codeField,
} from './ui/components/config';
export type {
  ConfigSectionProps,
  ConfigFieldProps,
  TextInputProps,
  NumberInputProps,
  SelectProps,
  CheckboxProps,
  TextAreaProps,
  ConfigSheetProps,
  VariableExpressionInputProps,
  // Schema types
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
} from './ui/components/config';

// UI Types (with explicit naming to avoid conflicts)
export type {
  ExecutionState as UIExecutionState,
  FlowNodeData,
  ReactFlowNode,
  ReactFlowEdge,
  FlowEditorProps,
  NodePaletteProps,
  PropertyPanelProps,
  VariableInspectorProps,
  ExecutionControlsProps,
} from './ui/types';

