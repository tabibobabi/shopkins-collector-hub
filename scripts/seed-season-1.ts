import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })
config()

type Rarity = 'Common' | 'Rare' | 'Ultra Rare' | 'Special Edition' | 'Limited Edition'

type ColorTag =
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

type ChecklistEntry = [shopkinId: string, name: string, rarity: Rarity, colors: [ColorTag, ColorTag]]

type ChecklistTeam = {
  team: string
  first: number
  last: number
  entries: ChecklistEntry[]
}

type SeasonOneShopkin = {
  shopkinId: string | null
  name: string
  team: string
  rarity: string
  finish: string
  colors: ColorTag[] | null
}

type CharacterRow = {
  id: string
  name: string
  base_category: string
}

type ItemRow = {
  id: string
  character_id: string
  variant_name: string
  season: number | null
}

// Transcribed from data/checklists/season_01_checklist.jpg (Moose 2013 collector's guide, 1-001 to 1-142).
// Character names keep the spellings already stored in `characters` so existing rows are reused;
// the checklist prints "Little Sipper" for Sippa and "Frozen" for the Frozen Food team.
const CHECKLIST_TEAMS: ChecklistTeam[] = [
  {
    team: 'Fruit & Veg',
    first: 1,
    last: 14,
    entries: [
      ['1-001', 'Apple Blossom', 'Common', ['Red', 'Green']],
      ['1-002', "Rockin' Broc", 'Common', ['Green', 'Pink']],
      ['1-003', 'Strawberry Kiss', 'Rare', ['Pink', 'Green']],
      ['1-004', 'Pineapple Crush', 'Common', ['Yellow', 'Orange']],
      ['1-005', 'Melonie Pips', 'Ultra Rare', ['Pink', 'Green']],
      ['1-006', 'Miss Mushy-moo', 'Common', ['Red', 'White']],
      ['1-007', 'Posh Pear', 'Common', ['Green', 'Yellow']],
      ['1-008', 'Apple Blossom', 'Common', ['Green', 'Yellow']],
      ['1-009', "Rockin' Broc", 'Common', ['Blue', 'Yellow']],
      ['1-010', 'Strawberry Kiss', 'Rare', ['Green', 'Yellow']],
      ['1-011', 'Pineapple Crush', 'Common', ['Orange', 'Yellow']],
      ['1-012', 'Melonie Pips', 'Ultra Rare', ['Yellow', 'Green']],
      ['1-013', 'Miss Mushy-moo', 'Common', ['Green', 'White']],
      ['1-014', 'Posh Pear', 'Common', ['Blue', 'Orange']],
    ],
  },
  {
    team: 'Pantry',
    first: 15,
    last: 32,
    entries: [
      ['1-015', 'Tommy Ketchup', 'Common', ['Red', 'Pink']],
      ['1-016', 'Nutty Butter', 'Rare', ['Orange', 'Brown']],
      ['1-017', 'Peppe Pepper', 'Common', ['Purple', 'White']],
      ['1-018', 'Sally Shakes', 'Rare', ['Blue', 'White']],
      ['1-019', 'Sugar Lump', 'Ultra Rare', ['Pink', 'White']],
      ['1-020', 'Breaky Crunch', 'Ultra Rare', ['Pink', 'White']],
      ['1-021', 'Alpha Soup', 'Rare', ['Red', 'Orange']],
      ['1-022', 'Gran Jam', 'Common', ['Purple', 'Yellow']],
      ['1-023', 'Coolio', 'Common', ['Green', 'White']],
      ['1-024', 'Tommy Ketchup', 'Common', ['Green', 'Yellow']],
      ['1-025', 'Nutty Butter', 'Rare', ['Orange', 'Pink']],
      ['1-026', 'Peppe Pepper', 'Common', ['Blue', 'White']],
      ['1-027', 'Sally Shakes', 'Rare', ['Green', 'Yellow']],
      ['1-028', 'Sugar Lump', 'Ultra Rare', ['Blue', 'White']],
      ['1-029', 'Breaky Crunch', 'Ultra Rare', ['Purple', 'White']],
      ['1-030', 'Alpha Soup', 'Rare', ['Orange', 'Yellow']],
      ['1-031', 'Gran Jam', 'Common', ['Pink', 'Green']],
      ['1-032', 'Coolio', 'Common', ['Blue', 'White']],
    ],
  },
  {
    team: 'Bakery',
    first: 33,
    last: 46,
    entries: [
      ['1-033', 'Bread Head', 'Common', ['Pink', 'White']],
      ['1-034', 'Creamy Bun-bun', 'Rare', ['Yellow', 'Pink']],
      ['1-035', "D'lish Donut", 'Ultra Rare', ['Pink', 'Brown']],
      ['1-036', 'Cheese Kate', 'Common', ['White', 'Orange']],
      ['1-037', 'Mini Muffin', 'Common', ['Purple', 'Yellow']],
      ['1-038', 'Flutter Cake', 'Common', ['Yellow', 'Pink']],
      ['1-039', 'Kooky Cookie', 'Ultra Rare', ['Pink', 'White']],
      ['1-040', 'Bread Head', 'Common', ['Yellow', 'Blue']],
      ['1-041', 'Creamy Bun-bun', 'Rare', ['Brown', 'Pink']],
      ['1-042', "D'lish Donut", 'Ultra Rare', ['Brown', 'Orange']],
      ['1-043', 'Cheese Kate', 'Common', ['Yellow', 'Pink']],
      ['1-044', 'Mini Muffin', 'Common', ['Pink', 'Brown']],
      ['1-045', 'Flutter Cake', 'Common', ['Blue', 'White']],
      ['1-046', 'Kooky Cookie', 'Ultra Rare', ['Yellow', 'Brown']],
    ],
  },
  {
    team: 'Sweet Treats',
    first: 47,
    last: 64,
    entries: [
      ['1-047', 'Bubbles', 'Rare', ['Pink', 'Blue']],
      ['1-048', 'Candy Kisses', 'Rare', ['Blue', 'White']],
      ['1-049', "Le'Quorice", 'Rare', ['Pink', 'White']],
      ['1-050', 'Cheeky Chocolate', 'Rare', ['Orange', 'Brown']],
      ['1-051', 'Candi Cotton', 'Ultra Rare', ['Pink', 'White']],
      ['1-052', 'Lolli Poppins', 'Rare', ['Pink', 'Purple']],
      ['1-053', 'Mandy Candy', 'Ultra Rare', ['Pink', 'Red']],
      ['1-054', 'Jelly B', 'Rare', ['Blue', 'Pink']],
      ['1-055', 'Miss Twist', 'Common', ['Red', 'Pink']],
      ['1-056', 'Bubbles', 'Rare', ['Green', 'Pink']],
      ['1-057', 'Candy Kisses', 'Rare', ['Green', 'Purple']],
      ['1-058', "Le'Quorice", 'Rare', ['Green', 'Pink']],
      ['1-059', 'Cheeky Chocolate', 'Rare', ['Pink', 'Yellow']],
      ['1-060', 'Candi Cotton', 'Ultra Rare', ['Yellow', 'Orange']],
      ['1-061', 'Lolli Poppins', 'Rare', ['Green', 'Pink']],
      ['1-062', 'Mandy Candy', 'Ultra Rare', ['Yellow', 'Orange']],
      ['1-063', 'Jelly B', 'Rare', ['Yellow', 'Pink']],
      ['1-064', 'Miss Twist', 'Common', ['Green', 'Yellow']],
    ],
  },
  {
    team: 'Dairy',
    first: 65,
    last: 80,
    entries: [
      ['1-065', 'Chee Zee', 'Common', ['Yellow', 'Orange']],
      ['1-066', 'Swiss Miss', 'Common', ['Yellow', 'Orange']],
      ['1-067', 'Spilt Milk', 'Rare', ['Blue', 'White']],
      ['1-068', 'Ghurty', 'Rare', ['Blue', 'Yellow']],
      ['1-069', 'Millie Shake', 'Ultra Rare', ['Pink', 'Brown']],
      ['1-070', 'Flava Ava', 'Common', ['Pink', 'White']],
      ['1-071', 'Dollops', 'Common', ['Purple', 'White']],
      ['1-072', 'Googy', 'Common', ['White', 'Yellow']],
      ['1-073', 'Chee Zee', 'Common', ['Blue', 'White']],
      ['1-074', 'Swiss Miss', 'Common', ['Pink', 'Red']],
      ['1-075', 'Spilt Milk', 'Rare', ['Green', 'White']],
      ['1-076', 'Ghurty', 'Rare', ['Green', 'Red']],
      ['1-077', 'Millie Shake', 'Ultra Rare', ['Brown', 'White']],
      ['1-078', 'Flava Ava', 'Common', ['Orange', 'Brown']],
      ['1-079', 'Dollops', 'Common', ['Blue', 'White']],
      ['1-080', 'Googy', 'Common', ['Yellow', 'Orange']],
    ],
  },
  {
    team: 'Party Food',
    first: 81,
    last: 100,
    entries: [
      ['1-081', 'Crispy Chip', 'Rare', ['Blue', 'Yellow']],
      ['1-082', 'Pretz-elle', 'Rare', ['Orange', 'Brown']],
      ['1-083', 'Wobbles', 'Common', ['Green', 'Yellow']],
      ['1-084', 'Rainbow Bite', 'Common', ['Orange', 'Pink']],
      ['1-085', 'Wishes', 'Ultra Rare', ['Pink', 'White']],
      ['1-086', 'Frank Furter', 'Common', ['Yellow', 'Orange']],
      ['1-087', 'Sippa', 'Common', ['Red', 'Yellow']],
      ['1-088', 'Fairy Crumbs', 'Common', ['White', 'Green']],
      ['1-089', 'Cheezey B', 'Rare', ['Orange', 'Yellow']],
      ['1-090', 'Soda Pops', 'Ultra Rare', ['Green', 'Pink']],
      ['1-091', 'Crispy Chip', 'Rare', ['Green', 'Blue']],
      ['1-092', 'Pretz-elle', 'Rare', ['Orange', 'Yellow']],
      ['1-093', 'Wobbles', 'Common', ['Blue', 'White']],
      ['1-094', 'Rainbow Bite', 'Common', ['Pink', 'Orange']],
      ['1-095', 'Wishes', 'Ultra Rare', ['Yellow', 'White']],
      ['1-096', 'Frank Furter', 'Common', ['Orange', 'Yellow']],
      ['1-097', 'Sippa', 'Common', ['Green', 'Yellow']],
      ['1-098', 'Fairy Crumbs', 'Common', ['Yellow', 'Pink']],
      ['1-099', 'Cheezey B', 'Rare', ['Orange', 'Brown']],
      ['1-100', 'Soda Pops', 'Ultra Rare', ['Blue', 'Red']],
    ],
  },
  {
    team: 'Health & Beauty',
    first: 101,
    last: 120,
    entries: [
      ['1-101', 'Scrubs', 'Common', ['Green', 'White']],
      ['1-102', 'Lippy Lips', 'Rare', ['Pink', 'White']],
      ['1-103', 'Curly', 'Common', ['Purple', 'Pink']],
      ['1-104', 'Shampy', 'Common', ['White', 'Silver']],
      ['1-105', 'Silky', 'Common', ['Blue', 'Yellow']],
      ['1-106', 'Bubble Tubs', 'Ultra Rare', ['Pink', 'White']],
      ['1-107', 'Chap-elli', 'Rare', ['Blue', 'White']],
      ['1-108', 'Polly Polish', 'Ultra Rare', ['Red', 'Pink']],
      ['1-109', 'Suds', 'Common', ['Purple', 'Yellow']],
      ['1-110', 'Toofs', 'Common', ['Green', 'White']],
      ['1-111', 'Scrubs', 'Common', ['Blue', 'White']],
      ['1-112', 'Lippy Lips', 'Rare', ['Green', 'Red']],
      ['1-113', 'Curly', 'Common', ['Blue', 'Pink']],
      ['1-114', 'Shampy', 'Common', ['Yellow', 'Pink']],
      ['1-115', 'Silky', 'Common', ['Pink', 'Purple']],
      ['1-116', 'Bubble Tubs', 'Ultra Rare', ['Blue', 'White']],
      ['1-117', 'Chap-elli', 'Rare', ['Green', 'Pink']],
      ['1-118', 'Polly Polish', 'Ultra Rare', ['Yellow', 'Orange']],
      ['1-119', 'Suds', 'Common', ['Blue', 'White']],
      ['1-120', 'Toofs', 'Common', ['Blue', 'White']],
    ],
  },
  {
    team: 'Frozen Food',
    first: 121,
    last: 136,
    entries: [
      ['1-121', 'Ice Cream Dream', 'Special Edition', ['Orange', 'Clear']],
      ['1-122', 'Popsi Cool', 'Special Edition', ['Orange', 'Clear']],
      ['1-123', 'Yo-chi', 'Special Edition', ['Orange', 'Clear']],
      ['1-124', 'Cool Cube', 'Special Edition', ['Green', 'Clear']],
      ['1-125', "Pa' Pizza", 'Special Edition', ['Green', 'Clear']],
      ['1-126', 'Snow Crush', 'Special Edition', ['Green', 'Clear']],
      ['1-127', 'Fishtix', 'Special Edition', ['Orange', 'Clear']],
      ['1-128', 'Freezy Peazy', 'Special Edition', ['Green', 'Clear']],
      ['1-129', 'Ice Cream Dream', 'Special Edition', ['Pink', 'Clear']],
      ['1-130', 'Popsi Cool', 'Special Edition', ['Pink', 'Clear']],
      ['1-131', 'Yo-chi', 'Special Edition', ['Pink', 'Clear']],
      ['1-132', 'Cool Cube', 'Special Edition', ['Blue', 'Clear']],
      ['1-133', "Pa' Pizza", 'Special Edition', ['Yellow', 'Clear']],
      ['1-134', 'Snow Crush', 'Special Edition', ['Blue', 'Clear']],
      ['1-135', 'Fishtix', 'Special Edition', ['Pink', 'Clear']],
      ['1-136', 'Freezy Peazy', 'Special Edition', ['Blue', 'Clear']],
    ],
  },
  {
    team: 'Limited Edition',
    first: 137,
    last: 142,
    entries: [
      ['1-137', 'Cupcake Queen', 'Limited Edition', ['Silver', 'Gold']],
      ['1-138', 'Buttercup', 'Limited Edition', ['Gold', 'Silver']],
      ['1-139', "Tin'a'tuna", 'Limited Edition', ['Silver', 'Gold']],
      ['1-140', 'Twinky Winks', 'Limited Edition', ['Gold', 'Silver']],
      ['1-141', 'Papa Tomato', 'Limited Edition', ['Red', 'Gold']],
      ['1-142', 'Sunny-screen', 'Limited Edition', ['Gold', 'Silver']],
    ],
  },
]

