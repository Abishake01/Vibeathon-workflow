import { createMemoryNode } from '../base/nodeFactory';
import { textProperty } from '../base/commonProperties';

export const vectorStoreNodes = {
  'pinecone': createMemoryNode({
    name: 'Pinecone Vector Store',
    category: 'Vector Stores',
    color: '#7c3aed',
    icon: 'FiDatabase',
    description: 'Store and retrieve vectors in Pinecone',
    properties: {
      indexName: textProperty('Index Name', true),
      namespace: textProperty('Namespace', false)
    }
  }),

  'chroma': createMemoryNode({
    name: 'Chroma Vector Store',
    category: 'Vector Stores',
    color: '#7c3aed',
    icon: 'FiDatabase',
    description: 'Store and retrieve vectors in Chroma',
    properties: {
      collectionName: textProperty('Collection Name', true)
    }
  }),

  'in-memory-vector-store': createMemoryNode({
    name: 'In-Memory Vector Store',
    category: 'Vector Stores',
    color: '#7c3aed',
    icon: 'FiDatabase',
    description: 'Temporary vector storage in memory',
    properties: {}
  })
};
