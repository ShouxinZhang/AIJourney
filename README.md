# AIJourney

[中文版本](README.zh-CN.md) | [English Home](README.md)

An interactive AI knowledge graph website that visualizes AI domain knowledge through **Folder View + Dependency Graph View + Online Reading**, helping teams build, navigate, and share structured AI learning paths efficiently.

## Our Core Value

We turn scattered AI knowledge into an **interactive, navigable knowledge graph** — enabling teams to learn, teach, and align on AI concepts faster, with lower communication overhead and a clearer path from fundamentals to production.

## Our Core Competitiveness

- **Structured Knowledge Visualization**: AI knowledge organized as an interactive graph with folder-based and dependency-based dual views, making complex topics intuitive and navigable.
- **Local-Edit + Online-Read Architecture**: Markdown files edited locally, synced to PostgreSQL, and published as a static read model — combining developer-friendly authoring with zero-cost deployment.
- **Agent-Driven Development Workflow**: Built-in Copilot Agent Skills automate build checks, dev logs, architecture docs, and knowledge sync — ensuring quality and traceability with minimal manual effort.
- **Modular & Extensible Design**: Each knowledge category is independently maintainable; new topics plug in without disrupting existing structure.

## Repository Structure

```
AIJourney/
├── .agents/skills/        # Copilot Agent Skills (automated workflows)
├── docs/
│   ├── architecture/      # Architecture docs & repo metadata
│   ├── dev_logs/          # Development logs (date-based archive)
│   └── knowledge/         # Leaf-node Markdown knowledge base
├── scripts/               # Build & ops scripts
│   ├── repo-metadata/     # Repo metadata management (scan/CRUD/PG sync)
│   ├── check_errors.sh    # Full build check (TSC + ESLint + Vite)
│   └── restart.sh         # One-click dev server start/restart
├── web/                   # Knowledge graph frontend (Vite + React + TS)
│   ├── src/               # Frontend source code
│   └── tools/             # Local dev tools (knowledge sync)
├── AGENTS.md              # AI Agent behavior spec (global instructions)
└── LICENSE                # MIT License
```

## Tech Stack

| Technology | Purpose |
|---|---|
| React 19 + TypeScript | UI framework with type safety |
| @xyflow/react | Interactive graph/node visualization |
| react-markdown | Online Markdown rendering |
| Vite | Build tool & dev server |
| Tailwind CSS | Styling |
| PostgreSQL | Knowledge structure & sync backend |
| Vitest | Automated testing |
| ESLint | Code quality |

## Knowledge Categories

| Category | Color | Description |
|---|---|---|
| Vibe Coding Skills | 🍊 Orange | AI-assisted programming techniques |
| Agent Dev | 🥝 Green | AI Agent development patterns |
| LLM Fundamental | 🫐 Purple | Large Language Model fundamentals |

## Quick Start

```bash
# Clone the repo
git clone https://github.com/ShouxinZhang/AIJourney.git
cd AIJourney

# Install dependencies
cd web && npm install

# Start dev server
npm run dev
```

## How to Use

- **Browse the knowledge graph**: Open the web app to explore AI topics via folder view or dependency graph view
- **Read knowledge articles**: Click any leaf node to read the full Markdown content inline
- **Add new knowledge**: Create Markdown files in `docs/knowledge/`, then run `npm run knowledge:publish-read` to sync

## Contributing

- Place new content in the most appropriate leaf module directory under `docs/knowledge/`
- Keep modules isolated — each feature stays within its own sub-module
- Review and follow `docs/architecture/repository-structure.md` before making changes
- After changes, update architecture docs and write dev logs in `docs/dev_logs/`

## License

[MIT](LICENSE)
