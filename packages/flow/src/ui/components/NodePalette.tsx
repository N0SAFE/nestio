/**
 * Node Palette Component
 * 
 * Displays available plugins for dragging onto the canvas
 * Now using @repo/ui components for consistent styling
 */

import React, { useState } from 'react';
import { Input } from '@repo/ui/components/shadcn/input';
import { Search, Zap, Code2, Calendar, Webhook, Play } from 'lucide-react';
import type { NodePaletteProps } from '../types';
import type { SubFlow, TriggerType } from '../../core/types/subflow';
import { getPluginIcon } from '../constants/plugin-icons';
import { cn } from '@repo/ui/lib/utils';
import type { GradientColorKey } from '../constants/gradient-colors';

// Static gradient class map - Tailwind can't use dynamic classes
const gradientClassMap: Record<GradientColorKey, string> = {
  purple: 'bg-gradient-to-br from-purple-600 to-purple-400',
  red: 'bg-gradient-to-br from-red-600 to-red-400',
  blue: 'bg-gradient-to-br from-blue-600 to-blue-400',
  green: 'bg-gradient-to-br from-green-600 to-green-400',
  yellow: 'bg-gradient-to-br from-yellow-600 to-yellow-400',
  pink: 'bg-gradient-to-br from-pink-600 to-pink-400',
  orange: 'bg-gradient-to-br from-orange-600 to-orange-400',
  teal: 'bg-gradient-to-br from-teal-600 to-teal-400',
  lime: 'bg-gradient-to-br from-lime-600 to-lime-400',
  indigo: 'bg-gradient-to-br from-indigo-600 to-indigo-400',
  fuchsia: 'bg-gradient-to-br from-fuchsia-600 to-fuchsia-400',
  emerald: 'bg-gradient-to-br from-emerald-600 to-emerald-400',
  cyan: 'bg-gradient-to-br from-cyan-600 to-cyan-400',
  rose: 'bg-gradient-to-br from-rose-600 to-rose-400',
  sky: 'bg-gradient-to-br from-sky-600 to-sky-400',
  gray: 'bg-gradient-to-br from-gray-600 to-gray-400',
  slate: 'bg-gradient-to-br from-slate-600 to-slate-400',
};

const getGradientClass = (color?: GradientColorKey) => {
  if (!color) return 'bg-gradient-to-br from-gray-600 to-gray-400';
  return gradientClassMap[color];
};

export const NodePalette: React.FC<NodePaletteProps> = ({
  categories,
  subFlows = [],
  onPluginDragStart,
  onSubFlowDragStart,
  filter = '',
}) => {
  const [searchQuery, setSearchQuery] = useState(filter);

  const filteredCategories = categories.map((category) => ({
    ...category,
    plugins: category.plugins.filter((plugin) =>
      !plugin.deprecated && (
        plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plugin.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    ),
  })).filter((category) => category.plugins.length > 0);
  
  const filteredSubFlows: SubFlow[] = (subFlows ?? []).filter((subFlow: SubFlow) =>
    subFlow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (subFlow.description?.toLowerCase() ?? '').includes(searchQuery.toLowerCase())
  );
  
  const getTriggerIcon = (triggerType: TriggerType) => {
    switch (triggerType) {
      case 'manual': return Play;
      case 'webhook': return Webhook;
      case 'schedule': return Calendar;
      case 'event': return Zap;
      default: return Zap;
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-card overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-border shrink-0">
        <h3 className="text-sm font-semibold text-card-foreground mb-2">
          Add Nodes
        </h3>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            className="pl-8 h-8 text-sm w-full"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="p-3 space-y-4">
          {/* SubFlows Section */}
          {filteredSubFlows.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                <span className="text-primary">●</span>
                SubFlows
              </h4>

              <div className="space-y-1.5">
                {filteredSubFlows.map((subFlow: SubFlow) => {
                  const isTrigger = subFlow.type === 'trigger';
                  const triggerType: TriggerType | undefined = isTrigger ? (subFlow.inputs[0]?.triggerConfig?.type ?? 'manual') : undefined;
                  const TriggerIcon = isTrigger && triggerType ? getTriggerIcon(triggerType) : Code2;
                  
                  return (
                    <div
                      key={subFlow.id}
                      draggable
                      onDragStart={(e) => {
                        // Use same pattern as plugins for consistency
                        e.dataTransfer.setData('application/reactflow-subflow', JSON.stringify(subFlow));
                        e.dataTransfer.effectAllowed = 'move';
                        void onSubFlowDragStart?.(subFlow);
                      }}
                      className="group flex items-center gap-2 p-2 rounded-lg border border-border/50 bg-card hover:bg-accent hover:border-border cursor-grab active:cursor-grabbing transition-all"
                    >
                      {/* Icon */}
                      <div 
                        className={cn(
                          "shrink-0 size-8 rounded-lg flex items-center justify-center text-white shadow-sm",
                          isTrigger 
                            ? "bg-gradient-to-br from-purple-600 to-purple-400"
                            : "bg-gradient-to-br from-blue-600 to-blue-400"
                        )}
                      >
                        <TriggerIcon className="size-4" />
                      </div>
                      
                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-card-foreground truncate">
                          {subFlow.name}
                        </p>
                        {subFlow.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {subFlow.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground/70">
                          {isTrigger ? `Trigger: ${triggerType ?? 'manual'}` : 'Callable'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Plugin Categories */}
          {filteredCategories.map((category) => (
            <div key={category.id}>
              <h4 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                <span className="text-primary">●</span>
                {category.name}
              </h4>

              <div className="space-y-1.5">
                {category.plugins.map((plugin) => {
                  const iconConfig = getPluginIcon(plugin.id);
                  const Icon = iconConfig.icon;
                  
                  return (
                    <div
                      key={plugin.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/reactflow', plugin.id);
                        e.dataTransfer.effectAllowed = 'move';
                        onPluginDragStart?.(plugin);
                      }}
                      className="group flex items-center gap-2 p-2 rounded-lg border border-border/50 bg-card hover:bg-accent hover:border-border cursor-grab active:cursor-grabbing transition-all"
                    >
                      {/* Icon */}
                      <div 
                        className={cn(
                          "shrink-0 size-8 rounded-lg flex items-center justify-center text-white shadow-sm",
                          getGradientClass(iconConfig.gradientColor)
                        )}
                      >
                        <Icon className="size-4" />
                      </div>
                      
                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-card-foreground truncate">
                          {plugin.name}
                        </p>
                        {plugin.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {plugin.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredCategories.length === 0 && (
            <div className="text-center text-muted-foreground py-8 text-sm">
              No nodes found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
