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
  base_category: string
}

type ItemRow = {
  id: string
  character_id: string
  variant_name: string
  season: number | null
}

// Baby is intentionally absent: it debuted as Season 2's special-edition team.
const SEASON_ONE_SHOPKINS: SeasonOneShopkin[] = [
  // Fruit & Veg
  { name: 'Apple Blossom', team: 'Fruit & Veg', rarity: 'Common', finish: 'Classic / Opaque' },
  { name: "Rockin' Broc", team: 'Fruit & Veg', rarity: 'Common', finish: 'Classic / Opaque' },
  { name: 'Strawberry Kiss', team: 'Fruit & Veg', rarity: 'Rare', finish: 'Classic / Opaque' },
  { name: 'Pineapple Crush', team: 'Fruit & Veg', rarity: 'Common', finish: 'Classic / Opaque' },
  { name: 'Melonie Pips', team: 'Fruit & Veg', rarity: 'Ultra Rare', finish: 'Glitter / Sparkle' },
  { name: 'Miss Mushy-moo', team: 'Fruit & Veg', rarity: 'Common', finish: 'Classic / Opaque' },
  { name: 'Posh Pear', team: 'Fruit & Veg', rarity: 'Common', finish: 'Classic / Opaque' },

  // Pantry
  { name: 'Tommy Ketchup', team: 'Pantry', rarity: 'Common', finish: 'Classic / Opaque' },
  { name: 'Nutty Butter', team: 'Pantry', rarity: 'Rare', finish: 'Classic / Opaque' },
  { name: 'Peppe Pepper', team: 'Pantry', rarity: 'Common', finish: 'Classic / Opaque' },
  { name: 'Sally Shakes', team: 'Pantry', rarity: 'Rare', finish: 'Classic / Opaque' },
  { name: 'Sugar Lump', team: 'Pantry', rarity: 'Ultra Rare', finish: 'Glitter / Sparkle' },
  { name: 'Breaky Crunch', team: 'Pantry', rarity: 'Ultra Rare', finish: 'Glitter / Sparkle' },
  { name: 'Alpha Soup', team: 'Pantry', rarity: 'Rare', finish: 'Classic / Opaque' },
  { name: 'Gran Jam', team: 'Pantry', rarity: 'Common', finish: 'Classic / Opaque' },
  { name: 'Coolio', team: 'Pantry', rarity: 'Common', finish: 'Classic / Opaque' },

  // Bakery
  { name: "D'lish Donut", team: 'Bakery', rarity: 'Ultra Rare', finish: 'Glitter / Sparkle' },
  { name: 'Kooky Cookie', team: 'Bakery', rarity: 'Ultra Rare', finish: 'Glitter / Sparkle' },
  { name: 'Bread Head', team: 'Bakery', rarity: 'Common', finish: 'Classic / Opaque' },
  { name: 'Creamy Bun-bun', team: 'Bakery', rarity: 'Rare', finish: 'Classic / Opaque' },
  { name: 'Cheese Kate', team: 'Bakery', rarity: 'Common', finish: 'Classic / Opaque' },
  { name: 'Mini Muffin', team: 'Bakery', rarity: 'Common', finish: 'Classic / Opaque' },
  { name: 'Flutter Cake', team: 'Bakery', rarity: 'Common', finish: 'Classic / Opaque' },

  // Sweet Treats
  { name: 'Cheeky Chocolate', team: 'Sweet Treats', rarity: 'Rare', finish: 'Classic / Opaque' },
  { name: 'Bubbles', team: 'Sweet Treats', rarity: 'Rare', finish: 'Classic / Opaque' },
  { name: 'Candy Kisses', team: 'Sweet Treats', rarity: 'Rare', finish: 'Classic / Opaque' },
  { name: "Le'Quorice", team: 'Sweet Treats', rarity: 'Rare', finish: 'Classic / Opaque' },
  { name: 'Candi Cotton', team: 'Sweet Treats', rarity: 'Ultra Rare', finish: 'Glitter / Sparkle' },
  { name: 'Lolli Poppins', team: 'Sweet Treats', rarity: 'Rare', finish: 'Classic / Opaque' },
  { name: 'Mandy Candy', team: 'Sweet Treats', rarity: 'Ultra Rare', finish: 'Glitter / Sparkle' },
  { name: 'Jelly B', team: 'Sweet Treats', rarity: 'Rare', finish: 'Classic / Opaque' },
  { name: 'Miss Twist', team: 'Sweet Treats', rarity: 'Common', finish: 'Classic / Opaque' },

  // Dairy
  { name: 'Chee Zee', team: 'Dairy', rarity: 'Common', finish: 'Classic / Opaque' },
  { name: 'Swiss Miss', team: 'Dairy', rarity: 'Common', finish: 'Classic / Opaque' },
  { name: 'Spilt Milk', team: 'Dairy', rarity: 'Rare', finish: 'Classic / Opaque' },
  { name: 'Ghurty', team: 'Dairy', rarity: 'Rare', finish: 'Classic / Opaque' },
  { name: 'Millie Shake', team: 'Dairy', rarity: 'Ultra Rare', finish: 'Glitter / Sparkle' },
  { name: 'Flava Ava', team: 'Dairy', rarity: 'Common', finish: 'Classic / Opaque' },
  { name: 'Dollops', team: 'Dairy', rarity: 'Common', finish: 'Classic / Opaque' },
  { name: 'Googy', team: 'Dairy', rarity: 'Common', finish: 'Classic / Opaque' },

  // Party Food
  { name: 'Crispy Chip', team: 'Party Food', rarity: 'Rare', finish: 'Classic / Opaque' },
  { name: 'Pretz-elle', team: 'Party Food', rarity: 'Rare', finish: 'Classic / Opaque' },
  { name: 'Wobbles', team: 'Party Food', rarity: 'Common', finish: 'Classic / Opaque' },
  { name: 'Rainbow Bite', team: 'Party Food', rarity: 'Common', finish: 'Classic / Opaque' },
  { name: 'Wishes', team: 'Party Food', rarity: 'Ultra Rare', finish: 'Glitter / Sparkle' },
  { name: 'Frank Furter', team: 'Party Food', rarity: 'Common', finish: 'Classic / Opaque' },
  { name: 'Sippa', team: 'Party Food', rarity: 'Common', finish: 'Classic / Opaque' },
  { name: 'Fairy Crumbs', team: 'Party Food', rarity: 'Common', finish: 'Classic / Opaque' },
  { name: 'Cheezey B', team: 'Party Food', rarity: 'Rare', finish: 'Classic / Opaque' },
  { name: 'Soda Pops', team: 'Party Food', rarity: 'Ultra Rare', finish: 'Glitter / Sparkle' },

  // Health & Beauty
  { name: 'Scrubs', team: 'Health & Beauty', rarity: 'Common', finish: 'Classic / Opaque' },
  { name: 'Lippy Lips', team: 'Health & Beauty', rarity: 'Rare', finish: 'Classic / Opaque' },
  { name: 'Curly', team: 'Health & Beauty', rarity: 'Common', finish: 'Classic / Opaque' },
  { name: 'Shampy', team: 'Health & Beauty', rarity: 'Common', finish: 'Classic / Opaque' },
  { name: 'Silky', team: 'Health & Beauty', rarity: 'Common', finish: 'Classic / Opaque' },
  { name: 'Bubble Tubs', team: 'Health & Beauty', rarity: 'Ultra Rare', finish: 'Glitter / Sparkle' },
  { name: 'Chap-elli', team: 'Health & Beauty', rarity: 'Rare', finish: 'Classic / Opaque' },
  { name: 'Polly Polish', team: 'Health & Beauty', rarity: 'Ultra Rare', finish: 'Glitter / Sparkle' },
  { name: 'Suds', team: 'Health & Beauty', rarity: 'Common', finish: 'Classic / Opaque' },
  { name: 'Toofs', team: 'Health & Beauty', rarity: 'Common', finish: 'Classic / Opaque' },

  // Frozen Food (Season 1's special-edition team)
  { name: 'Ice Cream Dream', team: 'Frozen Food', rarity: 'Special Edition', finish: 'Translucent / Jelly' },
  { name: 'Popsi Cool', team: 'Frozen Food', rarity: 'Special Edition', finish: 'Translucent / Jelly' },
  { name: 'Yo-chi', team: 'Frozen Food', rarity: 'Special Edition', finish: 'Translucent / Jelly' },
  { name: 'Cool Cube', team: 'Frozen Food', rarity: 'Special Edition', finish: 'Translucent / Jelly' },
  { name: "Pa' Pizza", team: 'Frozen Food', rarity: 'Special Edition', finish: 'Translucent / Jelly' },
  { name: 'Snow Crush', team: 'Frozen Food', rarity: 'Special Edition', finish: 'Translucent / Jelly' },
  { name: 'Fishtix', team: 'Frozen Food', rarity: 'Special Edition', finish: 'Translucent / Jelly' },
  { name: 'Freezy Peazy', team: 'Frozen Food', rarity: 'Special Edition', finish: 'Translucent / Jelly' },

  // Limited Edition
  { name: 'Cupcake Queen', team: 'Limited Edition', rarity: 'Limited Edition', finish: 'Metallic / Pearl' },
  { name: 'Buttercup', team: 'Limited Edition', rarity: 'Limited Edition', finish: 'Metallic / Pearl' },
  { name: "Tin'a'tuna", team: 'Limited Edition', rarity: 'Limited Edition', finish: 'Metallic / Pearl' },
  { name: 'Twinky Winks', team: 'Limited Edition', rarity: 'Limited Edition', finish: 'Metallic / Pearl' },
  { name: 'Papa Tomato', team: 'Limited Edition', rarity: 'Limited Edition', finish: 'Metallic / Pearl' },
  { name: 'Sunny-screen', team: 'Limited Edition', rarity: 'Limited Edition', finish: 'Metallic / Pearl' },

  // Season 1 store/playset exclusives
  { name: 'Pumpkinella', team: 'Exclusive', rarity: 'Exclusive', finish: 'Classic / Opaque' },
  { name: 'Coco Nutty', team: 'Exclusive', rarity: 'Exclusive', finish: 'Classic / Opaque' },
  { name: 'Rolly Roll', team: 'Exclusive', rarity: 'Exclusive', finish: 'Classic / Opaque' },
  { name: 'Hot Apple Pie', team: 'Exclusive', rarity: 'Exclusive', finish: 'Classic / Opaque' },
  { name: 'Margarina', team: 'Exclusive', rarity: 'Exclusive', finish: 'Classic / Opaque' },
  { name: "La'lotion", team: 'Exclusive', rarity: 'Exclusive', finish: 'Classic / Opaque' },
  { name: 'Curly Fries', team: 'Exclusive', rarity: 'Exclusive', finish: 'Classic / Opaque' },
  { name: 'Sponge Cake', team: 'Exclusive', rarity: 'Exclusive', finish: 'Classic / Opaque' },
]

