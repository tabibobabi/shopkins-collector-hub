'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'
import type { User } from '@supabase/supabase-js'
import Modal from '../components/ui/Modal'
import { WindowTitlebar } from '../components/ui/Window'
import {
  COLOR_MAP,
  compareChecklistOrder,
  rarityClass,
  swatchColor,
  variantLabel,
} from '../utils/shopkins'

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
  const uploadedPhotos = (item.images ?? [])
    .map((url, index) => ({
      url,
      type: item.image_types?.[index],
    }))
    .filter((photo) => Boolean(photo.url?.trim()))
  const coverUrl = item.cover_image_url?.trim()
  const coverPhoto = uploadedPhotos.find((photo) => photo.url === coverUrl)
  const photos = coverUrl
    ? [
        coverPhoto ?? { url: coverUrl, type: undefined },
        ...uploadedPhotos.filter((photo) => photo.url !== coverUrl),
      ]
    : uploadedPhotos
  const hasMultiplePhotos = photos.length > 1
  const activeIndex = activePhotoIndex % Math.max(photos.length, 1)
  const activePhoto = photos[activeIndex]
  const activePhotoType = photoTypeLabel(activePhoto?.type)
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
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen(item)
        }
      }}
      aria-label={`${item.characters?.name ?? 'Shopkin'} – ${item.variant_name}`}
      className={`card-frame is-interactive group relative flex cursor-pointer flex-col items-center p-3 text-center sm:p-4 ${
        isOwned ? 'border-owned! ring-2 ring-owned/20' : ''
      }`}
    >
      {isOwned && (
        <span className="sticker absolute -right-1.5 -top-2 z-10 rotate-6 bg-owned text-white">
          ✓ {statusEntry.quantity > 1 ? `x${statusEntry.quantity}` : 'Owned'}
        </span>
      )}
      {isWishlist && (
        <span className="sticker absolute -right-1.5 -top-2 z-10 rotate-6 bg-wish text-[#3d2600]">
          ★ Wish
        </span>
      )}

      <div className="pattern-dots relative mb-3 aspect-square w-full max-w-32 overflow-hidden rounded-xl border-2 border-line">
        {activePhoto?.url ? (
          <img
            src={activePhoto.url}
            alt={item.characters?.name || item.variant_name}
            loading="lazy"
            className="h-full w-full object-contain p-1 transition-opacity duration-200"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-display text-3xl font-bold text-primary">
            {item.characters?.name?.charAt(0).toUpperCase() || '?'}
          </div>
        )}

        {activePhotoType && (
          <span className="absolute left-1 top-1 rounded-full bg-ink/75 px-1.5 py-0.5 font-pixel text-[9px] leading-none text-surface backdrop-blur-xs">
            {activePhotoType}
          </span>
        )}

        {hasMultiplePhotos && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={(event) => cyclePhoto(event, -1)}
              className="reveal-on-hover absolute left-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border-2 border-line-strong bg-surface/90 text-lg font-black leading-none text-primary-ink shadow-md transition-opacity duration-200"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={(event) => cyclePhoto(event, 1)}
              className="reveal-on-hover absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border-2 border-line-strong bg-surface/90 text-lg font-black leading-none text-primary-ink shadow-md transition-opacity duration-200"
            >
              ›
            </button>
            <div className="absolute inset-x-0 bottom-1.5 flex justify-center gap-1">
              {photos.map((photo, index) => (
                <span
                  key={`${photo.url}-${index}`}
                  className={`h-1.5 w-1.5 rounded-full transition ${
                    index === activeIndex ? 'bg-primary' : 'bg-surface ring-1 ring-line-strong'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <h2 className="font-display text-sm font-semibold leading-tight text-ink md:text-base">
        {item.characters?.name}
      </h2>
      <span className="mt-0.5 text-xs font-bold text-primary-ink">{variantLabel(item.variant_name)}</span>

      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
        {item.season && (
          <span className="chip border-line-strong bg-primary-soft font-pixel font-normal text-primary-ink">
            S{item.season}
          </span>
        )}
        <span className={`chip ${rarityClass(item.rarity)}`}>{item.rarity}</span>

        {item.color_tags && item.color_tags.length > 0 && (
          <div className="flex items-center gap-1 rounded-full border border-line bg-surface-2 px-1.5 py-1">
            {item.color_tags.map((color) => (
              <span
                key={color}
                title={color}
                className="inline-block h-2.5 w-2.5 rounded-full border border-black/15"
                style={{ backgroundColor: swatchColor(color) }}
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
  const [selectedTeam, setSelectedTeam] = useState('all')
  const [sortOrder, setSortOrder] = useState<'checklist' | 'newest'>('checklist')
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)
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
      .select('*, characters(id, name, base_category)')
      .eq('character_id', item.character_id)
      .neq('id', item.id)

    if (data) {
      setVariants(
        (data as ShopkinItem[]).sort((a, b) =>
          compareChecklistOrder(a.variant_name, b.variant_name)
        )
      )
    }
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

  const teams = Array.from(
    new Set(items.map((item) => item.team).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b))

  const availableColors = Object.keys(COLOR_MAP)
  const normalizedSearch = search.trim().toLowerCase().replace(/^#/, '')
  const filteredItems = items.filter((item) => {
    const matchesName =
      normalizedSearch === '' ||
      item.characters?.name.toLowerCase().includes(normalizedSearch) ||
      item.variant_name.toLowerCase().includes(normalizedSearch)
    const matchesSeason =
      selectedSeason === 'all' || item.season === Number(selectedSeason)
    const matchesRarity =
      selectedRarity === 'all' || item.rarity === selectedRarity
    const matchesTeam = selectedTeam === 'all' || item.team === selectedTeam
    const itemColors = new Set(
      (item.color_tags ?? []).map((color) => color.toLowerCase())
    )
    const matchesColors = selectedColors.every((color) => itemColors.has(color))

    return matchesName && matchesSeason && matchesRarity && matchesTeam && matchesColors
  })
  const visibleItems =
    sortOrder === 'checklist'
      ? [...filteredItems].sort((a, b) => compareChecklistOrder(a.variant_name, b.variant_name))
      : filteredItems

  const hasActiveFilters =
    search !== '' ||
    selectedSeason !== 'all' ||
    selectedRarity !== 'all' ||
    selectedTeam !== 'all' ||
    selectedColors.length > 0
  const panelFilterCount =
    (selectedSeason !== 'all' ? 1 : 0) +
    (selectedRarity !== 'all' ? 1 : 0) +
    (selectedTeam !== 'all' ? 1 : 0) +
    selectedColors.length

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
    setSelectedTeam('all')
    setSelectedColors([])
  }

  const selectedStatus = selectedItem ? userCollection[selectedItem.id] : undefined
  const isSelectedOwned = selectedStatus?.status === 'owned'
  const isSelectedWishlist = selectedStatus?.status === 'wishlist'

  return (
    <main className="px-3 py-6 sm:px-6 md:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="window pattern-gingham mb-6 px-5 py-6 text-center sm:py-10">
          <span className="sparkle absolute left-4 top-3 text-xl text-primary sm:left-8 sm:top-6 sm:text-2xl" aria-hidden="true">✦</span>
          <span className="sparkle absolute bottom-3 right-5 text-lg text-lavender-ink [animation-delay:0.8s] sm:bottom-6 sm:right-10 sm:text-2xl" aria-hidden="true">✧</span>
          <span className="sparkle absolute right-10 top-4 hidden text-sm text-butter-ink [animation-delay:1.6s] sm:inline" aria-hidden="true">★</span>
          <p className="mb-2 inline-block rounded-full border-2 border-line-strong bg-surface px-3 py-0.5 font-pixel text-[11px] text-primary-ink">
            ♡ welcome, collector ♡
          </p>
          <h1 className="title-pop text-3xl sm:text-5xl">Shopkins Collector Hub</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm font-semibold text-ink-soft sm:text-base">
            Search characters, explore finishes, and view every mold variant!
          </p>
        </header>

        <div className="window sticky top-[73px] z-30 mb-6">
          <WindowTitlebar
            title="search_shopkins.exe"
            actions={
              <span className="flex items-center gap-2 font-sans text-[11px] font-bold">
                <span className="text-ink-soft">
                  {visibleItems.length} {visibleItems.length === 1 ? 'item' : 'items'}
                </span>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-primary-ink underline-offset-2 hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </span>
            }
          />

          <div className="p-3 sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="flex min-w-0 flex-1 items-end gap-2">
                <label className="min-w-0 flex-1">
                  <span className="field-label hidden sm:block">Shopkin name or #</span>
                  <input
                    type="search"
                    placeholder="Search Shopkins or #1-001..."
                    aria-label="Search Shopkins by name or checklist number"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="field"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setFiltersOpen((open) => !open)}
                  aria-expanded={filtersOpen}
                  aria-controls="catalog-filters"
                  className={`${panelFilterCount > 0 ? 'btn-candy' : 'btn-ghost'} h-11 shrink-0 sm:hidden`}
                >
                  Filters{panelFilterCount > 0 ? ` (${panelFilterCount})` : ''}
                  <span aria-hidden="true">{filtersOpen ? '▴' : '▾'}</span>
                </button>
              </div>

              <div
                id="catalog-filters"
                className={`${filtersOpen ? 'grid' : 'hidden'} grid-cols-2 gap-3 sm:grid sm:grid-cols-4 lg:grid-cols-[9rem_9rem_10rem_9rem]`}
              >
                <label>
                  <span className="field-label">Season</span>
                  <select
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(e.target.value)}
                    className="field"
                  >
                    <option value="all">All seasons</option>
                    {seasons.map((season) => (
                      <option key={season} value={season}>
                        Season {season}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="field-label">Rarity</span>
                  <select
                    value={selectedRarity}
                    onChange={(e) => setSelectedRarity(e.target.value)}
                    className="field"
                  >
                    <option value="all">All rarities</option>
                    {rarities.map((rarity) => (
                      <option key={rarity} value={rarity}>
                        {rarity}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="field-label">Team</span>
                  <select
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                    className="field"
                  >
                    <option value="all">All teams</option>
                    {teams.map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="field-label">Sort</span>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'checklist' | 'newest')}
                    className="field"
                  >
                    <option value="checklist">Checklist #</option>
                    <option value="newest">Newest</option>
                  </select>
                </label>
              </div>
            </div>

            <div className={`${filtersOpen ? 'block' : 'hidden'} mt-3 border-t-2 border-dashed border-line pt-3 sm:block`}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-xs font-extrabold text-ink-soft">Colors</span>
                  <span className="ml-2 hidden text-[11px] text-ink-faint sm:inline">
                    Select multiple for exact color combinations
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedColors([])}
                  disabled={selectedColors.length === 0}
                  className="chip transition hover:border-line-strong hover:text-primary-ink disabled:cursor-default disabled:opacity-40"
                >
                  Reset colors
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {availableColors.map((color) => {
                  const isSelected = selectedColors.includes(color)

                  return (
                    <button
                      key={color}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => toggleColorFilter(color)}
                      className={`flex min-h-8 items-center gap-1.5 rounded-full border-2 px-2.5 py-1 text-[11px] font-bold capitalize transition ${
                        isSelected
                          ? 'border-primary bg-primary-soft text-primary-ink'
                          : 'border-line bg-surface text-ink-soft hover:border-line-strong'
                      }`}
                    >
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-black/15"
                        style={{ backgroundColor: COLOR_MAP[color] }}
                      />
                      {color}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center font-pixel text-lg text-primary-ink">
            <span className="sparkle" aria-hidden="true">✦</span> Loading collection catalog...
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="window mx-auto max-w-md px-6 py-12 text-center">
            <p className="mb-1 text-3xl" aria-hidden="true">🔍</p>
            <p className="font-display text-lg font-semibold text-ink">No Shopkins match these filters.</p>
            <button type="button" onClick={clearFilters} className="btn-candy mt-4">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
            {visibleItems.map((item) => (
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
          <Modal
            title={`${selectedItem.characters?.name ?? 'shopkin'}.jpg`}
            onClose={() => setSelectedItem(null)}
          >
            <div className="flex flex-col items-center text-center">
              <div className="pattern-dots mb-3 rounded-2xl border-2 border-line p-2">
                <img
                  src={modalActiveImage || selectedItem.cover_image_url}
                  alt={selectedItem.characters?.name}
                  className="h-40 w-40 object-contain transition"
                />
              </div>

              {selectedItem.images && selectedItem.images.length > 1 && (
                <div className="mb-3 flex flex-wrap justify-center gap-2">
                  {selectedItem.images.map((imgUrl, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Show photo ${i + 1}`}
                      onClick={() => setModalActiveImage(imgUrl)}
                      className={`h-11 w-11 rounded-lg border-2 bg-surface p-0.5 transition ${
                        modalActiveImage === imgUrl ? 'border-primary' : 'border-line opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={imgUrl} alt="" className="h-full w-full object-contain" />
                    </button>
                  ))}
                </div>
              )}

              <h3 className="title-pop text-2xl sm:text-3xl">{selectedItem.characters?.name}</h3>
              <p className="mb-4 text-sm font-bold text-primary-ink">{variantLabel(selectedItem.variant_name)}</p>

              {/* Collection Tracking Interactive Bar */}
              <div className="mb-4 flex w-full flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-line bg-surface-2 p-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleOwned(selectedItem.id)}
                    aria-pressed={isSelectedOwned}
                    className={isSelectedOwned ? 'btn-candy btn-mint' : 'btn-ghost'}
                  >
                    <span aria-hidden="true">✓</span>
                    <span>{isSelectedOwned ? 'Owned' : 'I Own This'}</span>
                  </button>

                  {/* Duplicate Counter */}
                  {isSelectedOwned && (
                    <div className="flex h-10 items-center rounded-full border-2 border-line-strong bg-surface">
                      <button
                        onClick={() => updateQuantity(selectedItem.id, -1)}
                        aria-label="Decrease quantity"
                        className="flex h-full w-9 items-center justify-center text-base font-black text-ink-soft hover:text-primary-ink"
                      >
                        −
                      </button>
                      <span className="min-w-5 text-center font-pixel text-sm text-ink">
                        {selectedStatus?.quantity || 1}
                      </span>
                      <button
                        onClick={() => updateQuantity(selectedItem.id, 1)}
                        aria-label="Increase quantity"
                        className="flex h-full w-9 items-center justify-center text-base font-black text-ink-soft hover:text-primary-ink"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>

                {/* Wishlist Toggle */}
                <button
                  onClick={() => toggleWishlist(selectedItem.id)}
                  aria-pressed={isSelectedWishlist}
                  className={isSelectedWishlist ? 'btn-candy btn-butter' : 'btn-ghost'}
                >
                  <span aria-hidden="true">★</span>
                  <span>{isSelectedWishlist ? 'On Wishlist' : 'Wishlist'}</span>
                </button>
              </div>

              <dl className="mb-4 grid w-full grid-cols-2 gap-x-3 gap-y-2 rounded-2xl border-2 border-dashed border-line bg-surface-2 p-4 text-left text-xs">
                {[
                  ['Team', selectedItem.team],
                  ['Rarity', selectedItem.rarity],
                  ['Finish', selectedItem.finish],
                  ['Release', selectedItem.release_type],
                  ['Pack', selectedItem.release_name || 'Standard'],
                  ['Year', selectedItem.release_year ?? 'N/A'],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="font-pixel text-[11px] text-ink-faint">{label}</dt>
                    <dd className="font-bold text-ink">{value}</dd>
                  </div>
                ))}
              </dl>

              {/* Color Dot Badges */}
              {selectedItem.color_tags && selectedItem.color_tags.length > 0 && (
                <div className="mb-4 flex w-full flex-wrap items-center gap-2 text-left">
                  <span className="font-pixel text-xs text-ink-faint">Colors:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedItem.color_tags.map((c) => (
                      <span key={c} className="chip text-[11px] font-bold">
                        <span
                          className="h-2 w-2 rounded-full border border-black/10"
                          style={{ backgroundColor: swatchColor(c) }}
                        />
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Variants of the same Mold */}
              <div className="mt-2 w-full border-t-2 border-dashed border-line pt-3 text-left">
                <h4 className="mb-2 font-pixel text-xs text-ink-soft">
                  Other Colorways & Variants of this Mold:
                </h4>
                {variants.length === 0 ? (
                  <p className="text-xs italic text-ink-faint">No other variants recorded yet.</p>
                ) : (
                  <div className="flex gap-2 overflow-x-auto py-1">
                    {variants.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => openItemDetails(v)}
                        className="card-frame is-interactive w-24 shrink-0 cursor-pointer p-2 text-center"
                      >
                        <img
                          src={v.cover_image_url}
                          alt={v.variant_name}
                          className="mx-auto mb-1 h-16 w-16 object-contain"
                        />
                        <p className="truncate text-[10px] font-bold text-ink">{variantLabel(v.variant_name)}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Modal>
        )}
      </div>
    </main>
  )
}
