/**
 * Config Component for If Condition Plugin
 */

import React from 'react';
import type { NodeConfigProps } from '../../types/plugin';
import type { IfConditionConfig, ElseIfBranch } from './if-condition';
import {
  ConfigSection,
  ConfigField,
  TextInput,
  TextArea,
  Button,
} from '../../../ui/components/config';

/**
 * If Condition Config Component
 */
export const IfConditionConfigComponent: React.FC<NodeConfigProps> = ({ config, onChange }) => {
  const typedConfig = config as IfConditionConfig;

  const addElseIfBranch = () => {
    const newIndex = (typedConfig.elseIfBranches?.length ?? 0) + 1;
    const newBranches: ElseIfBranch[] = [
      ...(typedConfig.elseIfBranches ?? []),
      {
        id: `elseif-${String(newIndex)}`,
        name: `Else If ${String(newIndex)}`,
        condition: '',
        handle: `elseif-${String(newIndex)}`,
      },
    ];
    onChange({ ...typedConfig, elseIfBranches: newBranches });
  };

  const updateElseIfBranch = (index: number, updates: Partial<ElseIfBranch>) => {
    const branches = typedConfig.elseIfBranches ?? [];
    const currentBranch = branches[index];
    if (!currentBranch) return;
    
    const newBranches = [...branches];
    newBranches[index] = { ...currentBranch, ...updates };
    onChange({ ...typedConfig, elseIfBranches: newBranches });
  };

  const removeElseIfBranch = (index: number) => {
    const newBranches = (typedConfig.elseIfBranches ?? []).filter((_, i) => i !== index);
    onChange({ ...typedConfig, elseIfBranches: newBranches });
  };

  return (
    <>
      <ConfigSection
        title="If Condition"
        description="The primary condition to evaluate"
      >
        <ConfigField
          label="Condition"
          description="JavaScript expression that evaluates to true or false"
          required
        >
          <TextArea
            value={typedConfig.ifCondition ?? ''}
            onChange={(value) => { onChange({ ...typedConfig, ifCondition: value }); }}
            placeholder="e.g., data.status === 'active' && data.count > 0"
            rows={2}
          />
        </ConfigField>
      </ConfigSection>

      <ConfigSection
        title="Else-If Branches"
        description="Optional additional conditions checked in order"
      >
        {(typedConfig.elseIfBranches ?? []).map((branch, index) => (
          <div
            key={branch.id}
            style={{
              padding: '12px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              marginBottom: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <ConfigField label="Branch Name">
                <TextInput
                  value={branch.name ?? ''}
                  onChange={(value) => { updateElseIfBranch(index, { name: value }); }}
                  placeholder={`Else If ${String(index + 1)}`}
                />
              </ConfigField>
              <Button
                variant="danger"
                size="sm"
                onClick={() => { removeElseIfBranch(index); }}
              >
                ✕
              </Button>
            </div>
            <ConfigField
              label="Condition"
              description="Evaluated if previous conditions are false"
              required
            >
              <TextArea
                value={branch.condition}
                onChange={(value) => { updateElseIfBranch(index, { condition: value }); }}
                placeholder="e.g., data.status === 'pending'"
                rows={2}
              />
            </ConfigField>
          </div>
        ))}

        <Button variant="secondary" onClick={addElseIfBranch}>
          + Add Else-If Branch
        </Button>
      </ConfigSection>

      <ConfigSection
        title="Else Branch"
        description="Executed when all conditions are false (always present)"
      >
        <div
          style={{
            padding: '12px',
            backgroundColor: '#f9fafb',
            borderRadius: '6px',
            color: '#6b7280',
            fontSize: '13px',
          }}
        >
          The else branch is automatically available and will be taken when none of the above conditions match.
        </div>
      </ConfigSection>
    </>
  );
};
