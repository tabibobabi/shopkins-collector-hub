import { existsSync, readFileSync } from 'node:fs'
import { config } from 'dotenv'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  CHECKLIST_SIZE,
  CHECKLIST_TEAMS,
  IMAGE_MANIFEST_PATH,
  LEGACY_VARIANT_NAME,
  SEASON_ONE_EXCLUSIVES,
  SEASON_ONE_SHOPKINS,
  STORAGE_BUCKET,
  formatShopkinId,
  imageKey,
  type ImageManifest,
  type Rarity,
} from './season-1-checklist'

config({ path: '.env.local' })
config()

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
  images: string[] | null
  cover_image_url: string | null
}

type UserItemRow = {
  id: string
  user_id: string
  item_id: string
  status: 'owned' | 'wishlist'
  quantity: number | null
}

const ITEM_COLUMNS = 'id, character_id, variant_name, season, images, cover_image_url'

// Hand-entered through the admin page for a character's second colorway before checklist IDs existed.
const HAND_ENTERED_VARIANT_NAME = 'Season 1 Variant'

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

function isPlaceholder(url: string | null | undefined) {
  return !url?.trim() || url.includes('placehold.co/')
}

function realImages(item: Pick<ItemRow, 'images'>) {
  return (item.images ?? []).filter((url) => !isPlaceholder(url))
}

function loadImageManifest(): ImageManifest {
  if (!existsSync(IMAGE_MANIFEST_PATH)) {
    console.warn(
      `${IMAGE_MANIFEST_PATH} not found; run \`npm run scrape:season-1-images\` first. Seeding without images.`
    )
    return {}
  }
  return JSON.parse(readFileSync(IMAGE_MANIFEST_PATH, 'utf8')) as ImageManifest
}

function printImageCoverage(manifest: ImageManifest) {
  const missing = SEASON_ONE_SHOPKINS.flatMap((shopkin) => {
    const images = manifest[imageKey(shopkin)] ?? {}
    const gaps = [
      images.illustration ? null : 'illustration',
      images.photo ? null : 'real-life photo',
    ].filter(Boolean)
    return gaps.length > 0 ? [{ Record: imageKey(shopkin), Name: shopkin.name, Missing: gaps.join(' + ') }] : []
  })

  const withBoth = SEASON_ONE_SHOPKINS.length - missing.length
  console.log(`Image manifest: ${withBoth}/${SEASON_ONE_SHOPKINS.length} records have both images.`)
  if (missing.length > 0) console.table(missing)
}

async function assertImageColumns(supabase: SupabaseClient) {
  const { error } = await supabase.from('items').select('illustration_url, real_life_image_url').limit(1)
  if (error) {
    throw new Error(
      `items is missing the image columns (${error.message}). Apply ` +
        'supabase/migrations/20260930000000_add_item_image_urls.sql in the Supabase SQL editor, then re-run.'
    )
  }
}

