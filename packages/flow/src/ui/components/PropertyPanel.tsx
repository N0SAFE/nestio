/**
 * Property Panel Component
 * 
 * Displays and edits properties of selected node
 */

import React, { useState, useEffect } from 'react';
import type { PropertyPanelProps } from '../types';

export const PropertyPanel: React.FC<PropertyPanelProps> = ({
  node,
  plugin,
  onChange,
  onDelete,
}) => {
  const [config, setConfig] = useState(node?.config || {});

  useEffect(() => {
    setConfig(node?.config || {});
  }, [node]);

  if (!node || !plugin) return null;

  const handleConfigChange = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    onChange?.(node.id, newConfig);
  };

  return (
    <div
      style={{
        background: 'white',
        padding: '16px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        minWidth: '300px',
        maxWidth: '400px',
        maxHeight: '600px',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
          {node.label || plugin.name}
        </h3>
        <div style={{ fontSize: '12px', color: '#6b7280' }}>
          {plugin.description}
        </div>
      </div>

      {/* Node ID */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280', display: 'block', marginBottom: '4px' }}>
          Node ID
        </label>
        <input
          type="text"
          value={node.id}
          readOnly
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '14px',
            backgroundColor: '#f9fafb',
          }}
        />
      </div>

      {/* Label */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280', display: 'block', marginBottom: '4px' }}>
          Label
        </label>
        <input
          type="text"
          value={node.label || ''}
          onChange={(e) => onChange?.(node.id, { ...config, label: e.target.value })}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        />
      </div>

      {/* Description */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280', display: 'block', marginBottom: '4px' }}>
          Description
        </label>
        <textarea
          value={node.description || ''}
          onChange={(e) => onChange?.(node.id, { ...config, description: e.target.value })}
          rows={2}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '14px',
            resize: 'vertical',
          }}
        />
      </div>

      {/* Configuration */}
      {plugin.ConfigComponent ? (
        // Use plugin's custom config component
        <div style={{ paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
          <plugin.ConfigComponent
            config={config}
            onChange={(newConfig) => {
              setConfig(newConfig);
              onChange?.(node.id, newConfig);
            }}
          />
        </div>
      ) : (
        // Fallback to generic config rendering
        plugin.config && Object.keys(plugin.config).length > 0 && (
          <>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#6b7280',
                textTransform: 'uppercase',
                marginBottom: '12px',
                paddingTop: '12px',
                borderTop: '1px solid #e5e7eb',
              }}
            >
              Configuration
            </div>

            {Object.entries(plugin.config).map(([key, schema]) => (
              <div key={key} style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                  {key}
                </label>
                <input
                  type="text"
                  value={String(config[key] || '')}
                  onChange={(e) => handleConfigChange(key, e.target.value)}
                  placeholder={schema.description || ''}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                />
              </div>
            ))}
          </>
        )
      )}

      {/* Actions */}
      <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
        <button
          onClick={() => onDelete?.(node.id)}
          style={{
            width: '100%',
            padding: '8px 16px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Delete Node
        </button>
      </div>
    </div>
  );
};
