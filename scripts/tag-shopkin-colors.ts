import { config } from 'dotenv'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'
import { classifyPixel } from './color-analysis'

config({ path: '.env.local' })
config()

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

type ItemRow = {
  id: string
  cover_image_url: string
  rarity: string
  finish: string
  characters: { name: string } | Array<{ name: string }> | null
}

const MANUAL_COLORS: Record<string, [ColorTag, ColorTag]> = {
  'miss mushy-moo': ['Red', 'White'],
  'creamy bun-bun': ['Yellow', 'Pink'],
  sippa: ['Red', 'Yellow'],
  'chap-elli': ['Blue', 'White'],
  'yo-chi': ['Orange', 'White'],
  "pa' pizza": ['Green', 'White'],
  "tin'a'tuna": ['Silver', 'Gold'],
  'sunny-screen': ['Gold', 'Silver'],
  "la'lotion": ['Green', 'White'],
}

function getCharacterName(item: ItemRow) {
  if (Array.isArray(item.characters)) return item.characters[0]?.name
  return item.characters?.name
}

async function dominantColors(imageBuffer: Buffer, item: ItemRow) {
  const { data, info } = await sharp(imageBuffer)
    .resize({ width: 160, height: 160, fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const counts = new Map<ColorTag, number>()
  let opaquePixels = 0

  for (let index = 0; index < data.length; index += info.channels) {
    const alpha = data[index + 3]
    if (alpha < 96) continue

    opaquePixels += 1
    const tag = classifyPixel(data[index], data[index + 1], data[index + 2])
    if (tag) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }

  // A dominant white field is generally a photo background rather than the figure.
  if ((counts.get('White') ?? 0) / Math.max(opaquePixels, 1) > 0.5 && counts.size > 2) {
    counts.delete('White')
  }

  let colors = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([color]) => color)
    .slice(0, 2)

  if (item.rarity === 'Limited Edition') {
    colors = colors.map((color) => {
      if (color === 'Yellow') return 'Gold'
      if (color === 'White') return 'Silver'
      return color
    })
  }

  if (
    (item.rarity === 'Special Edition' ||
      item.finish.toLowerCase().includes('translucent')) &&
    !colors.includes('Clear')
  ) {
    colors = [colors[0] ?? 'Blue', 'Clear']
  }

  return Array.from(new Set(colors)).slice(0, 2)
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local.'
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await supabase
    .from('items')
    .select('id, cover_image_url, rarity, finish, characters!inner(name)')

  if (error) throw new Error(`Could not load Shopkins: ${error.message}`)

  let updated = 0
  const failures: string[] = []

  for (const item of (data as unknown as ItemRow[]) ?? []) {
    const name = getCharacterName(item)
    if (!name) {
      failures.push(`${item.id}: missing character name`)
      continue
    }

    try {
      let colors: ColorTag[] = MANUAL_COLORS[name.toLowerCase()] ?? []

      if (!item.cover_image_url.includes('placehold.co/')) {
        const response = await fetch(item.cover_image_url, {
          headers: { Accept: 'image/*' },
        })
        if (!response.ok) {
          throw new Error(`image returned ${response.status}`)
        }

        colors = await dominantColors(Buffer.from(await response.arrayBuffer()), item)
      }

      if (!colors || colors.length === 0) {
        throw new Error('no colors could be determined')
      }
      if (colors.length === 1) {
        colors.push(colors[0] === 'White' ? 'Silver' : 'White')
      }

      const { error: updateError } = await supabase
        .from('items')
        .update({ color_tags: colors })
        .eq('id', item.id)

      if (updateError) throw updateError

      updated += 1
      console.log(`${name}: ${colors.join(', ')}`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      failures.push(`${name}: ${message}`)
      console.error(`Skipped ${name}: ${message}`)
    }
  }

  console.log(`Updated ${updated} listing(s); ${failures.length} failed.`)

  if (failures.length > 0) {
    failures.forEach((failure) => console.error(`- ${failure}`))
    process.exitCode = 1
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
