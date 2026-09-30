export const COLOR_MAP: Record<string, string> = {
  pink: '#f472b6',
  blue: '#60a5fa',
  yellow: '#facc15',
  green: '#4ade80',
  purple: '#c084fc',
  orange: '#fb923c',
  white: '#f3f4f6',
  brown: '#a8715a',
  red: '#f87171',
  clear: 'rgba(220, 220, 220, 0.7)',
  gold: '#fbbf24',
  silver: '#cbd5e1',
}

export function swatchColor(color: string) {
  return COLOR_MAP[color.toLowerCase()] ?? '#cbd5e1'
}

const RARITY_STYLES: Record<string, string> = {
  Common: 'bg-surface-3 text-ink-soft border-line',
  Rare: 'bg-mint-soft text-mint-ink border-mint',
  'Ultra Rare': 'bg-primary-soft text-primary-ink border-line-strong',
  'Special Edition': 'bg-sky-soft text-sky-ink border-sky',
  'Limited Edition': 'bg-butter-soft text-butter-ink border-butter',
}

export function rarityClass(rarity: string) {
  return RARITY_STYLES[rarity] ?? 'bg-lavender-soft text-lavender-ink border-lavender'
}

// Seeded checklist items store their printed checklist ID (e.g. "1-001") as the variant name.
const CHECKLIST_ID = /^(\d+)-(\d{3})$/

export function checklistNumber(variantName: string) {
  const match = CHECKLIST_ID.exec(variantName.trim())
  return match ? { season: Number(match[1]), number: Number(match[2]) } : null
}

export function variantLabel(variantName: string) {
  return checklistNumber(variantName) ? `#${variantName.trim()}` : variantName
}

export function compareChecklistOrder(a: string, b: string) {
  const first = checklistNumber(a)
  const second = checklistNumber(b)
  if (!first || !second) return Number(Boolean(second)) - Number(Boolean(first))
  return first.season - second.season || first.number - second.number
}
