/**
 * Lucide icon mapping for plugins
 * Maps plugin IDs to Lucide icon components
 */

import {
  Play,
  StopCircle,
  Clock,
  GitBranch,
  Code,
  Globe,
  Repeat,
  RotateCw,
  Workflow,
  Phone,
  Pin,
  Shuffle,
  Zap,
  Box,
  ArrowRight,
  MessageSquare,
  Tag,
  Menu,
  type LucideIcon,
} from 'lucide-react';
import type { GradientColorKey } from './gradient-colors';

export interface PluginIconConfig {
  icon: LucideIcon;
  gradientColor?: GradientColorKey;
}

/**
 * Icon configuration for each plugin type
 */
export const pluginIcons: Record<string, PluginIconConfig> = {
  // Flow Control
  'start-trigger': { icon: Play, gradientColor: 'green' },
  'end-flow': { icon: StopCircle, gradientColor: 'red' },
  'delay': { icon: Clock, gradientColor: 'blue' },
  
  // Actions
  'http-request': { icon: Globe, gradientColor: 'cyan' },
  'code-executor': { icon: Code, gradientColor: 'purple' },
  'transform': { icon: Shuffle, gradientColor: 'orange' },
  'constant': { icon: Pin, gradientColor: 'yellow' },
  'parallel': { icon: Zap, gradientColor: 'pink' },
  
  // Conditions
  'if-condition': { icon: GitBranch, gradientColor: 'teal' },
  'switch-condition': { icon: GitBranch, gradientColor: 'indigo' },
  
  // Loops
  'for-loop': { icon: Repeat, gradientColor: 'emerald' },
  'while-loop': { icon: RotateCw, gradientColor: 'lime' },
  'foreach-loop': { icon: Repeat, gradientColor: 'cyan' },
  
  // Subflows
  'define-subflow': { icon: Box, gradientColor: 'fuchsia' },
  'call-subflow': { icon: Workflow, gradientColor: 'rose' },
  
  // Default fallback
  'default': { icon: ArrowRight, gradientColor: 'gray' },
};

/**
 * Get icon configuration for a plugin
 */
export function getPluginIcon(pluginId: string): PluginIconConfig {
  return pluginIcons[pluginId] ?? pluginIcons.default;
}
