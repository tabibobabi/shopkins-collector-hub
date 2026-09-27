'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
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

interface ShopkinItem {
  id: string
  character_id: string
  variant_name: string
  season: number | null
  release_type: string
  release_name: string | null
  release_year: number | null
  team: string
  rarity: string
  finish: string
  color_tags: string[]
  images: string[]
  cover_image_url: string
  characters?: Character
}

interface PendingPhoto {
  id: string
  file: File
  previewUrl: string
}

export default function AdminManagePage() {
  const [items, setItems] = useState<ShopkinItem[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingItem, setEditingItem] = useState<ShopkinItem | null>(null)
  const [isDuplicateMode, setIsDuplicateMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [bannerMessage, setBannerMessage] = useState('')

  // New photos to append during edit
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([])
  const pendingPhotosRef = useRef<PendingPhoto[]>([])
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false)

  useEffect(() => {
    fetchData()

    return () => {
      pendingPhotosRef.current.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl))
    }
  }, [])

  async function fetchData() {
    setLoading(true)
    const { data: chars } = await supabase.from('characters').select('*').order('name', { ascending: true })
    if (chars) setCharacters(chars)

    const { data: itemList } = await supabase
      .from('items')
      .select('*, characters(id, name, base_category)')
      .order('created_at', { ascending: false })

    if (itemList) setItems(itemList as ShopkinItem[])
    setLoading(false)
  }

  function handleOpenEdit(item: ShopkinItem) {
    clearPendingPhotos()
    setIsDuplicateMode(false)
    setEditingItem({ ...item })
    setStatusMessage('')
  }

  function handleOpenDuplicate(item: ShopkinItem) {
    clearPendingPhotos()
    const carriedCover = item.cover_image_url?.trim() ? item.cover_image_url : ''
    setIsDuplicateMode(true)
    setEditingItem({
      ...item,
      variant_name: `${item.variant_name} (Copy)`,
      images: carriedCover ? [carriedCover] : [],
      cover_image_url: carriedCover,
    })
    setStatusMessage('')
  }

  function updatePendingPhotos(photos: PendingPhoto[]) {
    pendingPhotosRef.current = photos
    setPendingPhotos(photos)
  }

  function clearPendingPhotos() {
    pendingPhotosRef.current.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl))
    updatePendingPhotos([])
    setIsDraggingPhoto(false)
  }

  function closeEditModal() {
    clearPendingPhotos()
    setEditingItem(null)
    setIsDuplicateMode(false)
  }

  function stagePhotos(files: File[]) {
    const imageFiles = files.filter((file) => file.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      setStatusMessage('Please choose an image file.')
      return
    }

    const stagedPhotos = imageFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file)
    }))

    updatePendingPhotos([...pendingPhotosRef.current, ...stagedPhotos])
    setStatusMessage('')
  }

  function removePendingPhoto(id: string) {
    const photo = pendingPhotosRef.current.find((entry) => entry.id === id)
    if (photo) URL.revokeObjectURL(photo.previewUrl)
    updatePendingPhotos(pendingPhotosRef.current.filter((entry) => entry.id !== id))
  }

  function handlePhotoPaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const pastedImages = Array.from(e.clipboardData.items)
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null)

    if (pastedImages.length > 0) {
      e.preventDefault()
      stagePhotos(pastedImages)
    }
  }

  function toggleColor(color: string) {
    if (!editingItem) return
    const current = editingItem.color_tags || []
    const updated = current.includes(color)
      ? current.filter((c) => c !== color)
      : [...current, color]
    setEditingItem({ ...editingItem, color_tags: updated })
  }

  function removeExistingImage(urlToRemove: string) {
    if (!editingItem) return
    const updatedImages = editingItem.images.filter((img) => img !== urlToRemove)
    let newCover = editingItem.cover_image_url
    if (newCover === urlToRemove) {
      newCover = updatedImages[0] || ''
    }
    setEditingItem({
      ...editingItem,
      images: updatedImages,
      cover_image_url: newCover
    })
  }

  async function handleUpdateItem(e: React.FormEvent) {
    e.preventDefault()
    if (!editingItem) return
    setSaving(true)
    setStatusMessage('Saving changes...')

    try {
      const finalImages = [...editingItem.images]

      // Upload any new photos attached during editing
      for (const { file } of pendingPhotos) {
        const mimeExtension = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png'
        const fileExt = file.name.includes('.') ? file.name.split('.').pop() : mimeExtension
        const cleanName =
          file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_') ||
          'pasted-image'
        const fileName = `${Date.now()}-${crypto.randomUUID()}-${cleanName}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('shopkins-images')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('shopkins-images')
          .getPublicUrl(fileName)

        finalImages.push(publicUrl)
      }

      const coverUrl = finalImages.includes(editingItem.cover_image_url)
        ? editingItem.cover_image_url
        : finalImages[0] || ''

      if (!coverUrl) {
        throw new Error('Please keep the stock art or add at least one photo.')
      }

      const itemValues = {
        character_id: editingItem.character_id,
        variant_name: editingItem.variant_name,
        season: editingItem.season === null ? null : Number(editingItem.season),
        release_type: editingItem.release_type,
        release_name: editingItem.release_name,
        release_year: editingItem.release_year === null ? null : Number(editingItem.release_year),
        team: editingItem.team,
        rarity: editingItem.rarity,
        finish: editingItem.finish,
        color_tags: editingItem.color_tags,
        images: finalImages,
        cover_image_url: coverUrl
      }
      const result = isDuplicateMode
        ? await supabase.from('items').insert(itemValues)
        : await supabase.from('items').update(itemValues).eq('id', editingItem.id)

      if (result.error) throw result.error

      setBannerMessage(
        isDuplicateMode
          ? `Created duplicate “${editingItem.variant_name}”.`
          : `Updated “${editingItem.variant_name}”.`
      )
      closeEditModal()
      await fetchData()
      window.setTimeout(() => setBannerMessage(''), 4000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred'
      setStatusMessage(`Error: ${message}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteItem(id: string) {
    const confirmDelete = window.confirm('Are you sure you want to permanently delete this listing?')
    if (!confirmDelete) return

    const { error } = await supabase.from('items').delete().eq('id', id)
    if (error) {
      alert(`Error deleting item: ${error.message}`)
    } else {
      setItems((prev) => prev.filter((item) => item.id !== id))
      if (editingItem?.id === id) closeEditModal()
    }
  }

  const filteredItems = items.filter((item) => {
    const nameMatch = item.characters?.name.toLowerCase().includes(search.toLowerCase())
    const variantMatch = item.variant_name.toLowerCase().includes(search.toLowerCase())
    const teamMatch = item.team.toLowerCase().includes(search.toLowerCase())
    return nameMatch || variantMatch || teamMatch
  })

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-pink-600">Manage Catalog Listings</h1>
          <p className="text-xs text-gray-400 mt-1">Edit figure details, update finishes, or manage photos</p>
        </div>
        <Link
          href="/admin/add-item"
          className="bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition inline-block text-center"
        >
          + Add New Figure
        </Link>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search listing to edit..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2 border rounded-xl text-sm bg-white shadow-xs focus:ring-2 focus:ring-pink-300 focus:outline-none"
        />
      </div>

      {bannerMessage && (
        <div
          role="status"
          className="mb-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700 shadow-xs"
        >
          ✓ {bannerMessage}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-pink-400 font-bold">Loading listings...</div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-pink-100 text-gray-400 text-sm">
          No listings found.
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-pink-100 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-pink-50/60 text-pink-700 uppercase font-bold text-[10px] tracking-wider border-b border-pink-100">
                <tr>
                  <th className="p-3">Cover</th>
                  <th className="p-3">Character</th>
                  <th className="p-3">Variant</th>
                  <th className="p-3">Season</th>
                  <th className="p-3">Rarity</th>
                  <th className="p-3">Finish</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-50">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-pink-50/30 transition">
                    <td className="p-3">
                      {item.cover_image_url?.trim() ? (
                        <img
                          src={item.cover_image_url}
                          alt=""
                          className="w-10 h-10 object-contain rounded-lg bg-pink-50/50 p-1 border border-pink-100"
                        />
                      ) : (
                        <div
                          aria-label={`No image for ${item.characters?.name || 'this Shopkin'}`}
                          className="flex h-10 w-10 items-center justify-center rounded-lg border border-pink-100 bg-pink-50 text-sm font-black text-pink-500"
                        >
                          {item.characters?.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                    </td>
                    <td className="p-3 font-bold text-gray-800">{item.characters?.name}</td>
                    <td className="p-3 font-medium text-pink-600">{item.variant_name}</td>
                    <td className="p-3">{item.season ? `S${item.season}` : '—'}</td>
                    <td className="p-3">{item.rarity}</td>
                    <td className="p-3">{item.finish}</td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="bg-pink-100 hover:bg-pink-200 text-pink-700 font-bold px-2.5 py-1 rounded-lg transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleOpenDuplicate(item)}
                        className="rounded-lg bg-purple-100 px-2.5 py-1 font-bold text-purple-700 transition hover:bg-purple-200"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600 font-bold px-2.5 py-1 rounded-lg transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-shopkin-title"
            tabIndex={-1}
            autoFocus
            onPaste={handlePhotoPaste}
            className="bg-white rounded-3xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto relative border border-pink-100 shadow-2xl outline-none"
          >
            <button
              onClick={closeEditModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-xl"
            >
              ×
            </button>

            <h2 id="edit-shopkin-title" className="text-xl font-black text-gray-800">
              {isDuplicateMode ? 'Duplicate Shopkin Listing' : 'Edit Shopkin Listing'}
            </h2>
            {isDuplicateMode && (
              <p className="mb-4 mt-1 rounded-xl border border-purple-100 bg-purple-50 px-3 py-2 text-xs text-purple-700">
                The listing details and cover photo were copied. Adjust the variant and add
                variant-specific photos before creating it.
              </p>
            )}

            <form onSubmit={handleUpdateItem} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700">Base Character (Mold)</label>
                  <select
                    value={editingItem.character_id}
                    onChange={(e) => setEditingItem({ ...editingItem, character_id: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-xl text-xs bg-white"
                  >
                    {characters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.base_category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700">Variant Name</label>
                  <input
                    type="text"
                    required
                    value={editingItem.variant_name}
                    onChange={(e) => setEditingItem({ ...editingItem, variant_name: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Season #</label>
                  <input
                    type="number"
                    value={editingItem.season ?? ''}
                    onChange={(e) => setEditingItem({ ...editingItem, season: e.target.value === '' ? null : Number(e.target.value) })}
                    className="w-full mt-1 p-2 border rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Year</label>
                  <input
                    type="number"
                    value={editingItem.release_year ?? ''}
                    onChange={(e) => setEditingItem({ ...editingItem, release_year: e.target.value === '' ? null : Number(e.target.value) })}
                    className="w-full mt-1 p-2 border rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Team</label>
                  <input
                    type="text"
                    required
                    value={editingItem.team}
                    onChange={(e) => setEditingItem({ ...editingItem, team: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Release Type</label>
                  <select
                    value={editingItem.release_type}
                    onChange={(e) => setEditingItem({ ...editingItem, release_type: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-xl text-xs bg-white"
                  >
                    {RELEASE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Rarity</label>
                  <select
                    value={editingItem.rarity}
                    onChange={(e) => setEditingItem({ ...editingItem, rarity: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-xl text-xs bg-white"
                  >
                    {RARITIES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Finish</label>
                  <select
                    value={editingItem.finish}
                    onChange={(e) => setEditingItem({ ...editingItem, finish: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-xl text-xs bg-white"
                  >
                    {FINISHES.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Color Tags */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Color Tags</label>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_COLORS.map((c) => {
                    const active = editingItem.color_tags?.includes(c)
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleColor(c)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition ${
                          active
                            ? 'bg-pink-500 text-white border-pink-500 font-bold'
                            : 'bg-gray-50 border-gray-200 text-gray-600'
                        }`}
                      >
                        {c}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Photos & Cover Selection */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  {isDuplicateMode
                    ? 'Carried-over Stock Art (Click to set Cover)'
                    : 'Current Photos (Click to set Cover)'}
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {editingItem.images?.map((url, i) => (
                    <div
                      key={i}
                      onClick={() => setEditingItem({ ...editingItem, cover_image_url: url })}
                      className={`relative cursor-pointer p-1 rounded-xl border-2 transition ${
                        editingItem.cover_image_url === url ? 'border-pink-500 ring-2 ring-pink-200' : 'border-gray-200'
                      }`}
                    >
                      <img src={url} alt="" className="w-16 h-16 object-contain bg-pink-50/30 rounded-lg" />
                      {editingItem.cover_image_url === url && (
                        <span className="absolute bottom-1 right-1 bg-pink-500 text-white text-[9px] font-bold px-1 rounded">
                          Cover
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeExistingImage(url)
                        }}
                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <label className="text-xs font-semibold text-gray-600 block mb-1">Add More Photos</label>
                <label
                  onDragEnter={(e) => {
                    e.preventDefault()
                    setIsDraggingPhoto(true)
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'copy'
                    setIsDraggingPhoto(true)
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                      setIsDraggingPhoto(false)
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    setIsDraggingPhoto(false)
                    stagePhotos(Array.from(e.dataTransfer.files))
                  }}
                  className={`flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-6 text-center transition ${
                    isDraggingPhoto
                      ? 'border-pink-500 bg-pink-100 ring-4 ring-pink-100'
                      : 'border-pink-200 bg-pink-50/40 hover:border-pink-400 hover:bg-pink-50'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl text-pink-500 shadow-xs"
                  >
                    ↑
                  </span>
                  <span className="text-sm font-bold text-gray-700">
                    Drag &amp; drop image here or click to browse
                  </span>
                  <span className="mt-1 text-[11px] text-gray-400">
                    You can also paste an image with Cmd+V
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files) stagePhotos(Array.from(e.target.files))
                      e.currentTarget.value = ''
                    }}
                    className="sr-only"
                  />
                </label>

                {pendingPhotos.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-pink-600">
                      Pending uploads ({pendingPhotos.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {pendingPhotos.map((photo) => (
                        <div
                          key={photo.id}
                          className="relative rounded-xl border-2 border-dashed border-pink-300 bg-pink-50 p-1"
                        >
                          <img
                            src={photo.previewUrl}
                            alt={`Pending upload: ${photo.file.name || 'pasted image'}`}
                            className="h-20 w-20 rounded-lg bg-white object-contain"
                          />
                          <span className="absolute bottom-1 left-1 rounded bg-pink-500 px-1 text-[9px] font-bold text-white">
                            Pending
                          </span>
                          <button
                            type="button"
                            aria-label={`Remove ${photo.file.name || 'pasted image'}`}
                            onClick={() => removePendingPhoto(photo.id)}
                            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white shadow-xs"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-pink-500 py-3 text-xs font-bold text-white shadow-xs transition hover:bg-pink-600 disabled:bg-gray-300"
                >
                  {saving && (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  )}
                  <span>
                    {saving
                      ? isDuplicateMode
                        ? 'Creating Duplicate...'
                        : 'Saving...'
                      : isDuplicateMode
                        ? 'Create Duplicate'
                        : 'Save Changes'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="w-1/3 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
              </div>

              {statusMessage && (
                <p className="text-center text-xs font-bold text-pink-600 mt-2">{statusMessage}</p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