const CHECKLIST_SIZE = 142

// Season 1 store/playset exclusives are not on the blind-bag checklist, so they keep the legacy variant name.
// Baby is intentionally absent: it debuted as Season 2's special-edition team.
const SEASON_ONE_EXCLUSIVES = [
  'Pumpkinella',
  'Coco Nutty',
  'Rolly Roll',
  'Hot Apple Pie',
  'Margarina',
  "La'lotion",
  'Curly Fries',
  'Sponge Cake',
]

const FINISH_BY_RARITY: Partial<Record<Rarity, string>> = {
  'Ultra Rare': 'Glitter / Sparkle',
  'Special Edition': 'Translucent / Jelly',
  'Limited Edition': 'Metallic / Pearl',
}

const LEGACY_VARIANT_NAME = 'Season 1 Classic'

const SEASON_ONE_SHOPKINS: SeasonOneShopkin[] = [
  ...CHECKLIST_TEAMS.flatMap(({ team, entries }) =>
    entries.map(([shopkinId, name, rarity, colors]) => ({
      shopkinId,
      name,
      team,
      rarity,
      finish: FINISH_BY_RARITY[rarity] ?? 'Classic / Opaque',
      colors,
    }))
  ),
  ...SEASON_ONE_EXCLUSIVES.map((name) => ({
    shopkinId: null,
    name,
    team: 'Exclusive',
    rarity: 'Exclusive',
    finish: 'Classic / Opaque',
    colors: null,
  })),
]

