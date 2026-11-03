import type { SeasonCatalog } from './catalog'
import { SEASON_1 } from './season-1-checklist'
import { SEASON_2 } from './season-2-checklist'
import { SEASON_3 } from './season-3-checklist'

const CATALOGS: SeasonCatalog[] = [SEASON_1, SEASON_2, SEASON_3]

// Reads `--season=N` (or `--season N`) from the command line; defaults to Season 1.
export function seasonFromArgs(argv = process.argv): SeasonCatalog {
  const index = argv.findIndex((arg) => arg === '--season' || arg.startsWith('--season='))
  const value = index < 0 ? '1' : argv[index].includes('=') ? argv[index].split('=')[1] : argv[index + 1]
  const catalog = CATALOGS.find(({ season }) => String(season) === value)
  if (!catalog) {
    throw new Error(
      `No checklist for season "${value}". Available: ${CATALOGS.map(({ season }) => season).join(', ')}.`
    )
  }
  return catalog
}
