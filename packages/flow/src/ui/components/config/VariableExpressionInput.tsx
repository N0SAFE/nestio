/**
 * Variable Expression Input
 * 
 * A specialized input component with autocomplete for {{ }} expressions.
 * Shows available variables with their types and nested properties.
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Input } from '@repo/ui/components/shadcn/input';
import { cn } from '@repo/ui/lib/utils';
import type { VariableSuggestion, VariableDefinition } from '../../../core/types/variable-schema';
import { AutocompleteProvider } from '../../../core/analysis/autocomplete-provider';

/**
 * Props for VariableExpressionInput
 */
export interface VariableExpressionInputProps {
  /** Current value */
  value: string;
  /** Value change handler */
  onChange: (value: string) => void;
  /** Available variables */
  variables: VariableDefinition[];
  /** Placeholder text */
  placeholder?: string;
  /** Input label */
  label?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
  /** Whether to show inline suggestions */
  showInlineSuggestions?: boolean;
  /** Expected type for filtering suggestions */
  expectedType?: string | string[];
  /** Multiline mode */
  multiline?: boolean;
  /** Number of rows for multiline */
  rows?: number;
}

/**
 * Variable Expression Input Component
 */
export function VariableExpressionInput({
  value,
  onChange,
  variables,
  placeholder = 'Enter value or use {{ variable }}',
  label,
  disabled = false,
  className,
  showInlineSuggestions = true,
  expectedType,
  multiline = false,
  rows = 3,
}: VariableExpressionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<VariableSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [suggestionQuery, setSuggestionQuery] = useState('');
  const [expressionStart, setExpressionStart] = useState(0);

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Create autocomplete provider
  const autocompleteProvider = useMemo(() => {
    return new AutocompleteProvider(variables);
  }, [variables]);

  // Update suggestions when cursor moves or value changes
  const updateSuggestions = useCallback(() => {
    if (!showInlineSuggestions) {
      setShowSuggestions(false);
      return;
    }

    const result = autocompleteProvider.getSuggestions(value, cursorPosition, {
      expectedType: expectedType as any,
      maxSuggestions: 20,
      includeNested: true,
      maxDepth: 3,
    });

    if (result.suggestions.length > 0) {
      setSuggestions(result.suggestions);
      setSuggestionQuery(result.query);
      setExpressionStart(result.startPosition);
      setShowSuggestions(true);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
    }
  }, [value, cursorPosition, autocompleteProvider, expectedType, showInlineSuggestions]);

  // Handle input change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const newPosition = e.target.selectionStart ?? newValue.length;
      
      onChange(newValue);
      setCursorPosition(newPosition);
    },
    [onChange]
  );

  // Handle cursor movement
  const handleSelect = useCallback(
    (e: React.SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      setCursorPosition(target.selectionStart ?? 0);
    },
    []
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showSuggestions) {
        // Trigger suggestions on {{ 
        if (e.key === '{' && value.slice(-1) === '{') {
          updateSuggestions();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          if (suggestions[selectedIndex]) {
            insertSuggestion(suggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          setShowSuggestions(false);
          break;
        case '.':
          // Allow dot to be typed, then update suggestions
          setTimeout(updateSuggestions, 0);
          break;
      }
    },
    [showSuggestions, suggestions, selectedIndex, value, updateSuggestions]
  );

  // Insert a suggestion
  const insertSuggestion = useCallback(
    (suggestion: VariableSuggestion) => {
      const beforeExpression = value.slice(0, expressionStart);
      const afterCursor = value.slice(cursorPosition);
      
      // Find the end of the current expression
      const endMatch = afterCursor.match(/^[^}]*\}\}/);
      const afterExpression = endMatch 
        ? afterCursor.slice(endMatch[0].length)
        : afterCursor;

      const newValue = `${beforeExpression}${suggestion.insertText}${afterExpression.startsWith('}}') ? '' : ' '}${afterExpression}`;
      
      onChange(newValue);
      setShowSuggestions(false);

      // Move cursor after insertion
      const newPosition = beforeExpression.length + suggestion.insertText.length;
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.setSelectionRange(newPosition, newPosition);
          inputRef.current.focus();
        }
      }, 0);
    },
    [value, expressionStart, cursorPosition, onChange]
  );

  // Update suggestions when value or cursor changes
  useEffect(() => {
    updateSuggestions();
  }, [updateSuggestions]);

  // Scroll selected suggestion into view
  useEffect(() => {
    if (suggestionsRef.current && showSuggestions) {
      const selected = suggestionsRef.current.querySelector('[data-selected="true"]');
      if (selected) {
        selected.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, showSuggestions]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current !== e.target
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Common input props
  const inputProps = {
    ref: inputRef as any,
    value,
    onChange: handleChange,
    onSelect: handleSelect,
    onKeyDown: handleKeyDown,
    onFocus: updateSuggestions,
    placeholder,
    disabled,
    className: cn(
      'font-mono text-sm',
      className
    ),
    'aria-expanded': showSuggestions,
    'aria-haspopup': 'listbox' as const,
    'aria-autocomplete': 'list' as const,
  };

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-muted-foreground mb-1">
          {label}
        </label>
      )}
      
      {multiline ? (
        <textarea
          {...inputProps}
          rows={rows}
          className={cn(
            'w-full px-3 py-2 border rounded-md bg-background text-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring',
            'resize-y min-h-[80px]',
            inputProps.className
          )}
        />
      ) : (
        <Input {...inputProps} />
      )}

      {/* Expression hint */}
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs text-muted-foreground">
          Use <code className="px-1 bg-muted rounded">{'{{ variable }}'}</code> to reference variables
        </span>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className={cn(
            'absolute z-50 w-full mt-1',
            'bg-popover border rounded-md shadow-lg',
            'max-h-[300px] overflow-y-auto'
          )}
          role="listbox"
        >
          <div className="p-1">
            {suggestionQuery && (
              <div className="px-2 py-1 text-xs text-muted-foreground border-b mb-1">
                Completing: <code className="bg-muted px-1 rounded">{suggestionQuery}</code>
              </div>
            )}
            
            {suggestions.map((suggestion, index) => (
              <SuggestionItem
                key={`${suggestion.name}-${index}`}
                suggestion={suggestion}
                isSelected={index === selectedIndex}
                onClick={() => insertSuggestion(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Suggestion item component
 */
interface SuggestionItemProps {
  suggestion: VariableSuggestion;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}

function SuggestionItem({
  suggestion,
  isSelected,
  onClick,
  onMouseEnter,
}: SuggestionItemProps) {
  return (
    <div
      data-selected={isSelected}
      role="option"
      aria-selected={isSelected}
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer',
        'text-sm',
        isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
      )}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      <TypeBadge type={suggestion.type} />
      
      <div className="flex-1 min-w-0">
        <div className="font-mono font-medium truncate">
          {suggestion.label}
        </div>
        {suggestion.description && (
          <div className="text-xs text-muted-foreground truncate">
            {suggestion.description}
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground shrink-0">
        {suggestion.source}
      </div>
    </div>
  );
}

/**
 * Type badge component
 */
function TypeBadge({ type }: { type: string }) {
  const getTypeColor = (type: string): string => {
    if (type.includes('string')) return 'bg-green-500/10 text-green-600 dark:text-green-400';
    if (type.includes('number') || type.includes('integer')) return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
    if (type.includes('boolean')) return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
    if (type.includes('[]') || type.includes('array')) return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
    if (type.includes('object') || type.includes('Record')) return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
    if (type.includes('File')) return 'bg-pink-500/10 text-pink-600 dark:text-pink-400';
    return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
  };

  return (
    <span
      className={cn(
        'px-1.5 py-0.5 text-xs font-mono rounded shrink-0',
        getTypeColor(type)
      )}
    >
      {type.length > 20 ? type.slice(0, 17) + '...' : type}
    </span>
  );
}

/**
 * Inline variable chips display
 */
export interface VariableChipsProps {
  variables: VariableDefinition[];
  onInsert: (variable: VariableDefinition) => void;
  maxShow?: number;
}

export function VariableChips({
  variables,
  onInsert,
  maxShow = 5,
}: VariableChipsProps) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? variables : variables.slice(0, maxShow);
  const hasMore = variables.length > maxShow;

  if (variables.length === 0) {
    return (
      <div className="text-xs text-muted-foreground py-1">
        No variables available
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {displayed.map((variable) => (
        <button
          key={variable.name}
          type="button"
          onClick={() => onInsert(variable)}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
            'text-xs font-mono',
            'bg-muted hover:bg-muted/80 transition-colors',
            'border border-transparent hover:border-border'
          )}
          title={`${variable.name}: ${variable.schema.type}${variable.schema.description ? ` - ${variable.schema.description}` : ''}`}
        >
          <span className="text-muted-foreground">{'{{ '}</span>
          <span>{variable.name}</span>
          <span className="text-muted-foreground">{' }}'}</span>
        </button>
      ))}
      
      {hasMore && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="text-xs text-primary hover:underline"
        >
          +{variables.length - maxShow} more
        </button>
      )}
      
      {showAll && hasMore && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="text-xs text-primary hover:underline"
        >
          Show less
        </button>
      )}
    </div>
  );
}

export default VariableExpressionInput;
