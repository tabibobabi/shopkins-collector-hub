import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })
config()

type SeasonOneShopkin = {
  name: string
  team: string
  rarity: string
  finish: string
}

type CharacterRow = {
  id: string
  name: string
}

type ItemRow = {
  id: string
  character_id: string
  variant_name: string
  season: number
}

const SEASON_ONE_SHOPKINS: SeasonOneShopkin[] = [
  { name: 'Apple Blossom', team: 'Fruit & Veg', rarity: 'Common', finish: 'Classic / Opaque' },
  { name: 'Strawberry Kiss', team: 'Fruit & Veg', rarity: 'Rare', finish: 'Classic / Opaque' },
  { name: 'Pineapple Crush', team: 'Fruit & Veg', rarity: 'Common', finish: 'Classic / Opaque' },
  { name: "D'lish Donut", team: 'Bakery', rarity: 'Ultra Rare', finish: 'Glitter / Sparkle' },
  { name: 'Kooky Cookie', team: 'Bakery', rarity: 'Ultra Rare', finish: 'Glitter / Sparkle' },
  { name: 'Bread Head', team: 'Bakery', rarity: 'Common', finish: 'Classic / Opaque' },
  { name: 'Cheeky Chocolate', team: 'Sweet Treats', rarity: 'Rare', finish: 'Classic / Opaque' },
  { name: 'Bubbles', team: 'Sweet Treats', rarity: 'Rare', finish: 'Classic / Opaque' },
  { name: 'Chee Zee', team: 'Dairy', rarity: 'Common', finish: 'Classic / Opaque' },
  { name: 'Wishes', team: 'Party Food', rarity: 'Common', finish: 'Classic / Opaque' },
  { name: 'Lippy Lips', team: 'Health & Beauty', rarity: 'Common', finish: 'Classic / Opaque' },
  { name: 'Ice Cream Dream', team: 'Frozen', rarity: 'Special Edition', finish: 'Translucent / Jelly' },
  { name: 'Cupcake Queen', team: 'Limited Edition', rarity: 'Limited Edition', finish: 'Metallic / Pearl' },
]

const VARIANT_NAME = 'Season 1 Classic'

function placeholderImage(name: string) {
  return `https://placehold.co/600x600/FCE7F3/DB2777?text=${encodeURIComponent(name)}`
}

function throwIfError(error: { message: string } | null, operation: string) {
  if (error) {
    throw new Error(`${operation}: ${error.message}`)
  }
}

async function main() {
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
  const names = SEASON_ONE_SHOPKINS.map(({ name }) => name)

  const { data: currentCharacters, error: characterLookupError } = await supabase
    .from('characters')
    .select('id, name')
    .in('name', names)

  throwIfError(characterLookupError, 'Could not read characters')

  const characterByName = new Map(
    (currentCharacters as CharacterRow[] | null)?.map((character) => [
      character.name,
      character,
    ])
  )
  const existingCharacters = SEASON_ONE_SHOPKINS.flatMap(({ name, team }) => {
    const current = characterByName.get(name)
    return current ? [{ id: current.id, name, base_category: team }] : []
  })
  const newCharacters = SEASON_ONE_SHOPKINS.filter(
    ({ name }) => !characterByName.has(name)
  ).map(({ name, team }) => ({ name, base_category: team }))

  if (existingCharacters.length > 0) {
    const { error } = await supabase.from('characters').upsert(existingCharacters)
    throwIfError(error, 'Could not update characters')
  }

  if (newCharacters.length > 0) {
    const { error } = await supabase.from('characters').upsert(newCharacters)
    throwIfError(error, 'Could not insert characters')
  }

  const { data: savedCharacters, error: savedCharacterError } = await supabase
    .from('characters')
    .select('id, name')
    .in('name', names)

  throwIfError(savedCharacterError, 'Could not reload characters')

  const savedCharacterByName = new Map(
    (savedCharacters as CharacterRow[] | null)?.map((character) => [
      character.name,
      character,
    ])
  )
  const characterIds = Array.from(savedCharacterByName.values()).map(({ id }) => id)

  if (characterIds.length !== SEASON_ONE_SHOPKINS.length) {
    throw new Error('Some character rows were not returned after upserting.')
  }

  const { data: currentItems, error: itemLookupError } = await supabase
    .from('items')
    .select('id, character_id, variant_name, season')
    .eq('season', 1)
    .eq('variant_name', VARIANT_NAME)
    .in('character_id', characterIds)

  throwIfError(itemLookupError, 'Could not read Season 1 items')

  const itemByCharacterId = new Map(
    (currentItems as ItemRow[] | null)?.map((item) => [item.character_id, item])
  )
  const itemRows = SEASON_ONE_SHOPKINS.map((shopkin) => {
    const character = savedCharacterByName.get(shopkin.name)
    if (!character) {
      throw new Error(`Missing character ID for ${shopkin.name}`)
    }

    const imageUrl = placeholderImage(shopkin.name)
    const currentItem = itemByCharacterId.get(character.id)

    return {
      ...(currentItem ? { id: currentItem.id } : {}),
      character_id: character.id,
      variant_name: VARIANT_NAME,
      season: 1,
      release_type: 'Main Season',
      release_name: 'Season 1',
      release_year: 2014,
      team: shopkin.team,
      rarity: shopkin.rarity,
      finish: shopkin.finish,
      color_tags: [],
      images: [imageUrl],
      cover_image_url: imageUrl,
    }
  })
  const existingItems = itemRows.filter((item) => 'id' in item)
  const newItems = itemRows.filter((item) => !('id' in item))

  if (existingItems.length > 0) {
    const { error } = await supabase.from('items').upsert(existingItems)
    throwIfError(error, 'Could not update Season 1 items')
  }

  if (newItems.length > 0) {
    const { error } = await supabase.from('items').upsert(newItems)
    throwIfError(error, 'Could not insert Season 1 items')
  }

  console.log(
    `Seeded ${SEASON_ONE_SHOPKINS.length} Season 1 Shopkins ` +
      `(${newItems.length} inserted, ${existingItems.length} updated).`
  )
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
