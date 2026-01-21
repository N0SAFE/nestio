/**
 * Flow Store - Zustand state management for flow editor
 */

import { create } from 'zustand';
import type { Flow, FlowNode, FlowEdge } from '../../core/types/flow';
import type { ExecutionState } from '../types';
import { FlowBuilder } from '../../utils/flow-builder';

interface FlowStore {
  // Flow state
  flow: Flow | null;
  selectedNodeId: string | null;
  executionState: ExecutionState;
  
  // Actions
  setFlow: (flow: Flow) => void;
  updateFlow: (updates: Partial<Flow>) => void;
  addNode: (node: FlowNode) => void;
  updateNode: (nodeId: string, updates: Partial<FlowNode>) => void;
  deleteNode: (nodeId: string) => void;
  addEdge: (edge: FlowEdge) => void;
  deleteEdge: (edgeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  
  // Execution
  startExecution: () => void;
  pauseExecution: () => void;
  stopExecution: () => void;
  resetExecution: () => void;
  updateExecutionState: (state: Partial<ExecutionState>) => void;
  
  // Variables
  setVariable: (name: string, value: unknown) => void;
  deleteVariable: (name: string) => void;
  
  // Utility
  reset: () => void;
}

const initialExecutionState: ExecutionState = {
  status: 'idle',
  completedNodes: new Set(),
  variables: {},
};

export const useFlowStore = create<FlowStore>((set, get) => ({
  // Initial state
  flow: null,
  selectedNodeId: null,
  executionState: initialExecutionState,
  
  // Flow actions
  setFlow: (flow) => set({ flow, selectedNodeId: null }),
  
  updateFlow: (updates) => set((state) => ({
    flow: state.flow ? { ...state.flow, ...updates } : null,
  })),
  
  addNode: (node) => set((state) => {
    if (!state.flow) return state;
    return {
      flow: {
        ...state.flow,
        nodes: [...state.flow.nodes, node],
      },
    };
  }),
  
  updateNode: (nodeId, updates) => set((state) => {
    if (!state.flow) return state;
    return {
      flow: {
        ...state.flow,
        nodes: state.flow.nodes.map((node) =>
          node.id === nodeId ? { ...node, ...updates } : node
        ),
      },
    };
  }),
  
  deleteNode: (nodeId) => set((state) => {
    if (!state.flow) return state;
    return {
      flow: {
        ...state.flow,
        nodes: state.flow.nodes.filter((node) => node.id !== nodeId),
        edges: state.flow.edges.filter(
          (edge) => edge.source !== nodeId && edge.target !== nodeId
        ),
      },
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
    };
  }),
  
  addEdge: (edge) => set((state) => {
    if (!state.flow) return state;
    return {
      flow: {
        ...state.flow,
        edges: [...state.flow.edges, edge],
      },
    };
  }),
  
  deleteEdge: (edgeId) => set((state) => {
    if (!state.flow) return state;
    return {
      flow: {
        ...state.flow,
        edges: state.flow.edges.filter((edge) => edge.id !== edgeId),
      },
    };
  }),
  
  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
  
  // Execution actions
  startExecution: () => set((state) => ({
    executionState: {
      ...state.executionState,
      status: 'running',
      startTime: Date.now(),
      completedNodes: new Set(),
      error: undefined,
    },
  })),
  
  pauseExecution: () => set((state) => ({
    executionState: {
      ...state.executionState,
      status: 'paused',
    },
  })),
  
  stopExecution: () => set((state) => ({
    executionState: {
      ...state.executionState,
      status: 'idle',
      currentNodeId: undefined,
      endTime: Date.now(),
    },
  })),
  
  resetExecution: () => set({
    executionState: initialExecutionState,
  }),
  
  updateExecutionState: (updates) => set((state) => ({
    executionState: {
      ...state.executionState,
      ...updates,
    },
  })),
  
  // Variable actions
  setVariable: (name, value) => set((state) => {
    if (!state.flow) return state;
    
    const existingVar = state.flow.variables.find((v) => v.name === name);
    
    if (existingVar) {
      return {
        flow: {
          ...state.flow,
          variables: state.flow.variables.map((v) =>
            v.name === name ? { ...v, value } : v
          ),
        },
        executionState: {
          ...state.executionState,
          variables: {
            ...state.executionState.variables,
            [name]: value,
          },
        },
      };
    }
    
    // Add new variable
    const newVar = {
      id: `var-${Date.now()}`,
      name,
      type: inferType(value),
      value,
      scope: 'global' as const,
    };
    
    return {
      flow: {
        ...state.flow,
        variables: [...state.flow.variables, newVar],
      },
      executionState: {
        ...state.executionState,
        variables: {
          ...state.executionState.variables,
          [name]: value,
        },
      },
    };
  }),
  
  deleteVariable: (name) => set((state) => {
    if (!state.flow) return state;
    
    const { [name]: _, ...remainingVars } = state.executionState.variables;
    
    return {
      flow: {
        ...state.flow,
        variables: state.flow.variables.filter((v) => v.name !== name),
      },
      executionState: {
        ...state.executionState,
        variables: remainingVars,
      },
    };
  }),
  
  // Utility
  reset: () => set({
    flow: null,
    selectedNodeId: null,
    executionState: initialExecutionState,
  }),
}));

/**
 * Infer variable type from value
 */
function inferType(value: unknown): 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any' {
  if (value === null || value === undefined) return 'any';
  if (Array.isArray(value)) return 'array';
  
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
