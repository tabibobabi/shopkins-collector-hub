'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../../utils/supabase'

interface Profile {
  id: string
  username: string | null
  avatar_url: string | null
}

interface OwnedItem {
  id: string
  quantity: number
  item: {
    id: string
    variant_name: string
    season: number | null
    rarity: string
    cover_image_url: string
    characters: {
      name: string
    }
  }
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [profileExists, setProfileExists] = useState(false)
  const [ownedItems, setOwnedItems] = useState<OwnedItem[]>([])
  const [seasonOneTotal, setSeasonOneTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    let active = true

    async function loadUserData(currentUser: User) {
      setLoading(true)

      const [profileResult, collectionResult, seasonResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .eq('id', currentUser.id)
          .maybeSingle(),
        supabase
          .from('user_items')
          .select(`
            id,
            quantity,
            item:items!inner (
              id,
              variant_name,
              season,
              rarity,
              cover_image_url,
              characters!inner ( name )
            )
          `)
          .eq('user_id', currentUser.id)
          .eq('status', 'owned'),
        supabase
          .from('items')
          .select('id', { count: 'exact', head: true })
          .eq('season', 1),
      ])

      if (!active) return

      if (profileResult.error) {
        setStatusMessage(`Could not load profile: ${profileResult.error.message}`)
      }

      const profile = profileResult.data as Profile | null
      setProfileExists(Boolean(profile))
      setUsername(profile?.username || currentUser.email?.split('@')[0] || '')
      setAvatarUrl(profile?.avatar_url ?? null)

      if (!collectionResult.error && collectionResult.data) {
        setOwnedItems(collectionResult.data as unknown as OwnedItem[])
      } else if (collectionResult.error) {
        setStatusMessage(`Could not load collection: ${collectionResult.error.message}`)
      }

      setSeasonOneTotal(seasonResult.count ?? 0)
      setLoading(false)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        void loadUserData(currentUser)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        void loadUserData(currentUser)
      } else {
        setOwnedItems([])
        setLoading(false)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  function notifyProfileUpdated(nextUsername: string, nextAvatarUrl: string | null) {
    window.dispatchEvent(
      new CustomEvent('profile-updated', {
        detail: { username: nextUsername, avatarUrl: nextAvatarUrl },
      })
    )
  }

  async function saveProfile() {
    if (!user) return

    const trimmedUsername = username.trim()
    if (!trimmedUsername) {
      setStatusMessage('Please enter a username.')
      return
    }

    setSaving(true)
    setStatusMessage('')

    const profileValues = {
      username: trimmedUsername,
      avatar_url: avatarUrl,
    }
    const result = profileExists
      ? await supabase.from('profiles').update(profileValues).eq('id', user.id)
      : await supabase.from('profiles').insert({ id: user.id, ...profileValues })

    if (result.error) {
      setStatusMessage(`Could not save profile: ${result.error.message}`)
    } else {
      setUsername(trimmedUsername)
      setProfileExists(true)
      setStatusMessage('Profile saved!')
      notifyProfileUpdated(trimmedUsername, avatarUrl)
    }

    setSaving(false)
  }

  async function uploadAvatar(file: File) {
    if (!user) return
    if (!file.type.startsWith('image/')) {
      setStatusMessage('Please choose an image file.')
      return
    }

    setUploadingAvatar(true)
    setStatusMessage('')

    const mimeExtension = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png'
    const extension = file.name.includes('.') ? file.name.split('.').pop() : mimeExtension
    const storagePath = `avatars/${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`
    const { error: uploadError } = await supabase.storage
      .from('shopkins-images')
      .upload(storagePath, file, { contentType: file.type })

    if (uploadError) {
      setStatusMessage(`Could not upload avatar: ${uploadError.message}`)
      setUploadingAvatar(false)
      return
    }

    const { data: publicUrlData } = supabase.storage
      .from('shopkins-images')
      .getPublicUrl(storagePath)
    const nextAvatarUrl = publicUrlData.publicUrl
    const nextUsername = username.trim() || user.email?.split('@')[0] || 'Collector'
    const profileValues = {
      username: nextUsername,
      avatar_url: nextAvatarUrl,
    }
    const result = profileExists
      ? await supabase.from('profiles').update(profileValues).eq('id', user.id)
      : await supabase.from('profiles').insert({ id: user.id, ...profileValues })

    if (result.error) {
      await supabase.storage.from('shopkins-images').remove([storagePath])
      setStatusMessage(`Could not update avatar: ${result.error.message}`)
    } else {
      setAvatarUrl(nextAvatarUrl)
      setUsername(nextUsername)
      setProfileExists(true)
      setStatusMessage('Avatar updated!')
      notifyProfileUpdated(nextUsername, nextAvatarUrl)
    }

    setUploadingAvatar(false)
  }

  if (loading) {
    return (
      <div className="py-24 text-center text-lg font-bold text-pink-400">
        Loading your profile...
      </div>
    )
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <div className="rounded-3xl border border-pink-100 bg-white p-8 shadow-xs">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-pink-100 text-3xl">
            🍓
          </div>
          <h1 className="text-2xl font-black text-gray-800">Sign in to view your profile</h1>
          <p className="mt-2 text-sm text-gray-500">
            Sign in from the navigation bar to manage your collector profile and collection.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-full bg-pink-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-pink-600"
          >
            Back to catalog
          </Link>
        </div>
      </main>
    )
  }

