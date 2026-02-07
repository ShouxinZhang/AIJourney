-- AI Journey 知识库 PostgreSQL 初始化
-- 目标: 本地 CRUD（Postgres + Markdown），线上只读（JSON）

create table if not exists knowledge_nodes (
  id text primary key,
  label text not null,
  summary text,
  color text,
  parent_id text references knowledge_nodes(id) on delete cascade,
  doc_path text,
  doc_markdown text,
  doc_hash text,
  doc_synced_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint knowledge_nodes_doc_path_ck check (doc_path is null or length(trim(doc_path)) > 0)
);

create index if not exists idx_knowledge_nodes_parent on knowledge_nodes(parent_id, sort_order, id);

create table if not exists knowledge_dependencies (
  source_id text not null references knowledge_nodes(id) on delete cascade,
  target_id text not null references knowledge_nodes(id) on delete cascade,
  kind text not null default 'semantic',
  created_at timestamptz not null default now(),
  primary key (source_id, target_id, kind),
  constraint knowledge_dependencies_no_self_ck check (source_id <> target_id)
);

create index if not exists idx_knowledge_dependencies_source on knowledge_dependencies(source_id);
create index if not exists idx_knowledge_dependencies_target on knowledge_dependencies(target_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_knowledge_nodes_updated_at on knowledge_nodes;
create trigger trg_knowledge_nodes_updated_at
before update on knowledge_nodes
for each row
execute function set_updated_at();
