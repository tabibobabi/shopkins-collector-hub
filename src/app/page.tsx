'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'
import type { User } from '@supabase/supabase-js'

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
  image_types?: string[]
  cover_image_url: string
  characters?: Character
}

interface UserItem {
  item_id: string
  status: 'owned' | 'wishlist'
  quantity: number
}

const COLOR_MAP: Record<string, string> = {
  pink: '#f472b6',
  blue: '#60a5fa',
  yellow: '#facc15',
  green: '#4ade80',
  purple: '#c084fc',
  orange: '#fb923c',
  white: '#f3f4f6',
  brown: '#a8715a',
  red: '#f87171',
  clear: 'rgba(220, 220, 220, 0.7)',
  gold: '#fbbf24',
  silver: '#cbd5e1'
}

const RARITY_STYLES: Record<string, string> = {
  Common: 'bg-gray-100 text-gray-600 border-gray-200',
  Rare: 'bg-green-100 text-green-700 border-green-200',
  'Ultra Rare': 'bg-pink-100 text-pink-700 border-pink-200',
  'Special Edition': 'bg-blue-100 text-blue-700 border-blue-200',
  'Limited Edition': 'bg-amber-100 text-amber-700 border-amber-300',
}

function photoTypeLabel(type: string | undefined) {
  if (type === 'Stock / Catalog') return 'Stock Art'
  return type
}

