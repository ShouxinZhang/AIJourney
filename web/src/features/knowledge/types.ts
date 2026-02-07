import type { KnowledgeNode } from '../../data/knowledge-tree';

export type { KnowledgeNode };

export type ViewMode = 'folder' | 'graph';

export interface FolderRow {
  id: string;
  label: string;
  depth: number;
  hasChildren: boolean;
  color: string;
}

export interface TreeIndex {
  nodeById: Map<string, KnowledgeNode>;
  parentById: Map<string, string | null>;
  childrenById: Map<string, string[]>;
  colorById: Map<string, string>;
}

export interface FlowBuildResult {
  flowNodes: import('@xyflow/react').Node[];
  flowEdges: import('@xyflow/react').Edge[];
}
