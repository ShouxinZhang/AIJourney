/**
 * AI Journey 知识树读取层
 *
 * 线上读取: read-model.json（静态只读）
 * 本地编辑: PostgreSQL + Markdown，经同步脚本生成 read-model.json
 */

import readModel from './read-model.json';

export interface KnowledgeNode {
  id: string;
  label: string;
  description?: string;
  content?: string;
  children?: KnowledgeNode[];
  color?: string;
  docPath?: string;
  dependencies?: string[];
}

interface KnowledgeReadModel {
  meta: {
    generatedAt: string;
    source: string;
  };
  tree: KnowledgeNode[];
}

const model = readModel as KnowledgeReadModel;

export const knowledgeReadModelMeta = model.meta;
export const knowledgeTree: KnowledgeNode[] = model.tree;
