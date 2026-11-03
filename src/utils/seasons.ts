export interface SeasonTheme {
  tagline: string
  banner: string
  badge: string
}

const SEASON_THEMES: Record<number, SeasonTheme> = {
  1: {
    tagline: 'The original supermarket crew that started the craze.',
    banner: 'bg-primary-soft',
    badge: 'bg-primary text-on-primary',
  },
  2: {
    tagline: 'Jelly Ultra Rares, fuzzy Special Editions and sparkly Limited Editions.',
    banner: 'bg-lavender-soft',
    badge: 'bg-lavender text-lavender-ink',
  },
  3: {
    tagline: 'Choc-frosted Ultra Rares, pearly stationery and jeweled Limited Editions.',
    banner: 'bg-mint-soft',
    badge: 'bg-mint text-mint-ink',
  },
}

const FALLBACK_THEMES: SeasonTheme[] = [
  { tagline: '', banner: 'bg-sky-soft', badge: 'bg-sky text-sky-ink' },
  { tagline: '', banner: 'bg-butter-soft', badge: 'bg-butter text-butter-ink' },
]

export function seasonTheme(season: number): SeasonTheme {
  return SEASON_THEMES[season] ?? FALLBACK_THEMES[season % FALLBACK_THEMES.length]
}

export function parseSeasonParam(value: string | null) {
  return value && /^\d+$/.test(value) ? value : 'all'
}
