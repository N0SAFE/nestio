/**
 * useFlowAnalysis Hook
 *
 * React hook for analyzing flow context and providing autocomplete suggestions.
 * Memoizes analysis results and re-runs when flow or plugins change.
 */

import { useMemo, useCallback } from 'react';
import type { Flow, FlowPlugin, VariableDefinition, VariableSuggestion } from '../../core/types';
import type {
  NodeContextInfo,
  FlowAnalysis,
  AutocompleteOptions,
  AutocompleteResult,
} from '../../core/analysis';
import { FlowContextAnalyzer, AutocompleteProvider } from '../../core/analysis';

export interface UseFlowAnalysisOptions {
  /** Enable/disable analysis (default: true) */
  enabled?: boolean;
}

export interface UseFlowAnalysisResult {
  /** Full analysis result */
  analysis: FlowAnalysis | null;

  /** Get context info for a specific node */
  getNodeContext: (nodeId: string) => NodeContextInfo | undefined;

  /** Get autocomplete suggestions for a node */
  getSuggestions: (
    nodeId: string,
    input: string,
    cursorPosition: number,
    options?: AutocompleteOptions
  ) => AutocompleteResult;

  /** Check if a node has available variables */
  hasAvailableVariables: (nodeId: string) => boolean;

  /** Get all variable names available at a node */
  getAvailableVariableNames: (nodeId: string) => string[];

  /** Get all variables available at a node */
  getAvailableVariables: (nodeId: string) => VariableDefinition[];

  /** Check if analysis is valid */
  isValid: boolean;

  /** Any cycles detected in the flow */
  hasCycles: boolean;

  /** Analysis errors */
  errors: FlowAnalysis['errors'];
}

/**
 * Plugin lookup interface for the analyzer
 */
interface PluginLookup {
  get(pluginId: string): FlowPlugin | undefined;
}

/**
 * Hook for flow context analysis and autocomplete
 *
 * @example
 * ```tsx
 * const { getSuggestions, getNodeContext } = useFlowAnalysis(flow, plugins);
 *
 * // Get suggestions for autocomplete
 * const result = getSuggestions(selectedNodeId, 'Hello {{res', 11);
 *
 * // Get full context for a node
 * const context = getNodeContext(selectedNodeId);
 * console.log(context?.availableVariables);
 * ```
 */
