import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp, { type OverlayOptions } from 'sharp'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { colorHistogram } from './color-analysis'
import {
  IMAGE_MANIFEST_PATH,
  SEASON_ONE_SHOPKINS,
  STORAGE_BUCKET,
  imageKey,
  slugify,
  type ColorTag,
  type ImageKind,
  type ImageManifest,
  type SeasonOneShopkin,
} from './season-1-checklist'

config({ path: '.env.local' })
config()

const FANDOM_API_URL = 'https://shopkins.fandom.com/api.php'
const FANDOM_WIKI_URL = 'https://shopkins.fandom.com/wiki/Season_One'
const USER_AGENT = 'ShopkinsCollectorImageImporter/2.0'
const CACHE_DIR = '.cache/season-1-images'
const PREVIEW_DIR = 'data/checklists/_preview'
const MAX_IMAGE_SIZE = 1000
// Minimum score advantage before color evidence overrides the wiki caption's "variant" label.
const COLOR_MARGIN = 0.05

// Wiki page titles that differ from the names stored in `characters`.
const WIKI_TITLES: Record<string, string> = {
  'Creamy Bun-bun': 'Creamy Bun-Bun',
  'Miss Mushy-moo': 'Miss Mushy-Moo',
  "La'lotion": "La'Lotion",
  'Sunny-screen': 'Sunny Screen',
  "Tin'a'tuna": "Tin'a'Tuna",
  "Pa' Pizza": "Pa'Pizza",
  'Yo-chi': 'Yo-Chi',
  'Chap-elli': 'Chap-Elli',
  Sippa: 'Little Sipper',
}

// Hand-checked against data/checklists/season_01_checklist.jpg. Illustrations are Collector's Tool art
// the galleries don't list; photos are toys too small or cluttered in frame for color matching.
const OVERRIDES: Record<string, Partial<Record<ImageKind, string>>> = {
  '1-021': { illustration: 'File:Alpha soup collectors tool.png' },
  '1-022': { photo: 'File:Gran jam toy.jpg' },
  '1-023': { illustration: 'File:Coolio art.png' },
  '1-031': { photo: 'File:Gran jam.jpg' },
  '1-051': { photo: 'File:$ 3.jpg' },
  '1-060': { photo: 'File:Candi Cotton.jpg' },
  '1-070': { illustration: 'File:Flavaava.png' },
  '1-071': { illustration: 'File:Dollops.png' },
  '1-086': { illustration: 'File:Frank furter collectors tool.png' },
  '1-087': { illustration: 'File:Little sipper collectors tool art.png' },
  '1-107': { illustration: 'File:Chap-elli.png' },
  '1-109': { illustration: 'File:Suds.png' },
  '1-125': { illustration: 'File:Pa pizza.png' },
  '1-139': { illustration: 'File:Tinatuna.png' },
}

// Captions naming any other release, product, or rendition of the character.
const OTHER_RELEASE =
  /charm|edition|wild style|food fair|halloween|pumpkin|easter|metallic|translucent|fridge|glitz|vending|storage tin|sweet ?heart|swapkins|jewel|petite|taco|unicorn|super shopper|oh so real|fizz|squeez|plush|cuddle|cartoon|sprite|promo|mcdonald|fashion spree|glamour|precious|lunch|radz|alternate|sketch|concept|render|static|world vacation|sprinkle|shoppin|build-a-bear|board game|magazine|word art|all star|cafe|frosted|chef club|screen idols|animation|blind bag|exclusive|limited|mystery|tribe|keychain|dispenser|costume|funko|\bfrom\b|season (?!1\b|one\b)/i
const OTHER_RELEASE_FILE = /SPKS(?:[2-9]|10)|rarity|\b(?:[2-9]|10)-\d{3}\b/i

type ImageCandidate = {
  file: string
  caption: string
  variant: boolean
  // Collector's Poster files are numbered by colorway ("AppleBlossom-1.png" is 1-001, "-2" is 1-008).
  order?: number
}

