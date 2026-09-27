'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../utils/supabase'
import type { User } from '@supabase/supabase-js'

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
      <div className="text-center py-24 text-pink-400 font-bold">
        Loading your collector inventory...
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto text-center py-24 px-4">
        <h2 className="text-2xl font-black text-gray-800 mb-2">Sign in to view your inventory!</h2>
        <p className="text-sm text-gray-500 mb-6">
          Use the Sign In button at the top right to start tracking figures and duplicates.
        </p>
      </div>
    )
  }

  const displayedList = activeTab === 'owned' ? ownedItems : wishlistItems

  return (
    <main className="max-w-6xl mx-auto p-6 md:p-12">
      {/* Collector Profile Header */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-pink-100 shadow-xs mb-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center text-3xl font-black">
            🛍️
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-800">
              {user.email?.split('@')[0]}'s Collection
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">Shopkins Collector & Hunter</p>
          </div>
        </div>

        {/* Collection Stats */}
        <div className="flex items-center gap-4 text-center">
          <div className="bg-pink-50 px-5 py-3 rounded-2xl border border-pink-100">
            <span className="block text-2xl font-black text-pink-600">{totalCount}</span>
            <span className="text-[11px] font-bold text-pink-400 uppercase tracking-wider">Total Owned</span>
          </div>
          <div className="bg-purple-50 px-5 py-3 rounded-2xl border border-purple-100">
            <span className="block text-2xl font-black text-purple-600">{ownedItems.length}</span>
            <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">Unique</span>
          </div>
          <div className="bg-amber-50 px-5 py-3 rounded-2xl border border-amber-100">
            <span className="block text-2xl font-black text-amber-500">{wishlistItems.length}</span>
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Wishlist</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('owned')}
          className={`px-5 py-2.5 rounded-full font-bold text-xs transition ${
            activeTab === 'owned'
              ? 'bg-pink-500 text-white shadow-xs'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          My Shopkins ({ownedItems.length})
        </button>
        <button
          onClick={() => setActiveTab('wishlist')}
          className={`px-5 py-2.5 rounded-full font-bold text-xs transition ${
            activeTab === 'wishlist'
              ? 'bg-amber-400 text-white shadow-xs'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          My Wishlist ({wishlistItems.length})
        </button>
      </div>

      {/* Inventory Grid */}
      {displayedList.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-pink-100">
          <p className="text-sm font-semibold text-gray-400">
            {activeTab === 'owned'
              ? 'You have not added any Shopkins to your collection yet.'
              : 'Your wishlist is empty.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {displayedList.map(({ id, quantity, item }) => (
            <div
              key={id}
              className="bg-white rounded-2xl p-4 shadow-xs border border-pink-100 flex flex-col items-center text-center relative"
            >
              {quantity > 1 && activeTab === 'owned' && (
                <span className="absolute top-2.5 right-2.5 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                  x{quantity}
                </span>
              )}

              <img
                src={item.cover_image_url}
                alt={item.characters?.name}
                className="w-24 h-24 object-contain rounded-lg mb-3 bg-pink-50/40"
              />
              <h3 className="font-bold text-gray-800 text-sm leading-tight">
                {item.characters?.name}
              </h3>
              <span className="text-xs text-pink-500 font-medium">{item.variant_name}</span>

              <div className="mt-2 flex gap-1">
                {item.season && (
                  <span className="text-[10px] bg-pink-100 text-pink-600 font-bold px-2 py-0.5 rounded-full">
                    S{item.season}
                  </span>
                )}
                <span className="text-[10px] bg-purple-100 text-purple-600 font-medium px-2 py-0.5 rounded-full">
                  {item.rarity}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}