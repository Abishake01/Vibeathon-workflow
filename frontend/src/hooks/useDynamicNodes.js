import { useState, useEffect } from 'react';

/**
 * Hook to fetch and manage dynamic nodes from backend
 */
export const useDynamicNodes = () => {
  const [dynamicNodes, setDynamicNodes] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDynamicNodes = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/dynamic-nodes/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.nodes && Array.isArray(data.nodes)) {
            // Convert dynamic nodes to nodeTypeDefinitions format
            const convertedNodes = {};
            data.nodes.forEach(node => {
              // Convert parameters array to properties object
              const properties = {};
              if (node.parameters && Array.isArray(node.parameters)) {
                node.parameters.forEach(param => {
                  properties[param.name] = {
                    type: param.type || 'text',
                    label: param.label || param.name,
                    required: param.required || false,
                    default: param.default,
                    description: param.description,
                    placeholder: param.placeholder,
                    options: param.options
                  };
                });
              }
              
              convertedNodes[node.id] = {
                name: node.name,
                category: node.category || 'Custom',
                color: node.color || '#6366f1',
                icon: node.icon || 'FiBox',
                description: node.description || '',
                nodeType: node.nodeType || 'action',
                properties: properties,
                inputs: node.inputs || [{ name: 'main', type: 'main', required: false, displayName: 'Input' }],
                outputs: node.outputs || [{ name: 'main', type: 'main', displayName: 'Output' }]
              };
              
              // Debug logging for web3 nodes
              if (node.id?.startsWith('web3-')) {
                console.log(`🔍 Web3 Node Conversion [${node.id}]:`, {
                  rawInputs: node.inputs,
                  rawOutputs: node.outputs,
                  convertedInputs: convertedNodes[node.id].inputs,
                  convertedOutputs: convertedNodes[node.id].outputs
                });
              }
            });
            setDynamicNodes(convertedNodes);
            console.log('✅ Loaded dynamic nodes:', Object.keys(convertedNodes));
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          setError(errorData.error || `Failed to fetch: ${response.status}`);
          console.warn('Failed to fetch dynamic nodes:', response.status);
        }
      } catch (err) {
        setError(err.message);
        console.error('Error fetching dynamic nodes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDynamicNodes();
  }, []);

  return { dynamicNodes, loading, error };
};