function formatShopkinId(number: number) {
  return `1-${String(number).padStart(3, '0')}`
}

function validateChecklist() {
  const problems: string[] = []
  const seen = new Set<string>()

  for (const { team, first, last, entries } of CHECKLIST_TEAMS) {
    const expected = last - first + 1
    if (entries.length !== expected) {
      problems.push(`${team}: expected ${expected} entries, found ${entries.length}`)
    }

    entries.forEach(([shopkinId, name, , colors], index) => {
      const expectedId = formatShopkinId(first + index)
      if (shopkinId !== expectedId) {
        problems.push(`${team}: ${name} is ${shopkinId}, expected ${expectedId}`)
      }
      if (seen.has(shopkinId)) problems.push(`Duplicate checklist ID ${shopkinId}`)
      seen.add(shopkinId)
      if (new Set(colors).size !== 2) problems.push(`${shopkinId} needs two distinct colors`)
    })
  }

  for (let number = 1; number <= CHECKLIST_SIZE; number += 1) {
    const shopkinId = formatShopkinId(number)
    if (!seen.has(shopkinId)) problems.push(`Missing checklist ID ${shopkinId}`)
  }

  if (problems.length > 0) {
    throw new Error(`Season 1 checklist is invalid:\n- ${problems.join('\n- ')}`)
  }
}

