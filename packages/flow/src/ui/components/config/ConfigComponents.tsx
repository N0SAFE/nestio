/**
 * Reusable Config Panel Components
 * 
 * Standard primitive components for building plugin configuration UIs.
 * These are the building blocks used by the dynamic config renderer.
 * Uses @repo/ui components for consistent styling.
 */

import React from 'react';
import { Input } from '@repo/ui/components/shadcn/input';
import { Label } from '@repo/ui/components/shadcn/label';
import { Button } from '@repo/ui/components/shadcn/button';
import { Switch } from '@repo/ui/components/shadcn/switch';
import {
  Select as UISelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/shadcn/select';
import { cn } from '@repo/ui/lib/utils';
import { ChevronDown, ChevronRight, X } from 'lucide-react';

// ============================================================================
// Layout Components
// ============================================================================

export interface ConfigSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function ConfigSection({ 
  title, 
  description, 
  children,
  collapsible = false,
  defaultCollapsed = false,
}: ConfigSectionProps) {
  const [open, setOpen] = React.useState(!defaultCollapsed);

  if (collapsible) {
    return (
      <div className="mb-6">
        <button
          type="button"
          onClick={() => { setOpen(!open); }}
          className="flex w-full items-center justify-between text-left"
        >
          <div>
            <h3 className="text-sm font-semibold">{title}</h3>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {open && (
          <div className="flex flex-col gap-3 mt-3">
            {children}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="mb-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex flex-col gap-3 mt-3">
        {children}
      </div>
    </div>
  );
}

export interface ConfigFieldProps {
  label: string;
  description?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  htmlFor?: string;
}

export function ConfigField({ label, description, required, error, children, htmlFor }: ConfigFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {description && (
        <p className="text-xs text-muted-foreground -mt-0.5">{description}</p>
      )}
      {children}
      {error && (
        <p className="text-xs text-destructive mt-0.5">{error}</p>
      )}
    </div>
  );
}

// ============================================================================
// Input Components
// ============================================================================

export interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function TextInput({ value, onChange, placeholder, disabled, className, id }: TextInputProps) {
  return (
    <Input
      id={id}
      type="text"
      value={value}
      onChange={(e) => { onChange(e.target.value); }}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  );
}

export interface TextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function TextArea({ value, onChange, placeholder, rows = 3, disabled, className, id }: TextAreaProps) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => { onChange(e.target.value); }}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      className={cn(
        // Base styles matching Input component
        'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2',
        'text-sm ring-offset-background placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        // TextArea specific
        'font-mono resize-y',
        className
      )}
    />
  );
}

export interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function NumberInput({ 
  value, 
  onChange, 
  min, 
  max, 
  step = 1, 
  placeholder,
  disabled,
  className,
  id,
}: NumberInputProps) {
  return (
    <Input
      id={id}
      type="number"
      value={value}
      onChange={(e) => { onChange(Number(e.target.value)); }}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  );
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function Select({ value, onChange, options, placeholder, disabled, className }: SelectProps) {
  return (
    <UISelect value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </UISelect>
  );
}

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function Checkbox({ checked, onChange, label, disabled, className, id }: CheckboxProps) {
  const switchId = id ?? React.useId();
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Switch
        id={switchId}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
      />
      <Label htmlFor={switchId} className="text-sm cursor-pointer">
        {label}
      </Label>
    </div>
  );
}

// ============================================================================
// Array Item Component
// ============================================================================

export interface ArrayItemProps {
  index: number;
  onRemove: () => void;
  canRemove: boolean;
  children: React.ReactNode;
}

export function ArrayItem({ index, onRemove, canRemove, children }: ArrayItemProps) {
  return (
    <div className="relative p-3 border border-border rounded-lg bg-muted/50">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 flex flex-col gap-3">
          {children}
        </div>
        {canRemove && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-6 w-6 text-muted-foreground hover:text-destructive -mt-1 -mr-1"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="absolute -left-2 top-3 w-5 h-5 flex items-center justify-center 
        bg-muted rounded-full text-xs text-muted-foreground font-medium border border-border">
        {index + 1}
      </div>
    </div>
  );
}

// Re-export Button for convenience
export { Button } from '@repo/ui/components/shadcn/button';

