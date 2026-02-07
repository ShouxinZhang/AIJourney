const ROOT_FRUIT_ICONS: Record<string, string> = {
  'vibe-coding': '🍊',
  'agent-dev': '🥝',
  'llm-fundamental': '🫐',
};

const DEFAULT_ROOT_ICON = '🍑';
const RANDOM_FRUITS = ['🍋', '🍑', '🍒', '🥭', '🍇', '🍓'];

export function getFruitIcon(id: string, depth: number): string {
  if (depth === 0) {
    return ROOT_FRUIT_ICONS[id] ?? DEFAULT_ROOT_ICON;
  }

  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }

  return RANDOM_FRUITS[Math.abs(hash) % RANDOM_FRUITS.length];
}
