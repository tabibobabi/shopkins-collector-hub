'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../utils/supabase'
import Window from '../../../components/ui/Window'
import { swatchColor } from '../../../utils/shopkins'

const RARITIES = ['Common', 'Rare', 'Ultra Rare', 'Special Edition', 'Limited Edition', 'Exclusive']
const FINISHES = [
  'Classic / Opaque',
  'Glitter / Sparkle',
  'Translucent / Jelly',
  'Metallic / Pearl',
  'Chrome / Electroplated',
  'Flocked / Fuzzy',
  'Glow-in-the-Dark',
  'Color Change',
  'Gem / Jeweled'
]
const RELEASE_TYPES = [
  'Main Season',
  'Playset Exclusive',
  'Shoppies Pack',
  'Collector Tin / Storage Box',
  'Promotional / Convention Exclusive'
]
const AVAILABLE_COLORS = ['Pink', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange', 'White', 'Brown', 'Red', 'Clear', 'Gold', 'Silver']

interface Character {
  id: string
  name: string
  base_category: string
}

interface PhotoEntry {
  file: File
  previewUrl: string
  type: 'Stock / Catalog' | 'In-Hand IRL' | 'In Packaging'
}

export default function AdminAddItem() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedCharacterId, setSelectedCharacterId] = useState('')
  const [newCharName, setNewCharName] = useState('')
  const [newCharCategory, setNewCharCategory] = useState('')

  // Item form states
  const [variantName, setVariantName] = useState('')
  const [season, setSeason] = useState<number | ''>(1)
  const [releaseType, setReleaseType] = useState(RELEASE_TYPES[0])
  const [releaseName, setReleaseName] = useState('')
  const [releaseYear, setReleaseYear] = useState<number | ''>(2014)
  const [team, setTeam] = useState('')
  const [rarity, setRarity] = useState(RARITIES[0])
  const [finish, setFinish] = useState(FINISHES[0])
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  
  // Photo states
  const [photos, setPhotos] = useState<PhotoEntry[]>([])
  const [coverIndex, setCoverIndex] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    fetchCharacters()
  }, [])

  async function fetchCharacters() {
    const { data } = await supabase.from('characters').select('*').order('name', { ascending: true })
    if (data) setCharacters(data)
  }

  const toggleColor = (color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    )
  }

  const handleAddPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const incomingFiles = Array.from(e.target.files).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      type: 'Stock / Catalog' as const
    }))
    setPhotos((prev) => [...prev, ...incomingFiles])
  }

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const updated = prev.filter((_, i) => i !== index)
      if (coverIndex >= updated.length) {
        setCoverIndex(Math.max(0, updated.length - 1))
      }
      return updated
    })
  }

  const updatePhotoType = (index: number, newType: 'Stock / Catalog' | 'In-Hand IRL' | 'In Packaging') => {
    setPhotos((prev) =>
      prev.map((photo, i) => (i === index ? { ...photo, type: newType } : photo))
    )
  }

  async function handleCreateCharacter(e: React.FormEvent) {
    e.preventDefault()
    if (!newCharName || !newCharCategory) return

    const { data, error } = await supabase
      .from('characters')
      .insert([{ name: newCharName, base_category: newCharCategory }])
      .select()
      .single()

    if (error) {
      alert(error.message)
    } else if (data) {
      setCharacters([...characters, data])
      setSelectedCharacterId(data.id)
      setTeam(data.base_category)
      setNewCharName('')
      setNewCharCategory('')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCharacterId) {
      alert('Please select or create a character mold first!')
      return
    }
    if (photos.length === 0) {
      alert('Please attach at least one photo!')
      return
    }

    setUploading(true)
    setStatusMessage('Uploading photos to storage...')

    try {
      const uploadedUrls: string[] = []

      for (const entry of photos) {
        const fileExt = entry.file.name.split('.').pop()
        const cleanName = entry.file.name.replace(/[^a-zA-Z0-9]/g, '_')
        const fileName = `${Date.now()}-${cleanName}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('shopkins-images')
          .upload(fileName, entry.file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('shopkins-images')
          .getPublicUrl(fileName)

        uploadedUrls.push(publicUrl)
      }

      setStatusMessage('Saving to collection catalog...')

      const coverUrl = uploadedUrls[coverIndex] || uploadedUrls[0]

      const { error: insertError } = await supabase.from('items').insert([
        {
          character_id: selectedCharacterId,
          variant_name: variantName,
          season: season === '' ? null : Number(season),
          release_type: releaseType,
          release_name: releaseName,
          release_year: releaseYear === '' ? null : Number(releaseYear),
          team,
          rarity,
          finish,
          color_tags: selectedColors,
          images: uploadedUrls,
          cover_image_url: coverUrl
        }
      ])

      if (insertError) throw insertError

      setStatusMessage('✨ Figure added successfully!')
      setVariantName('')
      setReleaseName('')
      setPhotos([])
      setCoverIndex(0)
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-3 py-6 sm:px-6 md:py-10">
    <Window title="add_figure.exe" bodyClassName="p-4 sm:p-6">
      <h1 className="title-pop mb-6 text-2xl sm:text-3xl">Add New Shopkin Figure</h1>

      {/* 1. Base Mold / Character */}
      <div className="mb-6 rounded-2xl border-2 border-dashed border-line bg-surface-2 p-4">
        <h2 className="mb-2 font-pixel text-xs text-primary-ink">1. Base Character Sculpt</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="field-label">Existing Character</label>
            <select
              value={selectedCharacterId}
              onChange={(e) => {
                setSelectedCharacterId(e.target.value)
                const char = characters.find((c) => c.id === e.target.value)
                if (char) setTeam(char.base_category)
              }}
              className="field"
            >
              <option value="">-- Choose Character --</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.base_category})
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="field-label">Or Add New Character</span>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                placeholder="Name (e.g. Apple Blossom)"
                value={newCharName}
                onChange={(e) => setNewCharName(e.target.value)}
                className="field min-w-0 flex-1"
              />
              <input
                type="text"
                placeholder="Category (e.g. Fruit & Veg)"
                value={newCharCategory}
                onChange={(e) => setNewCharCategory(e.target.value)}
                className="field min-w-0 flex-1"
              />
              <button
                type="button"
                onClick={handleCreateCharacter}
                className="btn-candy h-11 shrink-0"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Variant Information */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="field-label">Variant Name / Colorway Edition</label>
          <input
            type="text"
            required
            placeholder="e.g. Classic Green, Yellow Alternate, Metallic Pink"
            value={variantName}
            onChange={(e) => setVariantName(e.target.value)}
            className="field"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="field-label">Season #</label>
            <input
              type="number"
              placeholder="e.g. 1"
              value={season}
              onChange={(e) => setSeason(e.target.value === '' ? '' : Number(e.target.value))}
              className="field"
            />
          </div>
          <div>
            <label className="field-label">Release Year</label>
            <input
              type="number"
              value={releaseYear}
              onChange={(e) => setReleaseYear(e.target.value === '' ? '' : Number(e.target.value))}
              className="field"
            />
          </div>
          <div>
            <label className="field-label">Team / Category</label>
            <input
              type="text"
              required
              placeholder="e.g. Bakery"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              className="field"
            />
          </div>
          <div>
            <label className="field-label">Release Type</label>
            <select
              value={releaseType}
              onChange={(e) => setReleaseType(e.target.value)}
              className="field"
            >
              {RELEASE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="field-label">Pack / Release Name</label>
          <input
            type="text"
            placeholder="e.g. 12-Pack, Supermarket Playset, Fashion Spree Tin"
            value={releaseName}
            onChange={(e) => setReleaseName(e.target.value)}
            className="field"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="field-label">Rarity Tier</label>
            <select
              value={rarity}
              onChange={(e) => setRarity(e.target.value)}
              className="field"
            >
              {RARITIES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Finish / Texture</label>
            <select
              value={finish}
              onChange={(e) => setFinish(e.target.value)}
              className="field"
            >
              {FINISHES.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Color Tags Selector */}
        <div>
          <span className="field-label">Color Tags</span>
          <div className="flex flex-wrap gap-1.5">
            {AVAILABLE_COLORS.map((color) => {
              const active = selectedColors.includes(color)
              return (
                <button
                  type="button"
                  key={color}
                  aria-pressed={active}
                  onClick={() => toggleColor(color)}
                  className={`flex min-h-8 items-center gap-1.5 rounded-full border-2 px-3 py-1 text-xs font-bold transition ${
                    active
                      ? 'border-primary bg-primary-soft text-primary-ink'
                      : 'border-line bg-surface text-ink-soft hover:border-line-strong'
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full border border-black/10"
                    style={{ backgroundColor: swatchColor(color) }}
                  />
                  {color}
                </button>
              )
            })}
          </div>
        </div>

        {/* Multi-Photo Manager & Cover Selector */}
        <div className="rounded-2xl border-2 border-dashed border-line bg-surface-2 p-4">
          <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="font-pixel text-xs text-primary-ink">Figure Photos</span>
              <p className="text-[11px] text-ink-soft">
                Upload catalog art, in-hand photos, or box shots. Click any photo to set it as the cover!
              </p>
            </div>
            <label className="btn-ghost btn-sm shrink-0 cursor-pointer">
              + Choose Photos
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleAddPhotos}
                className="hidden"
              />
            </label>
          </div>

          {photos.length === 0 ? (
            <div className="pattern-dots rounded-xl border-2 border-dashed border-line-strong py-8 text-center text-xs font-bold text-ink-soft">
              No photos added yet. Upload stock art, packaging, or real photos!
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              {photos.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => setCoverIndex(idx)}
                  className={`relative cursor-pointer rounded-xl border-2 bg-surface p-2 transition ${
                    coverIndex === idx ? 'border-primary ring-2 ring-primary-soft' : 'border-line hover:border-line-strong'
                  }`}
                >
                  <div className="pattern-dots mb-2 flex h-24 w-full items-center justify-center overflow-hidden rounded-lg">
                    <img
                      src={item.previewUrl}
                      alt="preview"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-1">
                    <select
                      value={item.type}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updatePhotoType(idx, e.target.value as any)}
                      className="w-full rounded-lg border-2 border-line bg-surface-2 p-1 text-[11px] text-ink"
                    >
                      <option value="Stock / Catalog">Stock Art</option>
                      <option value="In-Hand IRL">In-Hand IRL</option>
                      <option value="In Packaging">In Packaging</option>
                    </select>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        removePhoto(idx)
                      }}
                      aria-label="Remove photo"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base font-black text-ink-faint hover:text-danger"
                    >
                      ×
                    </button>
                  </div>

                  {coverIndex === idx && (
                    <span className="sticker absolute -left-1.5 -top-2 -rotate-6 bg-primary text-on-primary">
                      Cover
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={uploading}
          className="btn-candy min-h-12 w-full text-sm"
        >
          {uploading ? 'Uploading Figure...' : 'Save Figure to Catalog'}
        </button>

        {statusMessage && (
          <p className="mt-2 text-center text-xs font-bold text-primary-ink">
            {statusMessage}
          </p>
        )}
      </form>
    </Window>
    </main>
  )
}
