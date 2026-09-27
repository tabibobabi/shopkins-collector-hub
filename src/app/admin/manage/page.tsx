'use client'

import { useEffect, useState } from 'react'
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

export default function AdminManagePage() {
  const [items, setItems] = useState<ShopkinItem[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingItem, setEditingItem] = useState<ShopkinItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  // New photos to append during edit
  const [newFiles, setNewFiles] = useState<File[]>([])

  useEffect(() => {
    fetchData()
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
    setEditingItem({ ...item })
    setNewFiles([])
    setStatusMessage('')
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
      let finalImages = [...editingItem.images]

      // Upload any new photos attached during editing
      for (const file of newFiles) {
        const fileExt = file.name.split('.').pop()
        const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, '_')
        const fileName = `${Date.now()}-${cleanName}.${fileExt}`

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

      const { error: updateError } = await supabase
        .from('items')
        .update({
          character_id: editingItem.character_id,
          variant_name: editingItem.variant_name,
          season: editingItem.season === null || (editingItem.season as any) === '' ? null : Number(editingItem.season),
          release_type: editingItem.release_type,
          release_name: editingItem.release_name,
          release_year: editingItem.release_year === null || (editingItem.release_year as any) === '' ? null : Number(editingItem.release_year),
          team: editingItem.team,
          rarity: editingItem.rarity,
          finish: editingItem.finish,
          color_tags: editingItem.color_tags,
          images: finalImages,
          cover_image_url: coverUrl
        })
        .eq('id', editingItem.id)

      if (updateError) throw updateError

      setStatusMessage('Item updated successfully!')
      setEditingItem(null)
      fetchData()
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`)
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
      if (editingItem?.id === id) setEditingItem(null)
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
                      <img
                        src={item.cover_image_url}
                        alt=""
                        className="w-10 h-10 object-contain rounded-lg bg-pink-50/50 p-1 border border-pink-100"
                      />
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
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto relative border border-pink-100 shadow-2xl">
            <button
              onClick={() => setEditingItem(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-xl"
            >
              ×
            </button>

            <h2 className="text-xl font-black text-gray-800 mb-4">Edit Shopkin Listing</h2>

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
                <label className="text-xs font-bold text-gray-700 block mb-1">Current Photos (Click to set Cover)</label>
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
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files) setNewFiles(Array.from(e.target.files))
                  }}
                  className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-pink-100 file:text-pink-600 hover:file:bg-pink-200"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl text-xs transition shadow-xs disabled:bg-gray-300"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
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
