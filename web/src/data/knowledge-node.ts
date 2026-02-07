export interface KnowledgeNode {
  id: string;
  label: string;
  kind?: 'folder' | 'node';
  description?: string;
  content?: string;
  children?: KnowledgeNode[];
  color?: string;
  docPath?: string;
  dependencies?: string[];
}

export interface KnowledgeReadModel {
  meta: {
    generatedAt: string;
    source: string;
  };
  tree: KnowledgeNode[];
}
