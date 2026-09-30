'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../../utils/supabase'
import Window from '../../components/ui/Window'
import { rarityClass, variantLabel } from '../../utils/shopkins'

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
      <div className="py-24 text-center font-pixel text-lg text-primary-ink">
        <span className="sparkle" aria-hidden="true">✦</span> Loading your profile...
      </div>
    )
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 sm:py-24">
        <Window title="profile.exe" bodyClassName="p-6 text-center sm:p-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-line-strong bg-primary-soft text-3xl">
            🍓
          </div>
          <h1 className="title-pop text-2xl">Sign in to view your profile</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Sign in from the navigation bar to manage your collector profile and collection.
          </p>
          <Link href="/" className="btn-candy mt-6">
            Back to catalog
          </Link>
        </Window>
      </main>
    )
  }

  const totalOwned = ownedItems.reduce((total, entry) => total + entry.quantity, 0)
  const seasonOneOwned = ownedItems.filter(({ item }) => item.season === 1).length
  const seasonOnePercent =
    seasonOneTotal > 0 ? Math.min(100, Math.round((seasonOneOwned / seasonOneTotal) * 100)) : 0
  const displayInitial = (username || user.email || '?').charAt(0).toUpperCase()

  return (
    <main className="mx-auto max-w-6xl px-3 py-6 sm:px-6 md:py-10">
      <div className="mb-8 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Window title="profile.exe" bodyClassName="p-5 md:p-8">
          <h1 className="title-pop text-2xl sm:text-3xl">Your Profile</h1>
          <p className="mt-1 text-xs text-ink-soft">Update your collector details and avatar.</p>

          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex flex-col items-center gap-2">
              {avatarUrl?.trim() ? (
                <img
                  src={avatarUrl}
                  alt={`${username || 'Collector'} avatar`}
                  className="h-24 w-24 rounded-3xl border-4 border-line-strong object-cover shadow-[3px_3px_0_var(--shadow-pop)]"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl border-4 border-line-strong bg-primary-soft font-display text-4xl font-bold text-primary-ink shadow-[3px_3px_0_var(--shadow-pop)]">
                  {displayInitial}
                </div>
              )}
              <label className="btn-ghost btn-sm cursor-pointer">
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
                <span className="field-label">Username</span>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="field"
                />
              </label>
              <label className="block">
                <span className="field-label">Email</span>
                <input
                  type="email"
                  value={user.email ?? ''}
                  readOnly
                  className="field"
                />
              </label>
              <button
                type="button"
                onClick={() => void saveProfile()}
                disabled={saving}
                className="btn-candy w-full sm:w-auto"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>

          {statusMessage && (
            <p className="mt-4 rounded-xl border-2 border-dashed border-line-strong bg-primary-soft px-3 py-2 text-xs font-bold text-primary-ink">
              {statusMessage}
            </p>
          )}
        </Window>

        <Window title="stats.exe" bodyClassName="p-5 md:p-8">
          <h2 className="font-display text-xl font-semibold text-ink">Collection Summary</h2>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="-rotate-1 rounded-2xl border-2 border-surface bg-primary-soft p-4 text-center text-primary-ink shadow-[3px_3px_0_var(--shadow-pop)]">
              <span className="block font-pixel text-3xl leading-tight">{totalOwned}</span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider">
                Total owned
              </span>
            </div>
            <div className="rotate-1 rounded-2xl border-2 border-surface bg-lavender-soft p-4 text-center text-lavender-ink shadow-[3px_3px_0_var(--shadow-pop)]">
              <span className="block font-pixel text-3xl leading-tight">
                {seasonOnePercent}%
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider">
                Season 1 complete
              </span>
            </div>
          </div>
          <div
            className="mt-5 h-4 overflow-hidden rounded-full border-2 border-line-strong bg-surface-2 p-0.5"
            role="progressbar"
            aria-valuenow={seasonOnePercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Season 1 completion"
          >
            <div
              className="h-full rounded-full bg-[repeating-linear-gradient(135deg,var(--primary)_0_6px,var(--lavender)_6px_12px)] transition-all"
              style={{ width: `${seasonOnePercent}%` }}
            />
          </div>
          <p className="mt-2 text-center text-xs text-ink-soft">
            {seasonOneOwned} of {seasonOneTotal} Season 1 Shopkins collected
          </p>
        </Window>
      </div>

      <section>
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h2 className="title-pop text-2xl">Owned Shopkins</h2>
            <p className="mt-1 font-pixel text-xs text-ink-soft">{ownedItems.length} unique figures</p>
          </div>
          <Link href="/" className="btn-ghost btn-sm">
            Browse catalog
          </Link>
        </div>

        {ownedItems.length === 0 ? (
          <div className="window px-6 py-12 text-center">
            <p className="mb-1 text-3xl" aria-hidden="true">🧺</p>
            <p className="font-display text-lg font-semibold text-ink">
              You have not marked any Shopkins as owned yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
            {ownedItems.map(({ id, quantity, item }) => (
              <div
                key={id}
                className="card-frame relative flex flex-col items-center p-3 text-center sm:p-4"
              >
                {quantity > 1 && (
                  <span className="sticker absolute -right-1.5 -top-2 z-10 rotate-6 bg-owned text-white">
                    ×{quantity}
                  </span>
                )}
                <div className="pattern-dots mb-3 aspect-square w-full max-w-28 overflow-hidden rounded-xl border-2 border-line">
                  {item.cover_image_url?.trim() ? (
                    <img
                      src={item.cover_image_url}
                      alt={item.characters?.name || item.variant_name}
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
                <span className="mt-0.5 text-xs font-bold text-primary-ink">
                  {variantLabel(item.variant_name)}
                </span>
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
      </section>
    </main>
  )
}
