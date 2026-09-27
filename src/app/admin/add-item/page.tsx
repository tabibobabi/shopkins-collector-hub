'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../utils/supabase'

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
    <div className="max-w-3xl mx-auto p-6 bg-white my-8 rounded-3xl shadow-sm border border-pink-100">
      <h1 className="text-2xl font-black text-pink-600 mb-6">Add New Shopkin Figure</h1>

      {/* 1. Base Mold / Character */}
      <div className="bg-pink-50/50 p-4 rounded-2xl border border-pink-100 mb-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-pink-500 mb-2">1. Base Character Sculpt</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 font-medium">Existing Character</label>
            <select
              value={selectedCharacterId}
              onChange={(e) => {
                setSelectedCharacterId(e.target.value)
                const char = characters.find((c) => c.id === e.target.value)
                if (char) setTeam(char.base_category)
              }}
              className="w-full mt-1 p-2 border rounded-xl text-sm bg-white"
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
            <span className="text-xs text-gray-500 font-medium">Or Add New Character</span>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                placeholder="Name (e.g. Apple Blossom)"
                value={newCharName}
                onChange={(e) => setNewCharName(e.target.value)}
                className="w-1/2 p-2 border rounded-xl text-xs"
              />
              <input
                type="text"
                placeholder="Category (e.g. Fruit & Veg)"
                value={newCharCategory}
                onChange={(e) => setNewCharCategory(e.target.value)}
                className="w-1/2 p-2 border rounded-xl text-xs"
              />
              <button
                type="button"
                onClick={handleCreateCharacter}
                className="bg-pink-500 hover:bg-pink-600 text-white px-3 py-2 rounded-xl text-xs font-bold"
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
          <label className="text-xs font-bold text-gray-700">Variant Name / Colorway Edition</label>
          <input
            type="text"
            required
            placeholder="e.g. Classic Green, Yellow Alternate, Metallic Pink"
            value={variantName}
            onChange={(e) => setVariantName(e.target.value)}
            className="w-full mt-1 p-2.5 border rounded-xl text-sm"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-700">Season #</label>
            <input
              type="number"
              placeholder="e.g. 1"
              value={season}
              onChange={(e) => setSeason(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full mt-1 p-2 border rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">Release Year</label>
            <input
              type="number"
              value={releaseYear}
              onChange={(e) => setReleaseYear(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full mt-1 p-2 border rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">Team / Category</label>
            <input
              type="text"
              required
              placeholder="e.g. Bakery"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              className="w-full mt-1 p-2 border rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">Release Type</label>
            <select
              value={releaseType}
              onChange={(e) => setReleaseType(e.target.value)}
              className="w-full mt-1 p-2 border rounded-xl text-sm bg-white"
            >
              {RELEASE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-700">Pack / Release Name</label>
          <input
            type="text"
            placeholder="e.g. 12-Pack, Supermarket Playset, Fashion Spree Tin"
            value={releaseName}
            onChange={(e) => setReleaseName(e.target.value)}
            className="w-full mt-1 p-2.5 border rounded-xl text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-700">Rarity Tier</label>
            <select
              value={rarity}
              onChange={(e) => setRarity(e.target.value)}
              className="w-full mt-1 p-2 border rounded-xl text-sm bg-white"
            >
              {RARITIES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">Finish / Texture</label>
            <select
              value={finish}
              onChange={(e) => setFinish(e.target.value)}
              className="w-full mt-1 p-2 border rounded-xl text-sm bg-white"
            >
              {FINISHES.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Color Tags Selector */}
        <div>
          <label className="text-xs font-bold text-gray-700 mb-1.5 block">Color Tags</label>
          <div className="flex flex-wrap gap-1.5">
            {AVAILABLE_COLORS.map((color) => {
              const active = selectedColors.includes(color)
              return (
                <button
                  type="button"
                  key={color}
                  onClick={() => toggleColor(color)}
                  className={`text-xs px-3 py-1 rounded-full border transition flex items-center gap-1.5 ${
                    active
                      ? 'bg-pink-500 border-pink-500 text-white font-medium'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-black/10"
                    style={{ backgroundColor: color.toLowerCase() === 'clear' ? 'rgba(200,200,200,0.5)' : color.toLowerCase() }}
                  />
                  {color}
                </button>
              )
            })}
          </div>
        </div>

        {/* Multi-Photo Manager & Cover Selector */}
        <div className="border border-pink-100 bg-pink-50/20 p-4 rounded-2xl">
          <div className="flex justify-between items-center mb-2">
            <div>
              <label className="text-xs font-bold text-gray-800 block">Figure Photos</label>
              <p className="text-[11px] text-gray-500">
                Upload catalog art, in-hand photos, or box shots. Click any photo to set it as the cover!
              </p>
            </div>
            <label className="cursor-pointer bg-pink-100 hover:bg-pink-200 text-pink-700 font-bold px-3 py-1.5 rounded-xl text-xs transition">
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
            <div className="text-center py-8 border-2 border-dashed border-pink-200 rounded-xl text-xs text-pink-300">
              No photos added yet. Upload stock art, packaging, or real photos!
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              {photos.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => setCoverIndex(idx)}
                  className={`relative p-2 rounded-xl border-2 transition cursor-pointer bg-white ${
                    coverIndex === idx ? 'border-pink-500 ring-2 ring-pink-200' : 'border-gray-200 hover:border-pink-200'
                  }`}
                >
                  <div className="w-full h-24 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden mb-2">
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
                      className="text-[10px] bg-gray-50 border border-gray-200 rounded p-1 w-full"
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
                      className="text-gray-400 hover:text-red-500 text-sm px-1"
                    >
                      ×
                    </button>
                  </div>

                  {coverIndex === idx && (
                    <span className="absolute top-1 left-1 bg-pink-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
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
          className="w-full py-3.5 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-2xl transition shadow-md disabled:bg-gray-300 text-sm"
        >
          {uploading ? 'Uploading Figure...' : 'Save Figure to Catalog'}
        </button>

        {statusMessage && (
          <p className="text-center text-xs font-bold text-pink-600 mt-2">
            {statusMessage}
          </p>
        )}
      </form>
    </div>
  )
}
