/**
 * Config Components for Parallel Plugins
 */

import React from 'react';
import type { NodeConfigProps } from '../../types/plugin';
import type { SplitConfig, JoinConfig } from './parallel';
import {
  ConfigSection,
  ConfigField,
  TextInput,
  NumberInput,
  Select,
  Checkbox,
  Button,
} from '../../../ui/components/config';

/**
 * Split Config Component
 */
export const SplitConfigComponent: React.FC<NodeConfigProps> = ({ config, onChange }) => {
  const typedConfig = config as SplitConfig;
  const branches = typedConfig.branches ?? [
    { id: 'branch1', name: 'Branch 1', handle: 'output-1' },
    { id: 'branch2', name: 'Branch 2', handle: 'output-2' },
  ];

  const handleBranchChange = (index: number, field: 'name' | 'id', value: string) => {
    const newBranches = [...branches];
    const currentBranch = newBranches[index];
    if (!currentBranch) return;
    newBranches[index] = {
      id: currentBranch.id,
      name: currentBranch.name,
      handle: `output-${String(index + 1)}`,
      [field]: value,
    };
    onChange({ ...typedConfig, branches: newBranches });
  };

  const addBranch = () => {
    const newIndex = branches.length + 1;
    const newBranches = [
      ...branches,
      {
        id: `branch${String(newIndex)}`,
        name: `Branch ${String(newIndex)}`,
        handle: `output-${String(newIndex)}`,
      },
    ];
    onChange({ ...typedConfig, branches: newBranches });
  };

  const removeBranch = (index: number) => {
    if (branches.length <= 2) return; // Minimum 2 branches
    const newBranches = branches.filter((_, i) => i !== index);
    onChange({ ...typedConfig, branches: newBranches });
  };

  return (
    <>
      <ConfigSection
        title="Parallel Branches"
        description="Configure the number and names of parallel execution branches"
      >
        {branches.map((branch, index) => (
          <div
            key={branch.id}
            style={{
              padding: '12px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-start',
            }}
          >
            <div style={{ flex: 1 }}>
              <ConfigField label="Branch Name">
                <TextInput
                  value={branch.name ?? ''}
                  onChange={(value) => { handleBranchChange(index, 'name', value); }}
                  placeholder={`Branch ${String(index + 1)}`}
                />
              </ConfigField>
            </div>
            {branches.length > 2 && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => { removeBranch(index); }}
              >
                ✕
              </Button>
            )}
          </div>
        ))}

        <Button variant="secondary" onClick={addBranch}>
          + Add Branch
        </Button>
      </ConfigSection>

      <ConfigSection title="Options">
        <Checkbox
          checked={typedConfig.cloneVariables ?? true}
          onChange={(checked) => {
            onChange({ ...typedConfig, cloneVariables: checked });
          }}
          label="Clone variables for each branch"
        />
      </ConfigSection>
    </>
  );
};

/**
 * Join Config Component
 */
export const JoinConfigComponent: React.FC<NodeConfigProps> = ({ config, onChange }) => {
  const typedConfig = config as JoinConfig;

  return (
    <>
      <ConfigSection
        title="Merge Strategy"
        description="How to combine results from parallel branches"
      >
        <ConfigField
          label="Strategy"
          description="Choose how to merge results from all branches"
        >
          <Select
            value={typedConfig.mergeStrategy ?? 'all'}
            onChange={(value) => {
              onChange({ ...typedConfig, mergeStrategy: value as 'first' | 'last' | 'all' | 'custom' });
            }}
            options={[
              { label: 'All Results', value: 'all' },
              { label: 'First Result', value: 'first' },
              { label: 'Last Result', value: 'last' },
              { label: 'Custom', value: 'custom' },
            ]}
          />
        </ConfigField>

        <ConfigField
          label="Result Variable"
          description="Variable name to store the merged results"
        >
          <TextInput
            value={typedConfig.resultVariable ?? ''}
            onChange={(value) => {
              onChange({ ...typedConfig, resultVariable: value });
            }}
            placeholder="results"
          />
        </ConfigField>
      </ConfigSection>

      <ConfigSection
        title="Timeout"
        description="Maximum time to wait for all branches to complete"
      >
        <ConfigField
          label="Timeout (ms)"
          description="Leave empty or 0 for no timeout"
        >
          <NumberInput
            value={typedConfig.timeout ?? 0}
            onChange={(value) => {
              onChange({ ...typedConfig, timeout: value || undefined });
            }}
            min={0}
            step={1000}
          />
        </ConfigField>
      </ConfigSection>
    </>
  );
};
