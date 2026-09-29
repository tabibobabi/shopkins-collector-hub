'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../utils/supabase'
import Modal from '../../../components/ui/Modal'
import { rarityClass, swatchColor } from '../../../utils/shopkins'

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

  function renderCover(item: ShopkinItem) {
    return item.cover_image_url?.trim() ? (
      <img
        src={item.cover_image_url}
        alt=""
        className="pattern-dots h-12 w-12 shrink-0 rounded-lg border-2 border-line object-contain p-1"
      />
    ) : (
      <div
        aria-label={`No image for ${item.characters?.name || 'this Shopkin'}`}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 border-line bg-primary-soft font-display text-base font-bold text-primary-ink"
      >
        {item.characters?.name?.charAt(0).toUpperCase() || '?'}
      </div>
    )
  }

  function renderActions(item: ShopkinItem) {
    return (
      <>
        <button onClick={() => handleOpenEdit(item)} className="btn-candy btn-sm">
          Edit
        </button>
        <button onClick={() => handleOpenDuplicate(item)} className="btn-candy btn-lavender btn-sm">
          Duplicate
        </button>
        <button
          onClick={() => handleDeleteItem(item.id)}
          className="btn-ghost btn-sm hover:border-danger! hover:text-danger!"
        >
          Delete
        </button>
      </>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-3 py-6 sm:px-6 md:py-10">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="title-pop text-2xl sm:text-3xl">Manage Catalog Listings</h1>
          <p className="mt-1 text-xs text-ink-soft">Edit figure details, update finishes, or manage photos</p>
        </div>
        <Link href="/admin/add-item" className="btn-candy">
          + Add New Figure
        </Link>
      </div>

      <div className="mb-6">
        <input
          type="search"
          placeholder="Search listing to edit..."
          aria-label="Search listings"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="field max-w-md"
        />
      </div>

      {bannerMessage && (
        <div
          role="status"
          className="mb-5 rounded-2xl border-2 border-owned bg-mint-soft px-4 py-3 text-sm font-bold text-mint-ink"
        >
          ✓ {bannerMessage}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center font-pixel text-lg text-primary-ink">
          <span className="sparkle" aria-hidden="true">✦</span> Loading listings...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="window py-16 text-center text-sm font-bold text-ink-soft">
          No listings found.
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3 md:hidden">
            {filteredItems.map((item) => (
              <li key={item.id} className="card-frame p-3">
                <div className="flex items-center gap-3">
                  {renderCover(item)}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display font-semibold text-ink">{item.characters?.name}</p>
                    <p className="truncate text-xs font-bold text-primary-ink">{item.variant_name}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {item.season && (
                        <span className="chip border-line-strong bg-primary-soft font-pixel font-normal text-primary-ink">
                          S{item.season}
                        </span>
                      )}
                      <span className={`chip ${rarityClass(item.rarity)}`}>{item.rarity}</span>
                      <span className="chip">{item.finish}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">{renderActions(item)}</div>
              </li>
            ))}
          </ul>

          <div className="window hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-ink-soft">
                <thead className="window-titlebar table-header-group">
                  <tr>
                    <th className="p-3 font-normal">Cover</th>
                    <th className="p-3 font-normal">Character</th>
                    <th className="p-3 font-normal">Variant</th>
                    <th className="p-3 font-normal">Season</th>
                    <th className="p-3 font-normal">Rarity</th>
                    <th className="p-3 font-normal">Finish</th>
                    <th className="p-3 text-right font-normal">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-dashed divide-line">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="transition hover:bg-surface-2">
                      <td className="p-3">{renderCover(item)}</td>
                      <td className="p-3 font-display text-sm font-semibold text-ink">{item.characters?.name}</td>
                      <td className="p-3 font-bold text-primary-ink">{item.variant_name}</td>
                      <td className="p-3 font-pixel">{item.season ? `S${item.season}` : '—'}</td>
                      <td className="p-3">
                        <span className={`chip ${rarityClass(item.rarity)}`}>{item.rarity}</span>
                      </td>
                      <td className="p-3">{item.finish}</td>
                      <td className="p-3">
                        <div className="flex justify-end gap-2">{renderActions(item)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <Modal
          size="lg"
          title={isDuplicateMode ? 'duplicate_listing.exe' : 'edit_listing.exe'}
          onClose={closeEditModal}
          onPaste={handlePhotoPaste}
        >
            <h2 className="title-pop mb-4 text-2xl">
              {isDuplicateMode ? 'Duplicate Shopkin Listing' : 'Edit Shopkin Listing'}
            </h2>
            {isDuplicateMode && (
              <p className="-mt-2 mb-4 rounded-xl border-2 border-dashed border-lavender bg-lavender-soft px-3 py-2 text-xs font-semibold text-lavender-ink">
                The listing details and cover photo were copied. Adjust the variant and add
                variant-specific photos before creating it.
              </p>
            )}

            <form onSubmit={handleUpdateItem} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Base Character (Mold)</label>
                  <select
                    value={editingItem.character_id}
                    onChange={(e) => setEditingItem({ ...editingItem, character_id: e.target.value })}
                    className="field"
                  >
                    {characters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.base_category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="field-label">Variant Name</label>
                  <input
                    type="text"
                    required
                    value={editingItem.variant_name}
                    onChange={(e) => setEditingItem({ ...editingItem, variant_name: e.target.value })}
                    className="field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="field-label">Season #</label>
                  <input
                    type="number"
                    value={editingItem.season ?? ''}
                    onChange={(e) => setEditingItem({ ...editingItem, season: e.target.value === '' ? null : Number(e.target.value) })}
                    className="field"
                  />
                </div>
                <div>
                  <label className="field-label">Year</label>
                  <input
                    type="number"
                    value={editingItem.release_year ?? ''}
                    onChange={(e) => setEditingItem({ ...editingItem, release_year: e.target.value === '' ? null : Number(e.target.value) })}
                    className="field"
                  />
                </div>
                <div>
                  <label className="field-label">Team</label>
                  <input
                    type="text"
                    required
                    value={editingItem.team}
                    onChange={(e) => setEditingItem({ ...editingItem, team: e.target.value })}
                    className="field"
                  />
                </div>
                <div>
                  <label className="field-label">Release Type</label>
                  <select
                    value={editingItem.release_type}
                    onChange={(e) => setEditingItem({ ...editingItem, release_type: e.target.value })}
                    className="field"
                  >
                    {RELEASE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Rarity</label>
                  <select
                    value={editingItem.rarity}
                    onChange={(e) => setEditingItem({ ...editingItem, rarity: e.target.value })}
                    className="field"
                  >
                    {RARITIES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Finish</label>
                  <select
                    value={editingItem.finish}
                    onChange={(e) => setEditingItem({ ...editingItem, finish: e.target.value })}
                    className="field"
                  >
                    {FINISHES.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Color Tags */}
              <div>
                <label className="field-label">Color Tags</label>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_COLORS.map((c) => {
                    const active = editingItem.color_tags?.includes(c)
                    return (
                      <button
                        key={c}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleColor(c)}
                        className={`flex min-h-8 items-center gap-1.5 rounded-full border-2 px-2.5 py-1 text-xs font-bold transition ${
                          active
                            ? 'border-primary bg-primary-soft text-primary-ink'
                            : 'border-line bg-surface text-ink-soft hover:border-line-strong'
                        }`}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full border border-black/10"
                          style={{ backgroundColor: swatchColor(c) }}
                        />
                        {c}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Photos & Cover Selection */}
              <div>
                <label className="field-label">
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
                        editingItem.cover_image_url === url ? 'border-primary ring-2 ring-primary-soft' : 'border-line'
                      }`}
                    >
                      <img src={url} alt="" className="pattern-dots h-16 w-16 rounded-lg object-contain" />
                      {editingItem.cover_image_url === url && (
                        <span className="absolute bottom-1 right-1 rounded bg-primary px-1 text-[9px] font-bold text-on-primary">
                          Cover
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeExistingImage(url)
                        }}
                        aria-label="Remove photo"
                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-danger text-xs font-bold text-white"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <span className="field-label">Add More Photos</span>
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
                      ? 'border-primary bg-primary-soft ring-4 ring-primary-soft'
                      : 'pattern-dots border-line-strong hover:border-primary'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="mb-2 flex h-10 w-10 items-center justify-center rounded-full border-2 border-line-strong bg-surface text-xl text-primary-ink"
                  >
                    ↑
                  </span>
                  <span className="text-sm font-bold text-ink">
                    Drag &amp; drop image here or click to browse
                  </span>
                  <span className="mt-1 text-[11px] text-ink-faint">
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
                    <p className="mb-2 font-pixel text-xs text-primary-ink">
                      Pending uploads ({pendingPhotos.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {pendingPhotos.map((photo) => (
                        <div
                          key={photo.id}
                          className="relative rounded-xl border-2 border-dashed border-line-strong bg-primary-soft p-1"
                        >
                          <img
                            src={photo.previewUrl}
                            alt={`Pending upload: ${photo.file.name || 'pasted image'}`}
                            className="h-20 w-20 rounded-lg bg-surface object-contain"
                          />
                          <span className="absolute bottom-1 left-1 rounded bg-primary px-1 text-[9px] font-bold text-on-primary">
                            Pending
                          </span>
                          <button
                            type="button"
                            aria-label={`Remove ${photo.file.name || 'pasted image'}`}
                            onClick={() => removePendingPhoto(photo.id)}
                            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-danger text-xs font-bold text-white"
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
                  className="btn-candy min-h-11 flex-1"
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
                  className="btn-ghost min-h-11 w-1/3"
                >
                  Cancel
                </button>
              </div>

              {statusMessage && (
                <p className="mt-2 text-center text-xs font-bold text-primary-ink">{statusMessage}</p>
              )}
            </form>
        </Modal>
      )}
    </main>
  )
}