// Folds each hand-entered second-colorway row into its checklist item, carrying over photos and
// collection/wishlist links, then deletes it so every variant has exactly one listing.
async function mergeHandEnteredVariants(
  supabase: SupabaseClient,
  items: ItemRow[],
  characterNameById: Map<string, string>
) {
  const merged: string[] = []

  for (const duplicate of items.filter((item) => item.variant_name === HAND_ENTERED_VARIANT_NAME)) {
    const name = characterNameById.get(duplicate.character_id) ?? duplicate.character_id
    const colorways = SEASON_ONE_SHOPKINS.filter(
      (shopkin) => shopkin.shopkinId && nameKey(shopkin.name) === nameKey(name)
    )
    const targetId = colorways[1]?.shopkinId
    if (!targetId) {
      console.warn(`Left "${HAND_ENTERED_VARIANT_NAME}" row for ${name}: it has no second colorway.`)
      continue
    }

    const target = items.find(
      (item) => item.character_id === duplicate.character_id && item.variant_name === targetId
    )
    if (!target) {
      const { error } = await supabase
        .from('items')
        .update({ variant_name: targetId })
        .eq('id', duplicate.id)
      throwIfError(error, `Could not rename ${name} variant to ${targetId}`)
      duplicate.variant_name = targetId
      merged.push(`${name} -> ${targetId} (renamed)`)
      continue
    }

    const images = [...new Set([...realImages(target), ...realImages(duplicate)])]
    const cover = !isPlaceholder(target.cover_image_url)
      ? target.cover_image_url
      : !isPlaceholder(duplicate.cover_image_url)
        ? duplicate.cover_image_url
        : images[0]
    if (images.length > 0) {
      const { error } = await supabase
        .from('items')
        .update({ images, cover_image_url: cover })
        .eq('id', target.id)
      throwIfError(error, `Could not move ${name} photos to ${targetId}`)
      target.images = images
      target.cover_image_url = cover ?? null
    }

    const { data: links, error: linkError } = await supabase
      .from('user_items')
      .select('id, user_id, item_id, status, quantity')
      .in('item_id', [duplicate.id, target.id])
    throwIfError(linkError, `Could not read collection links for ${name}`)

    for (const link of ((links as UserItemRow[] | null) ?? []).filter((row) => row.item_id === duplicate.id)) {
      const existing = (links as UserItemRow[]).find(
        (row) => row.item_id === target.id && row.user_id === link.user_id
      )
      if (existing) {
        const { error } = await supabase
          .from('user_items')
          .update({
            status: existing.status === 'owned' || link.status === 'owned' ? 'owned' : 'wishlist',
            quantity: Math.max(existing.quantity ?? 1, link.quantity ?? 1),
          })
          .eq('id', existing.id)
        throwIfError(error, `Could not merge a collection link into ${targetId}`)
        const { error: deleteError } = await supabase.from('user_items').delete().eq('id', link.id)
        throwIfError(deleteError, `Could not remove a duplicate collection link for ${name}`)
      } else {
        const { error } = await supabase
          .from('user_items')
          .update({ item_id: target.id })
          .eq('id', link.id)
        throwIfError(error, `Could not move a collection link to ${targetId}`)
      }
    }

    const { error: deleteError } = await supabase.from('items').delete().eq('id', duplicate.id)
    throwIfError(deleteError, `Could not delete the merged ${name} row`)
    items.splice(items.indexOf(duplicate), 1)
    merged.push(`${name} -> ${targetId}`)
  }

  if (merged.length > 0) console.log(`Merged hand-entered variants: ${merged.join(', ')}`)
}

async function findBrokenUrls(urls: string[]) {
  const broken: string[] = []
  let next = 0
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      while (next < urls.length) {
        const url = urls[next++]
        const response = await fetch(url, { method: 'HEAD' }).catch(() => null)
        if (!response?.ok) broken.push(`${url} (${response?.status ?? 'unreachable'})`)
      }
    })
  )
  return broken
}

async function main() {
  validateChecklist()
  printSummary()

  const manifest = loadImageManifest()
  printImageCoverage(manifest)

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
  await assertImageColumns(supabase)

  const publicUrl = (path: string | undefined) =>
    path ? supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl : null

  // Read existing rows before making changes so no database uniqueness constraint is required.
  const { data: existingCharacters, error: characterLookupError } = await supabase
    .from('characters')
    .select('id, name, base_category')

  throwIfError(characterLookupError, 'Could not read characters')

  const { data: existingItems, error: itemLookupError } = await supabase
    .from('items')
    .select(ITEM_COLUMNS)
    .eq('season', 1)

  throwIfError(itemLookupError, 'Could not read items')

  const characterByName = new Map(
    (existingCharacters as CharacterRow[] | null)?.map((character) => [
      nameKey(character.name),
      character,
    ])
  )

  const seasonOneItems = (existingItems as ItemRow[] | null) ?? []
  await mergeHandEnteredVariants(
    supabase,
    seasonOneItems,
    new Map((existingCharacters as CharacterRow[] | null)?.map(({ id, name }) => [id, name]))
  )

  const itemByKey = new Map<string, ItemRow>()
  for (const item of seasonOneItems) {
    const key = itemKey(item.character_id, item.variant_name)
    if (!itemByKey.has(key)) itemByKey.set(key, item)
  }

  let charactersInserted = 0
  let charactersUpdated = 0
  let itemsInserted = 0
  let itemsUpdated = 0
  let galleriesFilled = 0

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
    const images = manifest[imageKey(shopkin)] ?? {}
    const illustrationUrl = publicUrl(images.illustration?.path)
    const realLifeImageUrl = publicUrl(images.photo?.path)
    const referenceImages = [illustrationUrl, realLifeImageUrl].filter((url): url is string => Boolean(url))
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
      illustration_url: illustrationUrl,
      real_life_image_url: realLifeImageUrl,
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
      // Photos uploaded through the admin pages are never replaced; only placeholder galleries are filled.
      const fillGallery = realImages(existingItem).length === 0 && referenceImages.length > 0
      const { error } = await supabase
        .from('items')
        .update({
          ...itemFields,
          ...(fillGallery ? { images: referenceImages, cover_image_url: referenceImages[0] } : {}),
        })
        .eq('id', existingItem.id)

      throwIfError(error, `Could not update item ${label}`)
      itemByKey.set(itemKey(character.id, variantName), { ...existingItem, variant_name: variantName })
      itemsUpdated += 1
      if (fillGallery) galleriesFilled += 1
    } else {
      const gallery = referenceImages.length > 0 ? referenceImages : [placeholderImage(shopkin.name)]
      const { data, error } = await supabase
        .from('items')
        .insert({
          character_id: character.id,
          season: 1,
          images: gallery,
          cover_image_url: gallery[0],
          ...itemFields,
        })
        .select(ITEM_COLUMNS)
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
      `Items: ${itemsInserted} inserted, ${itemsUpdated} updated ` +
      `(${galleriesFilled} placeholder galleries replaced; uploaded photos left as-is).`
  )

  await verifySeededImages(supabase, manifest, publicUrl)
}