function printSummary() {
  const rarities: Rarity[] = ['Common', 'Rare', 'Ultra Rare', 'Special Edition', 'Limited Edition']
  const rows = CHECKLIST_TEAMS.map(({ team, first, last, entries }) => {
    const row: Record<string, string | number> = {
      Team: team,
      IDs: `${formatShopkinId(first)} to ${formatShopkinId(last)}`,
    }
    for (const rarity of rarities) {
      row[rarity] = entries.filter(([, , entryRarity]) => entryRarity === rarity).length
    }
    row.Total = entries.length
    return row
  })

  const totals: Record<string, string | number> = { Team: 'All teams', IDs: '' }
  for (const key of [...rarities, 'Total']) {
    totals[key] = rows.reduce((sum, row) => sum + Number(row[key]), 0)
  }

  console.table([...rows, totals])
}

function placeholderImage(name: string) {
  return `https://placehold.co/600x600/FCE7F3/DB2777?text=${encodeURIComponent(name)}`
}

function nameKey(name: string) {
  return name.trim().toLocaleLowerCase()
}

function itemKey(characterId: string, variantName: string) {
  return `${characterId}|${variantName}`
}

function throwIfError(error: { message: string } | null, operation: string) {
  if (error) {
    throw new Error(`${operation}: ${error.message}`)
  }
}

