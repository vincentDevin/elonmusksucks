import React, { useState, useCallback } from 'react';

interface ConditionNode {
  id: string;
  type: 'field' | 'operator' | 'value' | 'logical';
  value: string;
  children?: ConditionNode[];
}

interface VisualConditionBuilderProps {
  condition?: Record<string, unknown>;
  onConditionChange: (condition: Record<string, unknown>) => void;
  availableFields: Array<{ name: string; type: string; description: string }>;
  disabled?: boolean;
}

const OPERATORS = [
  { value: '==', label: 'Equals', types: ['string', 'number', 'boolean'] },
  { value: '!=', label: 'Not equals', types: ['string', 'number', 'boolean'] },
  { value: '>', label: 'Greater than', types: ['number'] },
  { value: '>=', label: 'Greater than or equal', types: ['number'] },
  { value: '<', label: 'Less than', types: ['number'] },
  { value: '<=', label: 'Less than or equal', types: ['number'] },
  { value: 'contains', label: 'Contains', types: ['string'] },
  { value: 'in', label: 'In array', types: ['string', 'number'] },
  { value: 'matches', label: 'Matches regex', types: ['string'] },
];

const LOGICAL_OPERATORS = [
  { value: 'and', label: 'AND', icon: '&&', color: 'text-blue-600' },
  { value: 'or', label: 'OR', icon: '||', color: 'text-green-600' },
];

