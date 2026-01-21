/**
 * Variable Inspector Component
 * 
 * Displays and manages flow variables
 */

import React, { useState } from 'react';
import type { VariableInspectorProps } from '../types';

export const VariableInspector: React.FC<VariableInspectorProps> = ({
  variables,
  editable = true,
  onVariableChange,
  onVariableDelete,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editingVar, setEditingVar] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  if (isCollapsed) {
    return (
      <div
        style={{
          background: 'white',
          padding: '8px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          cursor: 'pointer',
        }}
        onClick={() => setIsCollapsed(false)}
      >
        <div style={{ fontSize: '14px', fontWeight: 500 }}>
          Variables ({Object.keys(variables).length})
        </div>
      </div>
    );
  }

  const handleEdit = (name: string) => {
    setEditingVar(name);
    setEditValue(JSON.stringify(variables[name], null, 2));
  };

  const handleSave = () => {
    if (!editingVar) return;
    try {
      const value = JSON.parse(editValue);
      onVariableChange?.(editingVar, value);
      setEditingVar(null);
    } catch (error) {
      alert('Invalid JSON value');
    }
  };

  return (
    <div
      style={{
        background: 'white',
        padding: '12px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        minWidth: '250px',
        maxWidth: '350px',
        maxHeight: '500px',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
          Variables
        </h3>
        <button
          onClick={() => setIsCollapsed(true)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '18px',
            padding: '0',
          }}
        >
          _
        </button>
      </div>

      {/* Variables List */}
      {Object.keys(variables).length === 0 ? (
        <div style={{ textAlign: 'center', color: '#6b7280', padding: '20px', fontSize: '14px' }}>
          No variables yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Object.entries(variables).map(([name, value]) => (
            <div
              key={name}
              style={{
                padding: '8px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                backgroundColor: editingVar === name ? '#eff6ff' : '#f9fafb',
              }}
            >
              {editingVar === name ? (
                <>
                  <div style={{ fontWeight: 500, marginBottom: '4px', fontSize: '14px' }}>
                    {name}
                  </div>
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '4px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      marginBottom: '4px',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={handleSave}
                      style={{
                        flex: 1,
                        padding: '4px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingVar(null)}
                      style={{
                        flex: 1,
                        padding: '4px',
                        backgroundColor: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: '4px', fontSize: '14px' }}>
                        {name}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#6b7280',
                          fontFamily: 'monospace',
                          maxWidth: '180px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={JSON.stringify(value)}
                      >
                        {JSON.stringify(value)}
                      </div>
                    </div>
                    {editable && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => handleEdit(name)}
                          style={{
                            padding: '2px 6px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onVariableDelete?.(name)}
                          style={{
                            padding: '2px 6px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