export function useFlowAnalysis(
  flow: Flow | null | undefined,
  plugins: Map<string, FlowPlugin> | FlowPlugin[],
  options: UseFlowAnalysisOptions = {}
): UseFlowAnalysisResult {
  const { enabled = true } = options;

  // Convert plugins array to Map if needed and create lookup
  const pluginLookup = useMemo((): PluginLookup => {
    if (plugins instanceof Map) {
      return {
        get: (pluginId: string) => {
          // Try to find plugin by nodeType
          for (const plugin of plugins.values()) {
            if (plugin.nodeType === pluginId || plugin.id === pluginId) {
              return plugin;
            }
          }
          return undefined;
        },
      };
    }
    return {
      get: (pluginId: string) => {
        return plugins.find(p => p.nodeType === pluginId || p.id === pluginId);
      },
    };
  }, [plugins]);

  // Memoize analysis result
  const analysis = useMemo((): FlowAnalysis | null => {
    if (!enabled || !flow) {
      return null;
    }

    const analyzer = new FlowContextAnalyzer(pluginLookup);

    // Register output schemas from plugins
    const pluginArray = plugins instanceof Map ? Array.from(plugins.values()) : plugins;
    for (const plugin of pluginArray) {
      if (plugin.variableOutputSchema) {
        analyzer.registerPluginOutputSchema(plugin.id, plugin.variableOutputSchema);
      }
    }

    return analyzer.analyze(flow);
  }, [flow, pluginLookup, plugins, enabled]);

  // Get context for a specific node
  const getNodeContext = useCallback(
    (nodeId: string): NodeContextInfo | undefined => {
      return analysis?.nodeContexts.get(nodeId);
    },
    [analysis]
  );

  // Memoize autocomplete provider (depends on which node we're at, so we create per-call)
  const getSuggestions = useCallback(
    (
      nodeId: string,
      input: string,
      cursorPosition: number,
      options?: AutocompleteOptions
    ): AutocompleteResult => {
      const emptyResult: AutocompleteResult = {
        suggestions: [],
        query: '',
        startPosition: cursorPosition,
        hasMore: false,
      };

      if (!analysis) {
        return emptyResult;
      }

      const context = analysis.nodeContexts.get(nodeId);
      if (!context) {
        // Use global variables if node not found
        const provider = new AutocompleteProvider(analysis.globalVariables);
        return provider.getSuggestions(input, cursorPosition, options);
      }

      const provider = new AutocompleteProvider(context.availableVariables);
      return provider.getSuggestions(input, cursorPosition, options);
    },
    [analysis]
  );

  // Check if node has available variables
  const hasAvailableVariables = useCallback(
    (nodeId: string): boolean => {
      const context = analysis?.nodeContexts.get(nodeId);
      return context ? context.availableVariables.length > 0 : false;
    },
    [analysis]
  );

  // Get all variable names for a node
  const getAvailableVariableNames = useCallback(
    (nodeId: string): string[] => {
      const context = analysis?.nodeContexts.get(nodeId);
      if (!context) {
        return analysis?.globalVariables.map(v => v.name) ?? [];
      }
      return context.availableVariables.map(v => v.name);
    },
    [analysis]
  );

  // Get all variables for a node
  const getAvailableVariables = useCallback(
    (nodeId: string): VariableDefinition[] => {
      const context = analysis?.nodeContexts.get(nodeId);
      if (!context) {
        return analysis?.globalVariables ?? [];
      }
      return context.availableVariables;
    },
    [analysis]
  );

  // Check for cycles in errors
  const hasCycles = useMemo(() => {
    return analysis?.errors.some(e => e.type === 'circular-dependency') ?? false;
  }, [analysis]);

  return {
    analysis,
    getNodeContext,
    getSuggestions,
    hasAvailableVariables,
    getAvailableVariableNames,
    getAvailableVariables,
    isValid: analysis ? analysis.errors.length === 0 : false,
    hasCycles,
    errors: analysis?.errors ?? [],
  };
}

/**
 * Hook for autocomplete at a specific node
 *
 * @example
 * ```tsx
 * const { suggestions, search } = useNodeAutocomplete(flow, plugins, selectedNodeId);
 *
 * // Search for suggestions
 * const handleInput = (input: string, cursor: number) => {
 *   const result = search(input, cursor);
 *   setDropdownItems(result.suggestions);
 * };
 * ```
 */
export function useNodeAutocomplete(
  flow: Flow | null | undefined,
  plugins: Map<string, FlowPlugin> | FlowPlugin[],
  nodeId: string | null | undefined
): {
  suggestions: VariableSuggestion[];
  search: (input: string, cursorPosition: number, options?: AutocompleteOptions) => AutocompleteResult;
  hasVariables: boolean;
  variableNames: string[];
  variables: VariableDefinition[];
} {
  const { getSuggestions, hasAvailableVariables, getAvailableVariableNames, getAvailableVariables } =
    useFlowAnalysis(flow, plugins, { enabled: !!nodeId });

  const search = useCallback(
    (input: string, cursorPosition: number, options?: AutocompleteOptions): AutocompleteResult => {
      if (!nodeId) {
        return {
          suggestions: [],
          query: '',
          startPosition: cursorPosition,
          hasMore: false,
        };
      }
      return getSuggestions(nodeId, input, cursorPosition, options);
    },
    [nodeId, getSuggestions]
  );

  const suggestions = useMemo((): VariableSuggestion[] => {
    if (!nodeId) {
      return [];
    }
    // Get all suggestions with empty query
    const result = getSuggestions(nodeId, '{{', 2);
    return result.suggestions;
  }, [nodeId, getSuggestions]);

  const hasVariables = nodeId ? hasAvailableVariables(nodeId) : false;
  const variableNames = nodeId ? getAvailableVariableNames(nodeId) : [];
  const variables = nodeId ? getAvailableVariables(nodeId) : [];

  return {
    suggestions,
    search,
    hasVariables,
    variableNames,
    variables,
  };
}

export default useFlowAnalysis;
