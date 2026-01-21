/**
 * UI Type Definitions
 * 
 * FlowNode and FlowEdge now extend React Flow's base Node and Edge types,
 * making them directly compatible with React Flow without conversion.
 */

import type { FlowNode, FlowEdge, Flow } from '../core/types/flow';
import type { FlowPlugin } from '../core/types/plugin';
import type { ExecutionContext } from '../core/types/context';
import type { SubFlow } from '../core/types/subflow';

/**
 * React Flow compatible node - FlowNode already extends React Flow's Node type
 */
export type ReactFlowNode = FlowNode;

/**
 * React Flow compatible edge - FlowEdge already extends React Flow's Edge type
 */
export type ReactFlowEdge = FlowEdge;

/**
 * Node data for React Flow nodes
 */
export interface FlowNodeData {
  /** The core flow node */
  node: FlowNode;
  /** Whether the node is currently executing */
  executing?: boolean;
  /** Whether the node has completed execution */
  completed?: boolean;
  /** Whether the node has an error */
  error?: boolean;
  /** Error message if any */
  errorMessage?: string;
}

/**
 * Plugin Category for UI grouping
 */
export interface PluginCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  plugins: FlowPlugin[];
}

/**
 * Execution state for UI
 */
export interface ExecutionState {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  currentNodeId?: string;
  completedNodes: Set<string>;
  variables: Record<string, unknown>;
  output?: unknown;
  error?: Error;
  startTime?: number;
  endTime?: number;
}

/**
 * Debug mode configurationa
 */
export interface DebugModeConfig {
  /** Enable debug mode (right-click context menus) */
  enabled: boolean;
  /** Execution context for showing live data */
  executionContext?: ExecutionContext;
  /** Callback when user wants to run a single node */
  onRunNode?: (nodeId: string) => void;
  /** Callback when user toggles a breakpoint */
  onToggleBreakpoint?: (nodeId: string) => void;
  /** Set of node IDs that have breakpoints */
  breakpoints?: Set<string>;
}

/**
 * Flow Editor Props
 */
export interface FlowEditorProps {
  /** Initial flow to load */
  initialFlow?: Flow;
  /** Available plugins */
  plugins?: FlowPlugin[];
  /** Callback when flow changes */
  onChange?: (flow: Flow) => void;
  /** Callback when execution completes */
  onExecutionComplete?: (result: unknown) => void;
  /** Callback when execution errors */
  onExecutionError?: (error: Error) => void;
  /** Callback when settings icon is clicked */
  onNodeSettings?: (nodeId: string) => void;
  /** Callback when delete icon is clicked */
  onNodeDelete?: (nodeId: string) => void;
  /** Whether to show execution controls */
  showControls?: boolean;
  /** Whether to show variable inspector */
  showVariables?: boolean;
  /** Whether to show node palette */
  showPalette?: boolean;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Theme for the flow editor ('light' | 'dark') */
  theme?: 'light' | 'dark';
  /** Additional CSS class */
  className?: string;
  /** External draggedPlugin ref for custom palettes */
  draggedPluginRef?: React.RefObject<FlowPlugin | null>;
  /** External draggedSubFlow ref for custom palettes */
  draggedSubFlowRef?: React.RefObject<SubFlow | null>;
}

/**
 * Node Palette Props
 */
export interface NodePaletteProps {
  /** Available plugins grouped by category */
  categories: PluginCategory[];
  /** Available SubFlows that can be instantiated */
  subFlows?: SubFlow[];
  /** Callback when a plugin is dragged */
  onPluginDragStart?: (plugin: FlowPlugin) => void;
  /** Callback when a SubFlow is dragged */
  onSubFlowDragStart?: (subFlow: SubFlow) => void;
  /** Filter text for searching plugins */
  filter?: string;
  /** Whether the palette is collapsed */
  collapsed?: boolean;
}

/**
 * Property Panel Props
 */
export interface PropertyPanelProps {
  /** Selected node */
  node?: FlowNode;
  /** Plugin definition for the node */
  plugin?: FlowPlugin;
  /** Callback when node properties change */
  onChange?: (nodeId: string, config: Record<string, unknown>) => void;
  /** Callback when node is deleted */
  onDelete?: (nodeId: string) => void;
}

/**
 * Variable Inspector Props
 */
export interface VariableInspectorProps {
  /** Current variables */
  variables: Record<string, unknown>;
  /** Whether variables are editable */
  editable?: boolean;
  /** Callback when variable is updated */
  onVariableChange?: (name: string, value: unknown) => void;
  /** Callback when variable is deleted */
  onVariableDelete?: (name: string) => void;
}

/**
 * Execution Controls Props
 */
export interface ExecutionControlsProps {
  /** Current execution state */
  state: ExecutionState;
  /** Callback to start execution */
  onStart?: () => void;
  /** Callback to pause execution */
  onPause?: () => void;
  /** Callback to resume execution */
  onResume?: () => void;
  /** Callback to stop execution */
  onStop?: () => void;
  /** Callback to reset execution */
  onReset?: () => void;
}
