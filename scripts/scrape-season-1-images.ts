import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })
config()

const FANDOM_API_URL = 'https://shopkins.fandom.com/api.php'
const FANDOM_WIKI_URL = 'https://shopkins.fandom.com/wiki/Season_One'
const STORAGE_BUCKET = 'shopkins-images'

type CharacterRelation = {
  name: string
}

type SeasonOneItem = {
  id: string
  cover_image_url: string | null
  images: string[] | null
  characters: CharacterRelation | CharacterRelation[] | null
}

type WikiPage = {
  missing?: boolean
  revisions?: Array<{
    slots?: {
      main?: {
        '*'?: string
      }
    }
  }>
  images?: Array<{
    title: string
  }>
  imageinfo?: Array<{
    url: string
    mime?: string
  }>
}

type WikiResponse = {
  query?: {
    pages?: Record<string, WikiPage>
  }
}

function getCharacterName(item: SeasonOneItem) {
  if (Array.isArray(item.characters)) return item.characters[0]?.name
  return item.characters?.name
}

function hasNoPhoto(item: SeasonOneItem) {
  const hasCover = Boolean(item.cover_image_url?.trim())
  const hasGalleryImage = Array.isArray(item.images) && item.images.length > 0
  return !hasCover && !hasGalleryImage
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function fetchWikiApi(params: Record<string, string>): Promise<WikiResponse> {
  const url = new URL(FANDOM_API_URL)
  url.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    ...params,
  }).toString()

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'ShopkinsCollectorImageImporter/1.0',
    },
  })

  if (!response.ok) {
    throw new Error(`Fandom API returned ${response.status} ${response.statusText}`)
  }

  return (await response.json()) as WikiResponse
}

function firstPage(response: WikiResponse) {
  return Object.values(response.query?.pages ?? {})[0]
}

function selectOriginalRender(
  characterName: string,
  wikitext: string,
  pageImages: Array<{ title: string }>
) {
  const originalTabImage = wikitext.match(
    /Original\s*=\s*\[\[(?:File|Image):([^\]|#]+)(?:[^\]]*)\]\]/i
  )?.[1]

  if (originalTabImage) return `File:${originalTabImage.trim()}`

  const seasonOneImage = wikitext.match(
    /\[\[(?:File|Image):(SPKS1[^\]|#]+)(?:[^\]]*)\]\]/i
  )?.[1]

  if (seasonOneImage) return `File:${seasonOneImage.trim()}`

  const normalizedName = normalize(characterName)
  const scoredImages = pageImages
    .filter(({ title }) => /\.(png|jpe?g|webp)$/i.test(title))
    .map(({ title }) => {
      const normalizedTitle = normalize(title.replace(/^File:/i, ''))
      let score = 0
      if (/spks1/i.test(title)) score += 100
      if (normalizedTitle.includes(normalizedName)) score += 50
      if (/collector'?s tool|artwork|render/i.test(title)) score += 20
      if (/logo|checklist|commercial|plush|eraser|headphone/i.test(title)) score -= 100
      return { title, score }
    })
    .sort((a, b) => b.score - a.score)

  return scoredImages[0]?.score >= 50 ? scoredImages[0].title : null
}

async function findOfficialRender(characterName: string) {
  const characterPage = await fetchWikiApi({
    titles: characterName,
    prop: 'revisions|images',
    rvprop: 'content',
    rvslots: 'main',
    imlimit: 'max',
    redirects: '1',
  })
  const page = firstPage(characterPage)

  if (!page || page.missing) {
    throw new Error(`No Fandom Wiki page found for ${characterName}`)
  }

  const wikitext = page.revisions?.[0]?.slots?.main?.['*'] ?? ''
  const fileTitle = selectOriginalRender(characterName, wikitext, page.images ?? [])

  if (!fileTitle) {
    throw new Error(`No official render found on the Fandom gallery for ${characterName}`)
  }

  const imageResponse = await fetchWikiApi({
    titles: fileTitle,
    prop: 'imageinfo',
    iiprop: 'url|mime',
  })
  const imageInfo = firstPage(imageResponse)?.imageinfo?.[0]

  if (!imageInfo?.url) {
    throw new Error(`Fandom did not return an image URL for ${fileTitle}`)
  }

  return {
    sourceUrl: imageInfo.url,
    mimeType: imageInfo.mime ?? 'image/png',
    fileTitle,
  }
}

function extensionFor(fileTitle: string, mimeType: string) {
  const titleExtension = fileTitle.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase()
  if (titleExtension) return titleExtension === 'jpeg' ? 'jpg' : titleExtension

  const mimeExtension = mimeType.split('/')[1]?.toLowerCase()
  return mimeExtension === 'jpeg' ? 'jpg' : mimeExtension || 'png'
}

async function downloadImage(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: 'image/*',
      Referer: FANDOM_WIKI_URL,
      'User-Agent': 'ShopkinsCollectorImageImporter/1.0',
    },
  })

  if (!response.ok) {
    throw new Error(`Image download returned ${response.status} ${response.statusText}`)
  }

  const contentType = response.headers.get('content-type') ?? 'image/png'
  if (!contentType.startsWith('image/')) {
    throw new Error(`Expected an image but received ${contentType}`)
  }

  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType,
  }
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
    .select('id, cover_image_url, images, characters!inner(name)')
    .eq('season', 1)

  if (error) throw new Error(`Could not query Season 1 items: ${error.message}`)

  const itemsWithoutPhotos = (data as SeasonOneItem[]).filter(hasNoPhoto)
  console.log(`Found ${itemsWithoutPhotos.length} Season 1 item(s) without photos.`)

  let imported = 0
  const failures: string[] = []

  for (const [index, item] of itemsWithoutPhotos.entries()) {
    const characterName = getCharacterName(item)

    if (!characterName) {
      failures.push(`${item.id}: missing related character name`)
      continue
    }

    console.log(`[${index + 1}/${itemsWithoutPhotos.length}] ${characterName}`)

    try {
      const render = await findOfficialRender(characterName)
      const image = await downloadImage(render.sourceUrl)
      const extension = extensionFor(render.fileTitle, image.contentType)
      const storagePath = `season-1/${slugify(characterName)}-${item.id}.${extension}`

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, image.buffer, {
          contentType: image.contentType,
          upsert: true,
        })

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`)
      }

      const { data: publicUrlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath)

      const publicUrl = publicUrlData.publicUrl
      const { error: updateError } = await supabase
        .from('items')
        .update({
          cover_image_url: publicUrl,
          images: [publicUrl],
        })
        .eq('id', item.id)

      if (updateError) {
        await supabase.storage.from(STORAGE_BUCKET).remove([storagePath])
        throw new Error(`Database update failed: ${updateError.message}`)
      }

      imported += 1
      console.log(`  Uploaded ${render.fileTitle}`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      failures.push(`${characterName}: ${message}`)
      console.error(`  Skipped: ${message}`)
    }
  }

  console.log(`Finished: ${imported} image(s) imported, ${failures.length} failed.`)

  if (failures.length > 0) {
    console.error('\nFailures:')
    failures.forEach((failure) => console.error(`- ${failure}`))
    process.exitCode = 1
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
