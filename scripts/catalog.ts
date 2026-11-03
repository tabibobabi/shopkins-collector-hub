export type Rarity = 'Common' | 'Rare' | 'Ultra Rare' | 'Special Edition' | 'Limited Edition'

export type ColorTag =
  | 'Pink'
  | 'Blue'
  | 'Yellow'
  | 'Green'
  | 'Purple'
  | 'Orange'
  | 'White'
  | 'Brown'
  | 'Red'
  | 'Clear'
  | 'Gold'
  | 'Silver'

export type ChecklistEntry = [shopkinId: string, name: string, rarity: Rarity, colors: [ColorTag, ColorTag]]

export type ChecklistTeam = {
  team: string
  first: number
  last: number
  entries: ChecklistEntry[]
}

export type ImageKind = 'illustration' | 'photo'

export type SeasonCatalog = {
  season: number
  releaseYear: number
  // Scan the checklist was transcribed from, referenced in validation errors.
  checklistSource: string
  teams: ChecklistTeam[]
  checklistSize: number
  // Store/playset exclusives already in `characters` that the blind-bag checklist doesn't number.
  exclusives: string[]
  finishByRarity: Partial<Record<Rarity, string>>
  // Fandom page titles that differ from the names stored in `characters`.
  wikiTitles: Record<string, string>
  // Hand-checked Fandom files for records the gallery scraper can't place, keyed by checklist ID or slug.
  imageOverrides: Record<string, Partial<Record<ImageKind, string>>>
  // Fandom art files whose first capture group is this season's checklist number, e.g. "File:SPK 058.png".
  // Only trusted on the character's own gallery: other seasons reuse the same numbers.
  numberedArtFile?: RegExp
}

export type CatalogShopkin = {
  shopkinId: string | null
  name: string
  team: string
  rarity: string
  finish: string
  colors: ColorTag[] | null
}

export const DEFAULT_FINISH = 'Classic / Opaque'
export const STORAGE_BUCKET = 'shopkins-images'

export function releaseName(season: number) {
  return `Season ${season}`
}

// Variant name of the one-row-per-character listings that predate checklist IDs.
export function legacyVariantName(season: number) {
  return `Season ${season} Classic`
}

export function formatShopkinId(season: number, number: number) {
  return `${season}-${String(number).padStart(3, '0')}`
}

export function imageManifestPath(season: number) {
  return `data/season-${season}-images.json`
}

export function catalogShopkins(catalog: SeasonCatalog): CatalogShopkin[] {
  return [
    ...catalog.teams.flatMap(({ team, entries }) =>
      entries.map(([shopkinId, name, rarity, colors]) => ({
        shopkinId,
        name,
        team,
        rarity,
        finish: catalog.finishByRarity[rarity] ?? DEFAULT_FINISH,
        colors,
      }))
    ),
    ...catalog.exclusives.map((name) => ({
      shopkinId: null,
      name,
      team: 'Exclusive',
      rarity: 'Exclusive',
      finish: DEFAULT_FINISH,
      colors: null,
    })),
  ]
}

export type ManifestImage = {
  // Object path inside STORAGE_BUCKET, e.g. "season-1/illustrations/1-001-apple-blossom.webp".
  path: string
  // Fandom file the image was downloaded from, kept so a wrong match can be traced and overridden.
  source: string
}

export type ImageManifest = Record<string, Partial<Record<ImageKind, ManifestImage>>>

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// Checklist entries are keyed by printed ID; exclusives have none, so they use the character slug.
export function imageKey(shopkin: Pick<CatalogShopkin, 'shopkinId' | 'name'>) {
  return shopkin.shopkinId ?? slugify(shopkin.name)
}