const VARIANT_NAME = 'Season 1 Classic'

function nameKey(name: string) {
  return name.trim().toLocaleLowerCase()
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

  const itemByCharacterId = new Map<string, ItemRow>()
  for (const item of (existingItems as ItemRow[] | null) ?? []) {
    if (item.season !== 1) continue

    const current = itemByCharacterId.get(item.character_id)
    if (!current || item.variant_name === VARIANT_NAME) {
      itemByCharacterId.set(item.character_id, item)
    }
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

    const itemFields = {
      release_name: 'Season 1',
      release_year: 2014,
      release_type:
        shopkin.team === 'Exclusive' ? 'Playset Exclusive' : 'Main Season',
      team: shopkin.team,
      rarity: shopkin.rarity,
      finish: shopkin.finish,
    }
    const existingItem = itemByCharacterId.get(character.id)

    if (existingItem) {
      const { error } = await supabase
        .from('items')
        .update(itemFields)
        .eq('id', existingItem.id)

      throwIfError(error, `Could not update item ${shopkin.name}`)
      itemsUpdated += 1
    } else {
      const { data, error } = await supabase
        .from('items')
        .insert({
          character_id: character.id,
          variant_name: VARIANT_NAME,
          season: 1,
          ...itemFields,
        })
        .select('id, character_id, variant_name, season')
        .single()

      throwIfError(error, `Could not insert item ${shopkin.name}`)
      itemByCharacterId.set(character.id, data as ItemRow)
      itemsInserted += 1
    }
  }

  console.log(
    `Seeded ${SEASON_ONE_SHOPKINS.length} Season 1 Shopkins. ` +
      `Characters: ${charactersInserted} inserted, ${charactersUpdated} updated. ` +
      `Items: ${itemsInserted} inserted, ${itemsUpdated} updated without changing photos.`
  )
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