export const VisualConditionBuilder: React.FC<VisualConditionBuilderProps> = ({
  condition,
  onConditionChange,
  availableFields,
  disabled = false,
}) => {
  const [conditionTree, setConditionTree] = useState<ConditionNode[]>(() => {
    return parseConditionToTree(condition || {});
  });

  const [draggedNode, setDraggedNode] = useState<ConditionNode | null>(null);
  const [showJsonView, setShowJsonView] = useState(false);

  // Convert condition object to visual tree structure
  function parseConditionToTree(cond: Record<string, unknown>): ConditionNode[] {
    const nodes: ConditionNode[] = [];

    for (const [key, value] of Object.entries(cond)) {
      if (key === 'and' || key === 'or') {
        // Logical operator with children
        if (Array.isArray(value)) {
          nodes.push({
            id: generateId(),
            type: 'logical',
            value: key,
            children: value.flatMap((item) =>
              typeof item === 'object' && item !== null
                ? parseConditionToTree(item as Record<string, unknown>)
                : [],
            ),
          });
        }
      } else {
        // Field condition
        const [field, operator] = parseFieldOperator(key);
        nodes.push({
          id: generateId(),
          type: 'field',
          value: field,
          children: [
            {
              id: generateId(),
              type: 'operator',
              value: operator || '==',
              children: [],
            },
            {
              id: generateId(),
              type: 'value',
              value: String(value),
              children: [],
            },
          ],
        });
      }
    }

    return nodes;
  }

  function parseFieldOperator(key: string): [string, string | null] {
    const operators = ['>=', '<=', '>', '<', '==', '!=', 'contains', 'in', 'matches'];
    for (const op of operators) {
      if (key.endsWith(` ${op}`)) {
        return [key.slice(0, -op.length - 1).trim(), op];
      }
    }
    return [key, null];
  }

  function generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Convert visual tree back to condition object
  const treeToCondition = useCallback((nodes: ConditionNode[]): Record<string, unknown> => {
    const condition: Record<string, unknown> = {};

    for (const node of nodes) {
      if (node.type === 'logical' && node.children) {
        const childConditions = node.children.map((child) => {
          if (child.type === 'field' && child.children?.length === 2) {
            const operator = child.children[0];
            const value = child.children[1];
            const key = operator.value === '==' ? child.value : `${child.value} ${operator.value}`;
            return { [key]: parseValue(value.value) };
          }
          return {};
        });
        condition[node.value] = childConditions;
      } else if (node.type === 'field' && node.children?.length === 2) {
        const operator = node.children[0];
        const value = node.children[1];
        const key = operator.value === '==' ? node.value : `${node.value} ${operator.value}`;
        condition[key] = parseValue(value.value);
      }
    }

    return condition;
  }, []);

  function parseValue(value: string): unknown {
    // Try to parse as number
    if (/^\d+(\.\d+)?$/.test(value)) {
      return parseFloat(value);
    }

    // Try to parse as boolean
    if (value === 'true') return true;
    if (value === 'false') return false;

    // Try to parse as array
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        return JSON.parse(value);
      } catch (e) {
        // Fall through to string
      }
    }

    // Return as string
    return value;
  }

  const updateConditionTree = useCallback(
    (newTree: ConditionNode[]) => {
      setConditionTree(newTree);
      const newCondition = treeToCondition(newTree);
      onConditionChange(newCondition);
    },
    [treeToCondition, onConditionChange],
  );

  const addCondition = () => {
    if (disabled) return;

    const newCondition: ConditionNode = {
      id: generateId(),
      type: 'field',
      value: availableFields[0]?.name || 'field',
      children: [
        {
          id: generateId(),
          type: 'operator',
          value: '==',
          children: [],
        },
        {
          id: generateId(),
          type: 'value',
          value: 'value',
          children: [],
        },
      ],
    };

    updateConditionTree([...conditionTree, newCondition]);
  };

  const addLogicalGroup = (logicalOp: 'and' | 'or') => {
    if (disabled) return;

    const newLogicalGroup: ConditionNode = {
      id: generateId(),
      type: 'logical',
      value: logicalOp,
      children: [
        {
          id: generateId(),
          type: 'field',
          value: availableFields[0]?.name || 'field',
          children: [
            {
              id: generateId(),
              type: 'operator',
              value: '==',
              children: [],
            },
            {
              id: generateId(),
              type: 'value',
              value: 'value',
              children: [],
            },
          ],
        },
      ],
    };

    updateConditionTree([...conditionTree, newLogicalGroup]);
  };

  const removeNode = (nodeId: string) => {
    if (disabled) return;

    const removeFromTree = (nodes: ConditionNode[]): ConditionNode[] => {
      return nodes
        .filter((node) => node.id !== nodeId)
        .map((node) => ({
          ...node,
          children: node.children ? removeFromTree(node.children) : undefined,
        }));
    };

    updateConditionTree(removeFromTree(conditionTree));
  };

  const updateNode = (nodeId: string, newValue: string) => {
    if (disabled) return;

    const updateInTree = (nodes: ConditionNode[]): ConditionNode[] => {
      return nodes.map((node) => {
        if (node.id === nodeId) {
          return { ...node, value: newValue };
        }
        return {
          ...node,
          children: node.children ? updateInTree(node.children) : undefined,
        };
      });
    };

    updateConditionTree(updateInTree(conditionTree));
  };

  const renderConditionNode = (node: ConditionNode, depth: number = 0): React.ReactNode => {
    const indentClass = `ml-${depth * 4}`;

    if (node.type === 'logical') {
      const logicalOp = LOGICAL_OPERATORS.find((op) => op.value === node.value);
      return (
        <div key={node.id} className={`${indentClass} border-l-2 border-gray-300 pl-4 my-2`}>
          <div className="flex items-center space-x-2 mb-2">
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium bg-gray-100 ${logicalOp?.color}`}
            >
              {logicalOp?.icon} {logicalOp?.label}
            </div>
            {!disabled && (
              <button
                onClick={() => removeNode(node.id)}
                className="text-error hover:text-error/80 p-1"
                title="Remove group"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9zM4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zM8 11a1 1 0 012 0v2a1 1 0 11-2 0v-2zm4 0a1 1 0 012 0v2a1 1 0 11-2 0v-2z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>
          <div className="space-y-2">
            {node.children?.map((child) => renderConditionNode(child, depth + 1))}
            {!disabled && (
              <button
                onClick={() => {
                  const newChild: ConditionNode = {
                    id: generateId(),
                    type: 'field',
                    value: availableFields[0]?.name || 'field',
                    children: [
                      {
                        id: generateId(),
                        type: 'operator',
                        value: '==',
                        children: [],
                      },
                      {
                        id: generateId(),
                        type: 'value',
                        value: 'value',
                        children: [],
                      },
                    ],
                  };
                  const updatedNode = {
                    ...node,
                    children: [...(node.children || []), newChild],
                  };
                  const updateInTree = (nodes: ConditionNode[]): ConditionNode[] => {
                    return nodes.map((n) =>
                      n.id === node.id
                        ? updatedNode
                        : {
                            ...n,
                            children: n.children ? updateInTree(n.children) : undefined,
                          },
                    );
                  };
                  updateConditionTree(updateInTree(conditionTree));
                }}
                className="text-sm text-primary hover:text-primary/80 px-2 py-1 border border-primary rounded-lg ml-4"
              >
                + Add condition
              </button>
            )}
          </div>
        </div>
      );
    }

    if (node.type === 'field') {
      const operator = node.children?.[0];
      const value = node.children?.[1];

      return (
        <div
          key={node.id}
          className={`${indentClass} flex items-center space-x-2 my-2 p-3 bg-surface rounded-lg border border-border`}
        >
          {/* Field Selector */}
          <select
            value={node.value}
            onChange={(e) => updateNode(node.id, e.target.value)}
            disabled={disabled}
            className="px-3 py-2 border border-border rounded bg-background text-content focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
          >
            {availableFields.map((field) => (
              <option key={field.name} value={field.name}>
                {field.name} ({field.type})
              </option>
            ))}
          </select>

          {/* Operator Selector */}
          {operator && (
            <select
              value={operator.value}
              onChange={(e) => updateNode(operator.id, e.target.value)}
              disabled={disabled}
              className="px-3 py-2 border border-border rounded bg-background text-content focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
            >
              {OPERATORS.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          )}

          {/* Value Input */}
          {value && (
            <input
              type="text"
              value={value.value}
              onChange={(e) => updateNode(value.id, e.target.value)}
              disabled={disabled}
              placeholder="Value"
              className="px-3 py-2 border border-border rounded bg-background text-content focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
            />
          )}

          {/* Remove Button */}
          {!disabled && (
            <button
              onClick={() => removeNode(node.id)}
              className="text-error hover:text-error/80 p-1"
              title="Remove condition"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-content">Visual Condition Builder</h4>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowJsonView(!showJsonView)}
            className="text-sm text-tertiary hover:text-content px-2 py-1 border border-border rounded"
          >
            {showJsonView ? 'Visual View' : 'JSON View'}
          </button>
        </div>
      </div>

      {showJsonView ? (
        /* JSON View */
        <div className="bg-background rounded-lg p-4 border border-border">
          <pre className="text-sm font-mono text-content overflow-x-auto">
            {JSON.stringify(treeToCondition(conditionTree), null, 2)}
          </pre>
        </div>
      ) : (
        /* Visual Builder */
        <div className="space-y-4">
          {/* Action Buttons */}
          {!disabled && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={addCondition}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors text-sm"
              >
                + Add Condition
              </button>
              <button
                onClick={() => addLogicalGroup('and')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors text-sm"
              >
                + Add AND Group
              </button>
              <button
                onClick={() => addLogicalGroup('or')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors text-sm"
              >
                + Add OR Group
              </button>
            </div>
          )}

          {/* Condition Tree */}
          <div className="min-h-32 bg-muted rounded-lg p-4 border-2 border-dashed border-border">
            {conditionTree.length > 0 ? (
              <div className="space-y-2">
                {conditionTree.map((node) => renderConditionNode(node))}
              </div>
            ) : (
              <div className="text-center text-tertiary py-8">
                <svg
                  className="w-12 h-12 mx-auto mb-4 text-tertiary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <p className="text-sm">No conditions defined</p>
                <p className="text-xs mt-1">Click "Add Condition" to get started</p>
              </div>
            )}
          </div>

          {/* Available Fields Reference */}
          <div className="bg-muted rounded-lg p-4">
            <h5 className="font-medium text-content mb-2">Available Fields</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
              {availableFields.map((field) => (
                <div key={field.name} className="flex items-center space-x-2">
                  <code className="text-primary bg-primary/10 px-2 py-1 rounded text-xs">
                    {field.name}
                  </code>
                  <span className="text-tertiary text-xs">({field.type})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Operators Reference */}
          <div className="bg-muted rounded-lg p-4">
            <h5 className="font-medium text-content mb-2">Available Operators</h5>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {OPERATORS.map((op) => (
                <div key={op.value} className="flex items-center space-x-2">
                  <code className="text-secondary bg-secondary/10 px-2 py-1 rounded">
                    {op.value}
                  </code>
                  <span className="text-tertiary">{op.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