type Pick = {
  file: string
  reason: string
}

type WikiPage = {
  title: string
  missing?: boolean
  revisions?: Array<{ slots?: { main?: { content?: string } } }>
  imageinfo?: Array<{ url: string }>
}

type WikiResponse = {
  query?: {
    normalized?: Array<{ from: string; to: string }>
    redirects?: Array<{ from: string; to: string }>
    pages?: WikiPage[]
  }
}

async function fetchWikiApi(params: Record<string, string>): Promise<WikiResponse> {
  const url = new URL(FANDOM_API_URL)
  url.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    origin: '*',
    ...params,
  }).toString()

  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
  })

  if (!response.ok) {
    throw new Error(`Fandom API returned ${response.status} ${response.statusText}`)
  }

  return (await response.json()) as WikiResponse
}

function chunk<T>(values: T[], size: number) {
  const chunks: T[][] = []
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }
  return chunks
}

// Queries titles in batches and maps each requested title to its page, following normalization and redirects.
async function fetchPages(titles: string[], params: Record<string, string>) {
  const pages = new Map<string, WikiPage>()

  for (const batch of chunk(titles, 40)) {
    const response = await fetchWikiApi({ ...params, redirects: '1', titles: batch.join('|') })
    const renamed = new Map<string, string>()
    for (const { from, to } of [
      ...(response.query?.normalized ?? []),
      ...(response.query?.redirects ?? []),
    ]) {
      renamed.set(from, to)
    }
    const byTitle = new Map((response.query?.pages ?? []).map((page) => [page.title, page]))

    for (const title of batch) {
      let resolved = title
      for (let hops = 0; renamed.has(resolved) && hops < 5; hops += 1) {
        resolved = renamed.get(resolved)!
      }
      const page = byTitle.get(resolved)
      if (page && !page.missing) pages.set(title, page)
    }
  }

  return pages
}

function parseGalleries(wikitext: string, names: string[]) {
  const candidates: ImageCandidate[] = []
  const seen = new Set<string>()
  const galleries = wikitext.matchAll(
    /(?:==+\s*([^=\n]+?)\s*==+\s*)?<gallery[^>]*>([\s\S]*?)<\/gallery>/gi
  )

  for (const [, heading = '', body] of galleries) {
    if (/merchandise/i.test(heading)) continue

    for (const line of body.split('\n')) {
      const parts = line.split('|').map((part) => part.trim())
      const fileName = parts[0].replace(/^(?:File|Image):/i, '').trim()
      if (!/\.(png|jpe?g|webp)$/i.test(fileName) || OTHER_RELEASE_FILE.test(fileName)) continue

      const caption =
        parts
          .slice(1)
          .filter((part) => part && !/^(?:link|alt)=|^thumb$/i.test(part))
          .pop() ?? ''

      let rest = caption.toLowerCase().replace(/\[\[|\]\]/g, '')
      for (const name of names) rest = rest.split(name.toLowerCase()).join(' ')
      if (OTHER_RELEASE.test(rest)) continue

      const file = `File:${fileName}`
      if (seen.has(file)) continue
      seen.add(file)

      candidates.push({ file, caption, variant: /variant/.test(rest) })
    }
  }

  const isToy = (candidate: ImageCandidate) => /\btoy\b/i.test(candidate.caption)
  const isArt = (candidate: ImageCandidate) =>
    !isToy(candidate) &&
    /\b(?:art|artwork|atrt|ct)\b|collector'?s? (?:poster|tool|guide)/i.test(candidate.caption)

  return {
    illustration: candidates.filter(isArt).map((candidate) => ({
      ...candidate,
      order: posterOrder(candidate.file),
    })),
    photo: candidates.filter(isToy),
  }
}

function posterOrder(file: string) {
  const suffix = /-([12])\.png$/i.exec(file)?.[1]
  return suffix ? Number(suffix) - 1 : undefined
}