async function main() {
  validateChecklist()
  printSummary()

  if (process.argv.includes('--dry-run')) {
    console.log(`Dry run: ${SEASON_ONE_SHOPKINS.length} listings validated, database not touched.`)
    return
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL and a Supabase key in .env.local. ' +
        'SUPABASE_SERVICE_ROLE_KEY is recommended for seeding.'
    )
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(
      'SUPABASE_SERVICE_ROLE_KEY is not set; using the public key. Row-level security may reject writes.'
    )
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Read existing rows before making changes so no database uniqueness constraint is required.
  const { data: existingCharacters, error: characterLookupError } = await supabase
    .from('characters')
    .select('id, name, base_category')

  throwIfError(characterLookupError, 'Could not read characters')

  const { data: existingItems, error: itemLookupError } = await supabase
    .from('items')
    .select('id, character_id, variant_name, season')

  throwIfError(itemLookupError, 'Could not read items')

  const characterByName = new Map(
    (existingCharacters as CharacterRow[] | null)?.map((character) => [
      nameKey(character.name),
      character,
    ])
  )

  const itemByKey = new Map<string, ItemRow>()
  for (const item of (existingItems as ItemRow[] | null) ?? []) {
    if (item.season !== 1) continue

    const key = itemKey(item.character_id, item.variant_name)
    if (!itemByKey.has(key)) itemByKey.set(key, item)
  }

  let charactersInserted = 0
  let charactersUpdated = 0
  let itemsInserted = 0
  let itemsUpdated = 0

  for (const shopkin of SEASON_ONE_SHOPKINS) {
    const key = nameKey(shopkin.name)
    let character = characterByName.get(key)

    if (character) {
      if (character.base_category !== shopkin.team) {
        const { error } = await supabase
          .from('characters')
          .update({ base_category: shopkin.team })
          .eq('id', character.id)

        throwIfError(error, `Could not update character ${shopkin.name}`)
        character = { ...character, base_category: shopkin.team }
        characterByName.set(key, character)
        charactersUpdated += 1
      }
    } else {
      const { data, error } = await supabase
        .from('characters')
        .insert({ name: shopkin.name, base_category: shopkin.team })
        .select('id, name, base_category')
        .single()

      throwIfError(error, `Could not insert character ${shopkin.name}`)
      character = data as CharacterRow
      characterByName.set(key, character)
      charactersInserted += 1
    }

    const label = shopkin.shopkinId ? `${shopkin.shopkinId} ${shopkin.name}` : shopkin.name
    const variantName = shopkin.shopkinId ?? LEGACY_VARIANT_NAME
    const itemFields = {
      variant_name: variantName,
      release_name: 'Season 1',
      release_year: 2014,
      release_type:
        shopkin.team === 'Exclusive' ? 'Playset Exclusive' : 'Main Season',
      team: shopkin.team,
      rarity: shopkin.rarity,
      finish: shopkin.finish,
      ...(shopkin.colors ? { color_tags: shopkin.colors } : {}),
    }

    // The first colorway of each character adopts its legacy one-per-character row,
    // keeping its photos and any collection/wishlist links.
    let existingItem = itemByKey.get(itemKey(character.id, variantName))
    if (!existingItem && shopkin.shopkinId) {
      const legacyKey = itemKey(character.id, LEGACY_VARIANT_NAME)
      existingItem = itemByKey.get(legacyKey)
      if (existingItem) itemByKey.delete(legacyKey)
    }

    if (existingItem) {
      const { error } = await supabase
        .from('items')
        .update(itemFields)
        .eq('id', existingItem.id)

      throwIfError(error, `Could not update item ${label}`)
      itemByKey.set(itemKey(character.id, variantName), { ...existingItem, variant_name: variantName })
      itemsUpdated += 1
    } else {
      const placeholderUrl = placeholderImage(shopkin.name)
      const { data, error } = await supabase
        .from('items')
        .insert({
          character_id: character.id,
          season: 1,
          images: [placeholderUrl],
          cover_image_url: placeholderUrl,
          ...itemFields,
        })
        .select('id, character_id, variant_name, season')
        .single()

      throwIfError(error, `Could not insert item ${label}`)
      itemByKey.set(itemKey(character.id, variantName), data as ItemRow)
      itemsInserted += 1
    }
  }

  console.log(
    `Seeded ${SEASON_ONE_SHOPKINS.length} Season 1 listings ` +
      `(${CHECKLIST_SIZE} checklist + ${SEASON_ONE_EXCLUSIVES.length} exclusives). ` +
      `Characters: ${charactersInserted} inserted, ${charactersUpdated} updated. ` +
      `Items: ${itemsInserted} inserted, ${itemsUpdated} updated without changing photos.`
  )
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