// Re-reads the database so the report reflects what was actually stored, not what was sent.
async function verifySeededImages(
  supabase: SupabaseClient,
  manifest: ImageManifest,
  publicUrl: (path: string | undefined) => string | null
) {
  const { data, error } = await supabase
    .from('items')
    .select('variant_name, illustration_url, real_life_image_url, characters!inner(name)')
    .eq('season', 1)
  throwIfError(error, 'Could not re-read Season 1 items')

  type StoredItem = {
    variant_name: string
    illustration_url: string | null
    real_life_image_url: string | null
    characters: { name: string } | Array<{ name: string }>
  }
  const rows = (data as unknown as StoredItem[]) ?? []
  const storedName = (row: StoredItem) =>
    nameKey(Array.isArray(row.characters) ? row.characters[0]?.name ?? '' : row.characters.name)

  const report: Array<Record<string, string>> = []
  const urls: string[] = []
  for (const shopkin of SEASON_ONE_SHOPKINS) {
    const variantName = shopkin.shopkinId ?? LEGACY_VARIANT_NAME
    const matches = rows.filter(
      (row) => row.variant_name === variantName && storedName(row) === nameKey(shopkin.name)
    )
    const record = imageKey(shopkin)
    if (matches.length !== 1) {
      report.push({ Record: record, Name: shopkin.name, Problem: `${matches.length} database rows` })
      continue
    }

    const [row] = matches
    const expected = manifest[record] ?? {}
    const problems: string[] = []
    if (!row.illustration_url) problems.push('no illustration')
    else if (row.illustration_url !== publicUrl(expected.illustration?.path)) problems.push('illustration differs from manifest')
    if (!row.real_life_image_url) problems.push('no real-life photo')
    else if (row.real_life_image_url !== publicUrl(expected.photo?.path)) problems.push('photo differs from manifest')
    if (problems.length > 0) report.push({ Record: record, Name: shopkin.name, Problem: problems.join(', ') })

    urls.push(...[row.illustration_url, row.real_life_image_url].filter((url): url is string => Boolean(url)))
  }

  const extraRows = rows.length - SEASON_ONE_SHOPKINS.length
  const broken = await findBrokenUrls(urls)

  console.log(
    `\nVerification: ${rows.length} Season 1 rows in the database` +
      `${extraRows > 0 ? ` (${extraRows} not in the seed)` : ''}; ` +
      `${urls.length} image URLs checked, ${broken.length} broken.`
  )
  if (report.length > 0) {
    console.log('Records without a complete image match:')
    console.table(report)
  }
  if (broken.length > 0) {
    console.log('Broken image URLs:')
    broken.forEach((url) => console.log(`- ${url}`))
    process.exitCode = 1
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