// Galleries often list only one numbered poster file even though its sibling exists on the wiki.
function posterSiblings(illustrations: ImageCandidate[]) {
  const files = new Set(illustrations.map(({ file }) => file.toLowerCase()))
  return illustrations.flatMap(({ file, order }) => {
    if (order === undefined) return []
    const sibling = file.replace(/-[12](\.png)$/i, `-${2 - order}$1`)
    return files.has(sibling.toLowerCase())
      ? []
      : [{ file: sibling, caption: 'Collector\'s Poster artwork (not in gallery)', variant: order === 0, order: 1 - order }]
  })
}

async function mapLimit<T, R>(values: T[], limit: number, task: (value: T) => Promise<R>) {
  const results: R[] = new Array(values.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, values.length) }, async () => {
      while (next < values.length) {
        const index = next++
        results[index] = await task(values[index])
      }
    })
  )
  return results
}

async function downloadCached(url: string) {
  const cachePath = join(CACHE_DIR, createHash('sha1').update(url).digest('hex'))
  if (existsSync(cachePath)) return readFileSync(cachePath)

  const response = await fetch(url, {
    headers: { Accept: 'image/*', Referer: FANDOM_WIKI_URL, 'User-Agent': USER_AGENT },
  })
  if (!response.ok) {
    throw new Error(`Image download returned ${response.status} ${response.statusText}`)
  }
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.startsWith('image/')) {
    throw new Error(`Expected an image but received ${contentType || 'no content type'}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  writeFileSync(cachePath, buffer)
  return buffer
}

function comparableTag(tag: ColorTag) {
  if (tag === 'Gold') return 'Yellow'
  if (tag === 'Clear') return null
  return tag
}

function tagScore(histogram: Map<ColorTag, number>, colors: ColorTag[] | null) {
  if (!colors) return 0
  const [main, accent] = colors.map(comparableTag)
  return (main ? histogram.get(main) ?? 0 : 0) + (accent ? (histogram.get(accent) ?? 0) / 2 : 0)
}

// Share of each hue, ignoring white and grey so photo backgrounds don't dominate the comparison.
function hueSimilarity(a: Map<ColorTag, number>, b: Map<ColorTag, number>) {
  const hues = (histogram: Map<ColorTag, number>) => {
    const entries = [...histogram].filter(([tag]) => tag !== 'White' && tag !== 'Silver')
    const total = entries.reduce((sum, [, share]) => sum + share, 0) || 1
    return new Map(entries.map(([tag, share]) => [tag, share / total]))
  }
  const [first, second] = [hues(a), hues(b)]
  let distance = 0
  for (const tag of new Set([...first.keys(), ...second.keys()])) {
    distance += Math.abs((first.get(tag) ?? 0) - (second.get(tag) ?? 0))
  }
  return 1 - distance / 2
}

// File names that carry a checklist ID or poster number decide their colorway outright.
function withKnownOrder(candidates: ImageCandidate[], entries: SeasonOneShopkin[]) {
  return candidates.map((candidate) => {
    const id = /\b1-\d{3}\b/.exec(candidate.file)?.[0]
    const index = entries.findIndex(({ shopkinId }) => shopkinId === id)
    return index >= 0 ? { ...candidate, order: index } : candidate
  })
}

function assignColorways(
  candidates: ImageCandidate[],
  score: (candidate: ImageCandidate, entryIndex: number) => number,
  preferColor: boolean
): [Pick | undefined, Pick | undefined] {
  const picks: [Pick | undefined, Pick | undefined] = [undefined, undefined]
  for (const { file, order } of candidates) {
    if (order !== undefined && !picks[order]) picks[order] = { file, reason: 'numbered file' }
  }

  const unnumbered = candidates.filter(({ order }) => order === undefined)
  if (!picks[0] && !picks[1]) return assignByCaption(unnumbered, score, preferColor)

  const open = picks[0] ? 1 : 0
  if (!picks[open] && unnumbered[0]) picks[open] = { file: unnumbered[0].file, reason: 'gallery' }
  return picks
}

// Places up to two candidates on a character's two colorways. Clear "variant" captions win unless
// preferColor is set; color decides when both or neither caption says "variant".
function assignByCaption(
  candidates: ImageCandidate[],
  score: (candidate: ImageCandidate, entryIndex: number) => number,
  preferColor: boolean
): [Pick | undefined, Pick | undefined] {
  const primary = candidates.find((candidate) => !candidate.variant)
  const secondary =
    candidates.find((candidate) => candidate.variant && candidate !== primary) ??
    candidates.find((candidate) => candidate !== primary)

  if (primary && secondary) {
    const labelsAgree = primary.variant === secondary.variant
    const straight = score(primary, 0) + score(secondary, 1)
    const swapped = score(primary, 1) + score(secondary, 0)
    if ((preferColor || labelsAgree) && swapped > straight + (labelsAgree ? 0 : COLOR_MARGIN)) {
      return [
        { file: secondary.file, reason: 'gallery, colorway swapped by color match' },
        { file: primary.file, reason: 'gallery, colorway swapped by color match' },
      ]
    }
    return [
      { file: primary.file, reason: 'gallery' },
      { file: secondary.file, reason: 'gallery' },
    ]
  }

  const only = primary ?? secondary
  if (!only) return [undefined, undefined]

  const labelled = only.variant ? 1 : 0
  const other = 1 - labelled
  const target =
    preferColor && score(only, other) > score(only, labelled) + COLOR_MARGIN ? other : labelled
  const picks: [Pick | undefined, Pick | undefined] = [undefined, undefined]
  picks[target] = {
    file: only.file,
    reason: target === labelled ? 'gallery' : 'gallery, colorway moved by color match',
  }
  return picks
}

function storagePath(shopkin: SeasonOneShopkin, kind: ImageKind) {
  const folder = kind === 'illustration' ? 'illustrations' : 'photos'
  const base = shopkin.shopkinId ? `${shopkin.shopkinId}-${slugify(shopkin.name)}` : slugify(shopkin.name)
  return `season-1/${folder}/${base}.webp`
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => `&#${character.charCodeAt(0)};`)
}

async function writeContactSheets(
  rows: Array<{ label: string; images: Partial<Record<ImageKind, Buffer>> }>
) {
  const tile = 150
  const labelHeight = 36
  const cellWidth = tile * 2 + 16
  const cellHeight = tile + labelHeight + 12
  const columns = 5
  const perSheet = columns * 6
  mkdirSync(PREVIEW_DIR, { recursive: true })

  const missingTile = await sharp({
    create: { width: tile, height: tile, channels: 3, background: '#e5e7eb' },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${tile}" height="${tile}"><text x="50%" y="50%" font-size="18" text-anchor="middle" fill="#b91c1c" font-family="sans-serif">missing</text></svg>`
        ),
      },
    ])
    .png()
    .toBuffer()

  const sheets = chunk(rows, perSheet)
  for (const [sheetIndex, sheetRows] of sheets.entries()) {
    const layers: OverlayOptions[] = []

    for (const [index, row] of sheetRows.entries()) {
      const left = (index % columns) * cellWidth + 8
      const top = Math.floor(index / columns) * cellHeight + 6
      layers.push({
        input: Buffer.from(
          `<svg width="${cellWidth}" height="${labelHeight}"><text x="0" y="22" font-size="15" font-family="sans-serif">${escapeXml(row.label)}</text></svg>`
        ),
        left,
        top,
      })

      for (const [position, kind] of (['illustration', 'photo'] as const).entries()) {
        const image = row.images[kind]
        const input = image
          ? await sharp(image)
              .resize(tile, tile, { fit: 'contain', background: '#ffffff' })
              .flatten({ background: '#ffffff' })
              .png()
              .toBuffer()
          : missingTile
        layers.push({ input, left: left + position * (tile + 4), top: top + labelHeight })
      }
    }

    const file = join(PREVIEW_DIR, `season-1-images-${sheetIndex + 1}.png`)
    await sharp({
      create: {
        width: cellWidth * columns + 16,
        height: cellHeight * Math.ceil(sheetRows.length / columns) + 12,
        channels: 3,
        background: '#ffffff',
      },
    })
      .composite(layers)
      .png()
      .toFile(file)
    console.log(`Wrote ${file}`)
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const preview = process.argv.includes('--preview')
  mkdirSync(CACHE_DIR, { recursive: true })

  const characters = new Map<string, SeasonOneShopkin[]>()
  for (const shopkin of SEASON_ONE_SHOPKINS) {
    characters.set(shopkin.name, [...(characters.get(shopkin.name) ?? []), shopkin])
  }

  const wikiTitle = (name: string) => WIKI_TITLES[name] ?? name
  const pages = await fetchPages([...characters.keys()].map(wikiTitle), {
    prop: 'revisions',
    rvprop: 'content',
    rvslots: 'main',
  })

  const galleries = new Map<string, ReturnType<typeof parseGalleries>>()
  const problems = new Map<string, string[]>()
  for (const name of characters.keys()) {
    const page = pages.get(wikiTitle(name))
    const wikitext = page?.revisions?.[0]?.slots?.main?.content
    if (!page || !wikitext) {
      problems.set(name, [`no Fandom page titled "${wikiTitle(name)}"`])
      continue
    }
    galleries.set(name, parseGalleries(wikitext, [name, wikiTitle(name), page.title]))
  }

  const candidateFiles = new Set<string>(
    Object.values(OVERRIDES).flatMap((override) => Object.values(override))
  )
  for (const gallery of galleries.values()) {
    gallery.illustration.push(...posterSiblings(gallery.illustration))
    for (const candidate of [...gallery.illustration, ...gallery.photo]) candidateFiles.add(candidate.file)
  }

  const filePages = await fetchPages([...candidateFiles], { prop: 'imageinfo', iiprop: 'url' })
  const fileUrl = (file: string) => filePages.get(file)?.imageinfo?.[0]?.url
  for (const gallery of galleries.values()) {
    gallery.illustration = gallery.illustration.filter(({ file }) => fileUrl(file))
  }

  console.log(`Downloading ${filePages.size} candidate image(s) (cached in ${CACHE_DIR})...`)
  const images = new Map<string, Buffer>()
  const histograms = new Map<string, Map<ColorTag, number>>()
  await mapLimit([...filePages.keys()], 6, async (file) => {
    try {
      const buffer = await downloadCached(fileUrl(file)!)
      images.set(file, buffer)
      histograms.set(file, await colorHistogram(buffer))
    } catch (error: unknown) {
      console.warn(`  Could not download ${file}: ${error instanceof Error ? error.message : error}`)
    }
  })

  const picks = new Map<string, Partial<Record<ImageKind, Pick>>>()
  for (const [name, entries] of characters) {
    const gallery = galleries.get(name)
    const usable = (candidates: ImageCandidate[]) => candidates.filter(({ file }) => images.has(file))
    const entryPicks: Array<Partial<Record<ImageKind, Pick>>> = entries.map(() => ({}))
    const applyOverrides = (kind: ImageKind) =>
      entries.forEach((shopkin, index) => {
        const file = OVERRIDES[imageKey(shopkin)]?.[kind]
        if (file && images.has(file)) entryPicks[index][kind] = { file, reason: 'manual override' }
      })
    const firstOf = (candidates: ImageCandidate[]) =>
      candidates.find((candidate) => !candidate.variant) ?? candidates[0]

    if (gallery && entries.length === 1) {
      const art = firstOf(usable(gallery.illustration))
      const toy = firstOf(usable(gallery.photo))
      if (art) entryPicks[0].illustration = { file: art.file, reason: 'gallery' }
      if (toy) entryPicks[0].photo = { file: toy.file, reason: 'gallery' }
    }

    if (gallery && entries.length === 2) {
      const tagMatch = (candidate: ImageCandidate, index: number) =>
        tagScore(histograms.get(candidate.file)!, entries[index].colors)
      const art = assignColorways(
        withKnownOrder(usable(gallery.illustration), entries),
        tagMatch,
        false
      )
      entries.forEach((_, index) => {
        if (art[index]) entryPicks[index].illustration = art[index]
      })
      applyOverrides('illustration')

      // Toy captions are less reliable than poster numbering, so photos follow their colorway's illustration.
      const references = entryPicks.map((pick) => pick.illustration && histograms.get(pick.illustration.file))
      const bothReferenced = references.every(Boolean)
      const illustrationMatch = (candidate: ImageCandidate, index: number) =>
        bothReferenced
          ? hueSimilarity(histograms.get(candidate.file)!, references[index]!)
          : tagMatch(candidate, index)
      const toy = assignColorways(
        withKnownOrder(usable(gallery.photo), entries),
        illustrationMatch,
        bothReferenced
      )
      entries.forEach((_, index) => {
        if (toy[index]) entryPicks[index].photo = toy[index]
      })
    }

    applyOverrides('illustration')
    applyOverrides('photo')
    entries.forEach((shopkin, index) => picks.set(imageKey(shopkin), entryPicks[index]))
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!dryRun && (!supabaseUrl || !serviceRoleKey)) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local.')
  }
  const supabase = dryRun
    ? null
    : createClient(supabaseUrl!, serviceRoleKey!, {
        auth: { persistSession: false, autoRefreshToken: false },
      })

  const manifest: ImageManifest = {}
  const previewRows: Array<{ label: string; images: Partial<Record<ImageKind, Buffer>> }> = []
  const colorMoves: string[] = []
  let uploaded = 0

  for (const shopkin of SEASON_ONE_SHOPKINS) {
    const key = imageKey(shopkin)
    const pick = picks.get(key) ?? {}
    const label = `${shopkin.shopkinId ?? 'Exclusive'} ${shopkin.name}`
    const rowImages: Partial<Record<ImageKind, Buffer>> = {}
    manifest[key] = {}

    for (const kind of ['illustration', 'photo'] as const) {
      const chosen = pick[kind]
      if (!chosen) {
        problems.set(label, [...(problems.get(label) ?? []), `no ${kind === 'photo' ? 'real-life photo' : 'illustration'} found`])
        continue
      }
      if (chosen.reason.includes('color match')) colorMoves.push(`${label} ${kind}: ${chosen.file}`)

      const normalized = await sharp(images.get(chosen.file)!)
        .rotate()
        .resize({ width: MAX_IMAGE_SIZE, height: MAX_IMAGE_SIZE, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer()
      rowImages[kind] = normalized

      const path = storagePath(shopkin, kind)
      if (supabase) {
        const { error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, normalized, { contentType: 'image/webp', upsert: true })
        if (error) {
          problems.set(label, [...(problems.get(label) ?? []), `${kind} upload failed: ${error.message}`])
          continue
        }
        uploaded += 1
      }
      manifest[key][kind] = { path, source: chosen.file }
    }

    previewRows.push({ label, images: rowImages })
  }

  if (preview) await writeContactSheets(previewRows)

  if (!dryRun) {
    writeFileSync(IMAGE_MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`)
    console.log(`Uploaded ${uploaded} image(s) to ${STORAGE_BUCKET} and wrote ${IMAGE_MANIFEST_PATH}.`)
  }

  const count = (kind: ImageKind) => previewRows.filter((row) => row.images[kind]).length
  console.log(
    `${dryRun ? 'Dry run: ' : ''}${count('illustration')}/${SEASON_ONE_SHOPKINS.length} illustrations, ` +
      `${count('photo')}/${SEASON_ONE_SHOPKINS.length} real-life photos matched.`
  )

  if (colorMoves.length > 0) {
    console.log('\nColorways assigned by color match instead of the wiki caption:')
    colorMoves.forEach((move) => console.log(`- ${move}`))
  }

  if (problems.size > 0) {
    console.log('\nUnmatched:')
    for (const [label, messages] of problems) console.log(`- ${label}: ${messages.join('; ')}`)
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
