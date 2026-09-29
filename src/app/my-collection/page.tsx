'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../utils/supabase'
import type { User } from '@supabase/supabase-js'
import Window from '../../components/ui/Window'
import { rarityClass } from '../../utils/shopkins'

interface UserItemRecord {
  id: string
  status: 'owned' | 'wishlist'
  quantity: number
  item: {
    id: string
    variant_name: string
    season: number | null
    rarity: string
    team: string
    cover_image_url: string
    characters: {
      name: string
    }
  }
}

export default function MyCollectionPage() {
  const [user, setUser] = useState<User | null>(null)
  const [collection, setCollection] = useState<UserItemRecord[]>([])
  const [activeTab, setActiveTab] = useState<'owned' | 'wishlist'>('owned')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchCollection(session.user.id)
      } else {
        setLoading(false)
      }
    })
  }, [])

  async function fetchCollection(userId: string) {
    const { data, error } = await supabase
      .from('user_items')
      .select(`
        id,
        status,
        quantity,
        item:items (
          id,
          variant_name,
          season,
          rarity,
          team,
          cover_image_url,
          characters ( name )
        )
      `)
      .eq('user_id', userId)

    if (!error && data) {
      setCollection(data as unknown as UserItemRecord[])
    }
    setLoading(false)
  }

  const ownedItems = collection.filter((i) => i.status === 'owned')
  const wishlistItems = collection.filter((i) => i.status === 'wishlist')
  const totalCount = ownedItems.reduce((acc, curr) => acc + curr.quantity, 0)

  if (loading) {
    return (
      <div className="py-24 text-center font-pixel text-lg text-primary-ink">
        <span className="sparkle" aria-hidden="true">✦</span> Loading your collector inventory...
      </div>
    )
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 sm:py-24">
        <Window title="inventory.exe" bodyClassName="p-6 text-center sm:p-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-line-strong bg-primary-soft text-3xl">
            🛍️
          </div>
          <h2 className="title-pop mb-2 text-2xl">Sign in to view your inventory!</h2>
          <p className="text-sm text-ink-soft">
            Use the Sign In button at the top of the page to start tracking figures and duplicates.
          </p>
          <Link href="/" className="btn-candy mt-6">
            Back to catalog
          </Link>
        </Window>
      </main>
    )
  }

  const displayedList = activeTab === 'owned' ? ownedItems : wishlistItems
  const stats = [
    { label: 'Total Owned', value: totalCount, className: 'bg-primary-soft text-primary-ink' },
    { label: 'Unique', value: ownedItems.length, className: 'bg-lavender-soft text-lavender-ink' },
    { label: 'Wishlist', value: wishlistItems.length, className: 'bg-butter-soft text-butter-ink' },
  ]

  return (
    <main className="mx-auto max-w-6xl px-3 py-6 sm:px-6 md:py-10">
      {/* Collector Profile Header */}
      <Window
        title="my_collection.exe"
        className="mb-6"
        bodyClassName="pattern-gingham flex flex-col items-center justify-between gap-5 p-5 sm:flex-row sm:p-8"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-line-strong bg-surface text-3xl shadow-[3px_3px_0_var(--shadow-pop)]">
            🛍️
          </div>
          <div className="min-w-0">
            <h1 className="title-pop truncate text-2xl sm:text-3xl">
              {user.email?.split('@')[0]}&apos;s Collection
            </h1>
            <p className="font-pixel text-xs text-ink-soft">Shopkins Collector & Hunter</p>
          </div>
        </div>

        {/* Collection Stats */}
        <div className="grid w-full grid-cols-3 gap-2 text-center sm:w-auto sm:gap-3">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={`rounded-2xl border-2 border-surface px-3 py-2.5 shadow-[3px_3px_0_var(--shadow-pop)] sm:px-5 sm:py-3 ${stat.className} ${
                index === 1 ? 'rotate-1' : '-rotate-1'
              }`}
            >
              <span className="block font-pixel text-2xl leading-tight sm:text-3xl">{stat.value}</span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider">{stat.label}</span>
            </div>
          ))}
        </div>
      </Window>

      {/* Tabs */}
      <div className="mb-5 flex gap-2" role="tablist" aria-label="Collection lists">
        <button
          role="tab"
          aria-selected={activeTab === 'owned'}
          onClick={() => setActiveTab('owned')}
          className={`${activeTab === 'owned' ? 'btn-candy' : 'btn-ghost'} flex-1 sm:flex-none`}
        >
          My Shopkins ({ownedItems.length})
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'wishlist'}
          onClick={() => setActiveTab('wishlist')}
          className={`${activeTab === 'wishlist' ? 'btn-candy btn-butter' : 'btn-ghost'} flex-1 sm:flex-none`}
        >
          My Wishlist ({wishlistItems.length})
        </button>
      </div>

      {/* Inventory Grid */}
      {displayedList.length === 0 ? (
        <div className="window mx-auto max-w-md px-6 py-12 text-center">
          <p className="mb-1 text-3xl" aria-hidden="true">
            {activeTab === 'owned' ? '🧺' : '⭐'}
          </p>
          <p className="font-display text-lg font-semibold text-ink">
            {activeTab === 'owned'
              ? 'You have not added any Shopkins to your collection yet.'
              : 'Your wishlist is empty.'}
          </p>
          <Link href="/" className="btn-candy mt-4">
            Browse the catalog
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
          {displayedList.map(({ id, quantity, item }) => (
            <div
              key={id}
              className="card-frame relative flex flex-col items-center p-3 text-center sm:p-4"
            >
              {quantity > 1 && activeTab === 'owned' && (
                <span className="sticker absolute -right-1.5 -top-2 z-10 rotate-6 bg-owned text-white">
                  x{quantity}
                </span>
              )}

              <div className="pattern-dots mb-3 aspect-square w-full max-w-28 overflow-hidden rounded-xl border-2 border-line">
                {item.cover_image_url?.trim() ? (
                  <img
                    src={item.cover_image_url}
                    alt={item.characters?.name}
                    loading="lazy"
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-display text-3xl font-bold text-primary">
                    {item.characters?.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
              </div>
              <h3 className="font-display text-sm font-semibold leading-tight text-ink">
                {item.characters?.name}
              </h3>
              <span className="mt-0.5 text-xs font-bold text-primary-ink">{item.variant_name}</span>

              <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
                {item.season && (
                  <span className="chip border-line-strong bg-primary-soft font-pixel font-normal text-primary-ink">
                    S{item.season}
                  </span>
                )}
                <span className={`chip ${rarityClass(item.rarity)}`}>{item.rarity}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