function CatalogCard({
  item,
  statusEntry,
  onOpen,
}: {
  item: ShopkinItem
  statusEntry?: UserItem
  onOpen: (item: ShopkinItem) => void
}) {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0)
  const imageUrls = (item.images ?? []).filter((url) => Boolean(url?.trim()))
  const photos =
    imageUrls.length > 0
      ? imageUrls
      : item.cover_image_url?.trim()
        ? [item.cover_image_url]
        : []
  const hasMultiplePhotos = photos.length > 1
  const activeIndex = activePhotoIndex % Math.max(photos.length, 1)
  const activePhoto = photos[activeIndex]
  const activePhotoType = photoTypeLabel(item.image_types?.[activeIndex])
  const isOwned = statusEntry?.status === 'owned'
  const isWishlist = statusEntry?.status === 'wishlist'

  function cyclePhoto(
    event: React.MouseEvent<HTMLButtonElement>,
    direction: -1 | 1
  ) {
    event.preventDefault()
    event.stopPropagation()
    setActivePhotoIndex((current) => (current + direction + photos.length) % photos.length)
  }

  return (
    <div
      onClick={() => onOpen(item)}
      className={`group relative flex cursor-pointer flex-col items-center rounded-2xl border bg-white p-4 text-center shadow-xs transition hover:-translate-y-1 hover:shadow-md ${
        isOwned ? 'border-green-300 ring-2 ring-green-100' : 'border-pink-100'
      }`}
    >
      {isOwned && (
        <span className="absolute right-2.5 top-2.5 z-10 rounded-full bg-green-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
          ✓ {statusEntry.quantity > 1 ? `x${statusEntry.quantity}` : 'Owned'}
        </span>
      )}
      {isWishlist && (
        <span className="absolute right-2.5 top-2.5 z-10 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
          ★ Wish
        </span>
      )}

      <div className="relative mb-3 h-28 w-28 overflow-hidden rounded-lg bg-pink-50/40">
        {activePhoto ? (
          <img
            src={activePhoto}
            alt={item.characters?.name || item.variant_name}
            className="h-full w-full object-contain transition-opacity duration-200"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl font-black text-pink-300">
            {item.characters?.name?.charAt(0).toUpperCase() || '?'}
          </div>
        )}

        {activePhotoType && (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-gray-900/70 px-1.5 py-0.5 text-[8px] font-bold text-white backdrop-blur-xs">
            {activePhotoType}
          </span>
        )}

        {hasMultiplePhotos && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={(event) => cyclePhoto(event, -1)}
              className="absolute left-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg font-bold text-pink-600 opacity-0 shadow-md transition-opacity duration-200 hover:bg-white focus:opacity-100 group-hover:opacity-100"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={(event) => cyclePhoto(event, 1)}
              className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg font-bold text-pink-600 opacity-0 shadow-md transition-opacity duration-200 hover:bg-white focus:opacity-100 group-hover:opacity-100"
            >
              ›
            </button>
            <div className="absolute inset-x-0 bottom-1.5 flex justify-center gap-1">
              {photos.map((photo, index) => (
                <span
                  key={`${photo}-${index}`}
                  className={`h-1.5 w-1.5 rounded-full shadow-xs transition ${
                    index === activeIndex ? 'bg-pink-500' : 'bg-white/90 ring-1 ring-gray-300'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <h2 className="text-sm font-bold leading-tight text-gray-800 md:text-base">
        {item.characters?.name}
      </h2>
      <span className="mt-0.5 text-xs font-medium text-pink-500">{item.variant_name}</span>

      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
        {item.season && (
          <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-bold text-pink-600">
            S{item.season}
          </span>
        )}
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
            RARITY_STYLES[item.rarity] ??
            'border-purple-200 bg-purple-100 text-purple-600'
          }`}
        >
          {item.rarity}
        </span>

        {item.color_tags && item.color_tags.length > 0 && (
          <div className="ml-0.5 flex items-center gap-1 rounded-full border border-gray-100 bg-gray-50 px-1.5 py-1">
            {item.color_tags.map((color) => (
              <span
                key={color}
                title={color}
                className="inline-block h-2.5 w-2.5 rounded-full border border-black/15 shadow-2xs"
                style={{ backgroundColor: COLOR_MAP[color.toLowerCase()] || '#cbd5e1' }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Home() {
  const [items, setItems] = useState<ShopkinItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedSeason, setSelectedSeason] = useState('all')
  const [selectedRarity, setSelectedRarity] = useState('all')
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [selectedItem, setSelectedItem] = useState<ShopkinItem | null>(null)
  const [modalActiveImage, setModalActiveImage] = useState<string>('')
  const [variants, setVariants] = useState<ShopkinItem[]>([])
  
  // User collection state
  const [user, setUser] = useState<User | null>(null)
  const [userCollection, setUserCollection] = useState<Record<string, UserItem>>({})

  useEffect(() => {
    fetchItems()
    checkUserAndCollection()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserCollection(session.user.id)
      } else {
        setUserCollection({})
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function checkUserAndCollection() {
    const { data: { session } } = await supabase.auth.getSession()
    setUser(session?.user ?? null)
    if (session?.user) {
      fetchUserCollection(session.user.id)
    }
  }

  async function fetchUserCollection(userId: string) {
    const { data } = await supabase
      .from('user_items')
      .select('item_id, status, quantity')
      .eq('user_id', userId)

    if (data) {
      const map: Record<string, UserItem> = {}
      data.forEach((entry: any) => {
        map[entry.item_id] = entry
      })
      setUserCollection(map)
    }
  }

  async function fetchItems() {
    const { data, error } = await supabase
      .from('items')
      .select('*, characters(id, name, base_category)')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching items:', error.message)
    } else if (data) {
      setItems(data as ShopkinItem[])
    }
    setLoading(false)
  }

  async function openItemDetails(item: ShopkinItem) {
    setSelectedItem(item)
    setModalActiveImage(item.cover_image_url)

    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('character_id', item.character_id)
      .neq('id', item.id)

    if (data) setVariants(data as ShopkinItem[])
  }

  // Toggle Owned Status
  async function toggleOwned(itemId: string) {
    if (!user) {
      alert('Please sign in first to save Shopkins to your collection!')
      return
    }

    const current = userCollection[itemId]
    if (current && current.status === 'owned') {
      // Remove from collection
      await supabase.from('user_items').delete().eq('user_id', user.id).eq('item_id', itemId)
      const next = { ...userCollection }
      delete next[itemId]
      setUserCollection(next)
    } else {
      // Add as owned with quantity 1
      const { data, error } = await supabase
        .from('user_items')
        .upsert({ user_id: user.id, item_id: itemId, status: 'owned', quantity: 1 })
        .select()
        .single()

      if (!error && data) {
        setUserCollection({ ...userCollection, [itemId]: data as UserItem })
      }
    }
  }

  // Update Duplicates Counter
  async function updateQuantity(itemId: string, delta: number) {
    if (!user) return
    const current = userCollection[itemId]
    if (!current || current.status !== 'owned') return

    const newQty = Math.max(1, current.quantity + delta)
    const { data, error } = await supabase
      .from('user_items')
      .update({ quantity: newQty })
      .eq('user_id', user.id)
      .eq('item_id', itemId)
      .select()
      .single()

    if (!error && data) {
      setUserCollection({ ...userCollection, [itemId]: data as UserItem })
    }
  }

  // Toggle Wishlist Status
  async function toggleWishlist(itemId: string) {
    if (!user) {
      alert('Please sign in first to add items to your wishlist!')
      return
    }

    const current = userCollection[itemId]
    if (current && current.status === 'wishlist') {
      await supabase.from('user_items').delete().eq('user_id', user.id).eq('item_id', itemId)
      const next = { ...userCollection }
      delete next[itemId]
      setUserCollection(next)
    } else {
      const { data, error } = await supabase
        .from('user_items')
        .upsert({ user_id: user.id, item_id: itemId, status: 'wishlist', quantity: 1 })
        .select()
        .single()

      if (!error && data) {
        setUserCollection({ ...userCollection, [itemId]: data as UserItem })
      }
    }
  }

  const seasons = Array.from(
    new Set(items.flatMap((item) => (item.season === null ? [] : [item.season])))
  ).sort((a, b) => a - b)

  const rarities = Array.from(
    new Set(items.map((item) => item.rarity).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b))

  const availableColors = Object.keys(COLOR_MAP)
  const normalizedSearch = search.trim().toLowerCase()
  const filteredItems = items.filter((item) => {
    const matchesName =
      normalizedSearch === '' ||
      item.characters?.name.toLowerCase().includes(normalizedSearch)
    const matchesSeason =
      selectedSeason === 'all' || item.season === Number(selectedSeason)
    const matchesRarity =
      selectedRarity === 'all' || item.rarity === selectedRarity
    const itemColors = new Set(
      (item.color_tags ?? []).map((color) => color.toLowerCase())
    )
    const matchesColors = selectedColors.every((color) => itemColors.has(color))

    return matchesName && matchesSeason && matchesRarity && matchesColors
  })

  const hasActiveFilters =
    search !== '' ||
    selectedSeason !== 'all' ||
    selectedRarity !== 'all' ||
    selectedColors.length > 0

  function toggleColorFilter(color: string) {
    setSelectedColors((current) =>
      current.includes(color)
        ? current.filter((selectedColor) => selectedColor !== color)
        : [...current, color]
    )
  }

  function clearFilters() {
    setSearch('')
    setSelectedSeason('all')
    setSelectedRarity('all')
    setSelectedColors([])
  }

  return (
    <main className="p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold text-pink-600 tracking-tight">
            Shopkins Collector Hub
          </h1>
          <p className="text-pink-400 mt-2 font-medium">
            Search characters, explore finishes, and view every mold variant!
          </p>
        </header>

        <div className="sticky top-16 z-30 mb-6 rounded-2xl border border-pink-200 bg-white/95 p-3 shadow-md backdrop-blur-md sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="min-w-0 flex-1">
              <span className="mb-1 block text-xs font-bold text-pink-600">
                Shopkin name
              </span>
              <input
                type="search"
                placeholder="Search Shopkins..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-pink-200 bg-pink-50/40 px-3.5 py-2.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-pink-400 focus:bg-white focus:ring-2 focus:ring-pink-200"
              />
            </label>

            <label className="sm:w-40">
              <span className="mb-1 block text-xs font-bold text-pink-600">Season</span>
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
                className="w-full rounded-xl border border-pink-200 bg-pink-50/40 px-3.5 py-2.5 text-sm text-gray-700 outline-none transition focus:border-pink-400 focus:bg-white focus:ring-2 focus:ring-pink-200"
              >
                <option value="all">All seasons</option>
                {seasons.map((season) => (
                  <option key={season} value={season}>
                    Season {season}
                  </option>
                ))}
              </select>
            </label>

            <label className="sm:w-40">
              <span className="mb-1 block text-xs font-bold text-pink-600">Rarity</span>
              <select
                value={selectedRarity}
                onChange={(e) => setSelectedRarity(e.target.value)}
                className="w-full rounded-xl border border-pink-200 bg-pink-50/40 px-3.5 py-2.5 text-sm text-gray-700 outline-none transition focus:border-pink-400 focus:bg-white focus:ring-2 focus:ring-pink-200"
              >
                <option value="all">All rarities</option>
                {rarities.map((rarity) => (
                  <option key={rarity} value={rarity}>
                    {rarity}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-center justify-between gap-3 sm:h-10 sm:min-w-28 sm:flex-col sm:items-end sm:justify-center">
              <span className="text-xs font-semibold text-gray-500">
                {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-bold text-pink-600 transition hover:text-pink-700 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 border-t border-pink-100 pt-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-pink-600">Colors</span>
                <span className="ml-2 text-[11px] text-gray-400">
                  Select multiple for exact color combinations
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedColors([])}
                disabled={selectedColors.length === 0}
                className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-500 transition hover:bg-pink-100 hover:text-pink-600 disabled:cursor-default disabled:opacity-40"
              >
                Reset colors
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {availableColors.map((color) => {
                const isSelected = selectedColors.includes(color)

                return (
                  <button
                    key={color}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggleColorFilter(color)}
                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize transition ${
                      isSelected
                        ? 'border-pink-400 bg-pink-50 text-pink-700 ring-2 ring-pink-200'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-pink-300'
                    }`}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-black/15 shadow-2xs"
                      style={{ backgroundColor: COLOR_MAP[color] }}
                    />
                    {color}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-pink-400 font-semibold text-lg">
            Loading collection catalog...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="font-semibold text-gray-500">No Shopkins match these filters.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 rounded-full bg-pink-100 px-4 py-2 text-sm font-bold text-pink-600 transition hover:bg-pink-200"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredItems.map((item) => (
              <CatalogCard
                key={item.id}
                item={item}
                statusEntry={userCollection[item.id]}
                onOpen={openItemDetails}
              />
            ))}
          </div>
        )}

        {/* Modal: Item Details + Gallery + Collection Tracking + Variants */}
        {selectedItem && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto relative">
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl font-bold"
              >
                ×
              </button>

              <div className="flex flex-col items-center text-center">
                <img
                  src={modalActiveImage || selectedItem.cover_image_url}
                  alt={selectedItem.characters?.name}
                  className="w-40 h-40 object-contain mb-2 bg-pink-50/50 rounded-2xl p-2 transition"
                />

                {selectedItem.images && selectedItem.images.length > 1 && (
                  <div className="flex gap-2 mb-3">
                    {selectedItem.images.map((imgUrl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setModalActiveImage(imgUrl)}
                        className={`w-10 h-10 rounded-lg p-0.5 border-2 transition ${
                          modalActiveImage === imgUrl ? 'border-pink-500' : 'border-gray-200 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={imgUrl} alt="" className="w-full h-full object-contain" />
                      </button>
                    ))}
                  </div>
                )}

                <h3 className="text-2xl font-black text-gray-800">
                  {selectedItem.characters?.name}
                </h3>
                <p className="text-sm font-semibold text-pink-500 mb-4">{selectedItem.variant_name}</p>

                {/* Collection Tracking Interactive Bar */}
                <div className="w-full bg-pink-50/60 p-3 rounded-2xl border border-pink-100 mb-4 flex items-center justify-between gap-2">
                  {/* Owned Toggle */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleOwned(selectedItem.id)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition ${
                        userCollection[selectedItem.id]?.status === 'owned'
                          ? 'bg-green-500 text-white shadow-xs'
                          : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>✓</span>
                      <span>{userCollection[selectedItem.id]?.status === 'owned' ? 'Owned' : 'I Own This'}</span>
                    </button>

                    {/* Duplicate Counter */}
                    {userCollection[selectedItem.id]?.status === 'owned' && (
                      <div className="flex items-center bg-white rounded-xl border border-gray-200 px-1 py-0.5">
                        <button
                          onClick={() => updateQuantity(selectedItem.id, -1)}
                          className="px-2 text-xs font-bold text-gray-500 hover:text-pink-600"
                        >
                          -
                        </button>
                        <span className="text-xs font-black px-1 text-gray-700">
                          {userCollection[selectedItem.id]?.quantity || 1}
                        </span>
                        <button
                          onClick={() => updateQuantity(selectedItem.id, 1)}
                          className="px-2 text-xs font-bold text-gray-500 hover:text-pink-600"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Wishlist Toggle */}
                  <button
                    onClick={() => toggleWishlist(selectedItem.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition ${
                      userCollection[selectedItem.id]?.status === 'wishlist'
                        ? 'bg-amber-400 text-white shadow-xs'
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>★</span>
                    <span>{userCollection[selectedItem.id]?.status === 'wishlist' ? 'On Wishlist' : 'Wishlist'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 w-full text-left text-xs bg-pink-50/50 p-4 rounded-xl mb-4">
                  <div><strong className="text-gray-500">Team:</strong> {selectedItem.team}</div>
                  <div><strong className="text-gray-500">Rarity:</strong> {selectedItem.rarity}</div>
                  <div><strong className="text-gray-500">Finish:</strong> {selectedItem.finish}</div>
                  <div><strong className="text-gray-500">Release:</strong> {selectedItem.release_type}</div>
                  <div><strong className="text-gray-500">Pack:</strong> {selectedItem.release_name || 'Standard'}</div>
                  <div><strong className="text-gray-500">Year:</strong> {selectedItem.release_year ?? 'N/A'}</div>
                </div>

                {/* Color Dot Badges */}
                {selectedItem.color_tags && selectedItem.color_tags.length > 0 && (
                  <div className="flex items-center gap-2 mb-4 w-full text-left">
                    <span className="text-xs font-bold text-gray-500 uppercase">Colors:</span>
                    <div className="flex gap-1.5">
                      {selectedItem.color_tags.map((c) => (
                        <span
                          key={c}
                          className="flex items-center gap-1 text-[11px] font-medium bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full"
                        >
                          <span
                            className="w-2 h-2 rounded-full border border-black/10"
                            style={{ backgroundColor: COLOR_MAP[c.toLowerCase()] || '#cbd5e1' }}
                          />
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Variants of the same Mold */}
                <div className="w-full text-left mt-2 border-t border-gray-100 pt-3">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Other Colorways & Variants of this Mold:
                  </h4>
                  {variants.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No other variants recorded yet.</p>
                  ) : (
                    <div className="flex gap-2 overflow-x-auto py-1">
                      {variants.map((v) => (
                        <div
                          key={v.id}
                          onClick={() => openItemDetails(v)}
                          className="shrink-0 cursor-pointer text-center bg-gray-50 p-2 rounded-xl border border-gray-200 hover:border-pink-300 w-24"
                        >
                          <img
                            src={v.cover_image_url}
                            alt={v.variant_name}
                            className="w-16 h-16 object-contain mx-auto mb-1"
                          />
                          <p className="text-[10px] font-semibold text-gray-700 truncate">{v.variant_name}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
