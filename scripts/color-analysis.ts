import sharp from 'sharp'
import type { ColorTag } from './catalog'

function rgbToHsv(red: number, green: number, blue: number) {
  const r = red / 255
  const g = green / 255
  const b = blue / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  let hue = 0

  if (delta !== 0) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6)
    else if (max === g) hue = 60 * ((b - r) / delta + 2)
    else hue = 60 * ((r - g) / delta + 4)
  }

  if (hue < 0) hue += 360

  return {
    hue,
    saturation: max === 0 ? 0 : delta / max,
    value: max,
  }
}

export function classifyPixel(red: number, green: number, blue: number): ColorTag | null {
  const { hue, saturation, value } = rgbToHsv(red, green, blue)

  // Ignore dark outlines, eyes, and shadows.
  if (value < 0.18) return null

  if (saturation < 0.12) {
    if (value > 0.82) return 'White'
    if (value > 0.35) return 'Silver'
    return null
  }

  if ((hue < 15 || hue >= 345) && value > 0.72 && saturation < 0.8) return 'Pink'
  if (hue < 15 || hue >= 345) return 'Red'
  if (hue < 45) return value < 0.58 ? 'Brown' : 'Orange'
  if (hue < 70) return 'Yellow'
  if (hue < 170) return 'Green'
  if (hue < 255) return 'Blue'
  if (hue < 300) return 'Purple'
  return 'Pink'
}

// Share of opaque pixels per color, so images of different sizes are comparable.
export async function colorHistogram(imageBuffer: Buffer) {
  const { data, info } = await sharp(imageBuffer)
    .resize({ width: 160, height: 160, fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const counts = new Map<ColorTag, number>()
  let opaquePixels = 0

  for (let index = 0; index < data.length; index += info.channels) {
    if (data[index + 3] < 96) continue

    opaquePixels += 1
    const tag = classifyPixel(data[index], data[index + 1], data[index + 2])
    if (tag) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }

  const histogram = new Map<ColorTag, number>()
  for (const [tag, count] of counts) histogram.set(tag, count / Math.max(opaquePixels, 1))
  return histogram
}