  const totalOwned = ownedItems.reduce((total, entry) => total + entry.quantity, 0)
  const seasonOneOwned = ownedItems.filter(({ item }) => item.season === 1).length
  const seasonOnePercent =
    seasonOneTotal > 0 ? Math.min(100, Math.round((seasonOneOwned / seasonOneTotal) * 100)) : 0
  const displayInitial = (username || user.email || '?').charAt(0).toUpperCase()

  return (
    <main className="mx-auto max-w-6xl p-6 md:p-12">
      <div className="mb-8 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <section className="rounded-3xl border border-pink-100 bg-white p-6 shadow-xs md:p-8">
          <h1 className="text-2xl font-black text-gray-800">Your Profile</h1>
          <p className="mt-1 text-xs text-gray-400">Update your collector details and avatar.</p>

          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex flex-col items-center gap-2">
              {avatarUrl?.trim() ? (
                <img
                  src={avatarUrl}
                  alt={`${username || 'Collector'} avatar`}
                  className="h-24 w-24 rounded-3xl border-4 border-pink-100 object-cover shadow-sm"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl border-4 border-pink-100 bg-pink-50 text-3xl font-black text-pink-500">
                  {displayInitial}
                </div>
              )}
              <label className="cursor-pointer rounded-full bg-pink-100 px-3 py-1.5 text-xs font-bold text-pink-600 transition hover:bg-pink-200">
                {uploadingAvatar ? 'Uploading...' : 'Change avatar'}
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingAvatar}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void uploadAvatar(file)
                    event.currentTarget.value = ''
                  }}
                  className="sr-only"
                />
              </label>
            </div>

            <div className="flex-1 space-y-4">
              <label className="block">
                <span className="text-xs font-bold text-gray-600">Username</span>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-pink-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-gray-600">Email</span>
                <input
                  type="email"
                  value={user.email ?? ''}
                  readOnly
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-500"
                />
              </label>
              <button
                type="button"
                onClick={() => void saveProfile()}
                disabled={saving}
                className="rounded-xl bg-pink-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-pink-600 disabled:bg-pink-300"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>

          {statusMessage && (
            <p className="mt-4 rounded-xl bg-pink-50 px-3 py-2 text-xs font-semibold text-pink-600">
              {statusMessage}
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-pink-100 bg-white p-6 shadow-xs md:p-8">
          <h2 className="text-lg font-black text-gray-800">Collection Summary</h2>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-pink-100 bg-pink-50 p-4 text-center">
              <span className="block text-3xl font-black text-pink-600">{totalOwned}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400">
                Total owned
              </span>
            </div>
            <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4 text-center">
              <span className="block text-3xl font-black text-purple-600">
                {seasonOnePercent}%
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                Season 1 complete
              </span>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-pink-100">
            <div
              className="h-full rounded-full bg-linear-to-r from-pink-400 to-purple-400 transition-all"
              style={{ width: `${seasonOnePercent}%` }}
            />
          </div>
          <p className="mt-2 text-center text-xs text-gray-400">
            {seasonOneOwned} of {seasonOneTotal} Season 1 Shopkins collected
          </p>
        </section>
      </div>

      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-black text-gray-800">Owned Shopkins</h2>
            <p className="mt-1 text-xs text-gray-400">{ownedItems.length} unique figures</p>
          </div>
          <Link href="/" className="text-xs font-bold text-pink-600 hover:underline">
            Browse catalog
          </Link>
        </div>

        {ownedItems.length === 0 ? (
          <div className="rounded-3xl border border-pink-100 bg-white py-16 text-center">
            <p className="text-sm font-semibold text-gray-400">
              You have not marked any Shopkins as owned yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {ownedItems.map(({ id, quantity, item }) => (
              <div
                key={id}
                className="relative flex flex-col items-center rounded-2xl border border-pink-100 bg-white p-4 text-center shadow-xs transition hover:-translate-y-1 hover:shadow-md"
              >
                {quantity > 1 && (
                  <span className="absolute right-2.5 top-2.5 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                    ×{quantity}
                  </span>
                )}
                {item.cover_image_url?.trim() ? (
                  <img
                    src={item.cover_image_url}
                    alt={item.characters?.name || item.variant_name}
                    className="mb-3 h-28 w-28 rounded-lg bg-pink-50/40 object-contain"
                  />
                ) : (
                  <div className="mb-3 flex h-28 w-28 items-center justify-center rounded-lg bg-pink-50 text-2xl font-black text-pink-400">
                    {item.characters?.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
                <h3 className="text-sm font-bold leading-tight text-gray-800">
                  {item.characters?.name}
                </h3>
                <span className="mt-0.5 text-xs font-medium text-pink-500">
                  {item.variant_name}
                </span>
                <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
                  {item.season && (
                    <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-bold text-pink-600">
                      S{item.season}
                    </span>
                  )}
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-600">
                    {item.rarity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
