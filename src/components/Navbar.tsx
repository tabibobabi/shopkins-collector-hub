'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '../utils/supabase'
import type { User } from '@supabase/supabase-js'
import ThemeToggle from './ThemeToggle'
import Modal from './ui/Modal'

function navTabClass(active: boolean) {
  return `rounded-full border-2 px-3.5 py-1.5 text-sm font-extrabold transition ${
    active
      ? 'border-line-strong bg-surface text-primary-ink shadow-[2px_2px_0_var(--shadow-pop)]'
      : 'border-transparent text-ink-soft hover:border-line hover:bg-surface/70 hover:text-primary-ink'
  }`
}

function drawerLinkClass(active: boolean) {
  return `flex min-h-11 items-center rounded-xl border-2 px-4 text-sm font-extrabold transition ${
    active
      ? 'border-line-strong bg-primary-soft text-primary-ink'
      : 'border-line bg-surface text-ink hover:bg-surface-2'
  }`
}

export default function Navbar() {
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [profileUsername, setProfileUsername] = useState('')
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  useEffect(() => {
    async function loadProfile(userId: string) {
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', userId)
        .maybeSingle()

      setProfileUsername(data?.username ?? '')
      setProfileAvatarUrl(data?.avatar_url ?? null)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) void loadProfile(currentUser.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        void loadProfile(currentUser.id)
      } else {
        setProfileUsername('')
        setProfileAvatarUrl(null)
      }
    })

    function handleProfileUpdated(event: Event) {
      const detail = (event as CustomEvent<{
        username: string
        avatarUrl: string | null
      }>).detail
      setProfileUsername(detail.username)
      setProfileAvatarUrl(detail.avatarUrl)
    }

    window.addEventListener('profile-updated', handleProfileUpdated)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('profile-updated', handleProfileUpdated)
    }
  }, [])

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        alert('Account created! You are now logged in.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
      setShowAuthModal(false)
      setEmail('')
      setPassword('')
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleSignOut() {
    setMenuOpen(false)
    await supabase.auth.signOut()
  }

  function openAuthModal() {
    setMenuOpen(false)
    setShowAuthModal(true)
  }

  const isAdmin = user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL
  const displayName = profileUsername || user?.email?.split('@')[0] || ''
  const navLinks = [
    { href: '/', label: 'Catalog', show: true },
    { href: '/my-collection', label: 'My Collection', show: Boolean(user) },
  ].filter((link) => link.show)
  const adminLinks = isAdmin
    ? [
        { href: '/admin/add-item', label: '+ Add' },
        { href: '/admin/manage', label: 'Manage' },
      ]
    : []

  const avatar = user ? (
    profileAvatarUrl?.trim() ? (
      <img
        src={profileAvatarUrl}
        alt=""
        className="h-8 w-8 rounded-full border-2 border-line-strong object-cover"
      />
    ) : (
      <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-line-strong bg-primary-soft font-display font-bold text-primary-ink">
        {(profileUsername || user.email || '?').charAt(0).toUpperCase()}
      </span>
    )
  ) : null

  return (
    <>
      <header className="sticky top-0 z-40">
        <div className="pattern-stripes border-b-2 border-line-strong bg-surface-2/95 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
            <Link href="/" className="group flex min-w-0 items-center gap-2" onClick={() => setMenuOpen(false)}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-line-strong bg-surface text-xl shadow-[2px_2px_0_var(--shadow-pop)] transition group-hover:rotate-12">
                🍓
              </span>
              <span className="flex min-w-0 flex-col leading-none">
                <span className="title-pop truncate text-xl sm:text-2xl">Shopkins Hub</span>
                <span className="font-pixel text-[10px] text-ink-soft">
                  <span className="sparkle text-primary" aria-hidden="true">✦</span> collector catalog
                </span>
              </span>
            </Link>

            <nav className="hidden items-center gap-1.5 md:flex" aria-label="Main">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={pathname === link.href ? 'page' : undefined}
                  className={navTabClass(pathname === link.href)}
                >
                  {link.label}
                </Link>
              ))}
              {adminLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={pathname === link.href ? 'page' : undefined}
                  className={`chip px-2.5 py-1 text-[11px] ${
                    pathname === link.href
                      ? 'border-line-strong bg-primary-soft text-primary-ink'
                      : 'hover:border-line-strong hover:text-primary-ink'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-2">
              <ThemeToggle />

              {user ? (
                <div className="hidden items-center gap-2 md:flex">
                  <Link
                    href="/profile"
                    aria-label="Open profile"
                    aria-current={pathname === '/profile' ? 'page' : undefined}
                    className="flex items-center gap-2 rounded-full py-0.5 pl-0.5 pr-2 text-xs font-bold text-ink-soft transition hover:bg-surface/70 hover:text-primary-ink"
                  >
                    {avatar}
                    <span className="max-w-28 truncate">{displayName}</span>
                  </Link>
                  <button onClick={handleSignOut} className="btn-ghost btn-sm">
                    Log Out
                  </button>
                </div>
              ) : (
                <button onClick={openAuthModal} className="btn-candy btn-sm hidden md:inline-flex">
                  Sign In
                </button>
              )}

              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-controls="mobile-menu"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                className="btn-ghost btn-sm h-9 w-9 px-0 md:hidden"
              >
                <svg viewBox="0 0 16 16" className="h-4 w-4" shapeRendering="crispEdges" aria-hidden="true">
                  {menuOpen ? (
                    <path d="M3 3h2v2H3zM5 5h2v2H5zM7 7h2v2H7zM9 9h2v2H9zM11 11h2v2h-2zM11 3h2v2h-2zM9 5h2v2H9zM5 9h2v2H5zM3 11h2v2H3z" fill="currentColor" />
                  ) : (
                    <path d="M2 3h12v2H2zM2 7h12v2H2zM2 11h12v2H2z" fill="currentColor" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div className="lace-edge" aria-hidden="true" />

        {menuOpen && (
          <div
            id="mobile-menu"
            className="window animate-sheet-up absolute inset-x-3 top-[4.25rem] md:hidden"
          >
            <nav className="flex flex-col gap-2 p-3" aria-label="Mobile">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={pathname === link.href ? 'page' : undefined}
                  className={drawerLinkClass(pathname === link.href)}
                >
                  {link.label}
                </Link>
              ))}

              {adminLinks.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {adminLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      aria-current={pathname === link.href ? 'page' : undefined}
                      className={`${drawerLinkClass(pathname === link.href)} justify-center border-dashed`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}

              <div className="mt-1 border-t-2 border-dashed border-line pt-3">
                {user ? (
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="flex min-w-0 items-center gap-2 text-sm font-bold text-ink"
                    >
                      {avatar}
                      <span className="truncate">{displayName}</span>
                    </Link>
                    <button onClick={handleSignOut} className="btn-ghost btn-sm">
                      Log Out
                    </button>
                  </div>
                ) : (
                  <button onClick={openAuthModal} className="btn-candy w-full">
                    Sign In
                  </button>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      {showAuthModal && (
        <Modal
          size="sm"
          title={isSignUp ? 'new_collector.exe' : 'sign_in.exe'}
          onClose={() => setShowAuthModal(false)}
        >
          <h3 className="title-pop text-center text-2xl">
            {isSignUp ? 'Join the Hub! 💕' : 'Welcome Back! ✨'}
          </h3>
          <p className="mb-5 mt-1 text-center text-xs text-ink-soft">
            {isSignUp
              ? 'Create an account to track your collection and wishlist.'
              : 'Sign in to access your collection checklist.'}
          </p>

          <form onSubmit={handleAuth} className="space-y-3">
            <label className="block">
              <span className="field-label">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="collector@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field"
              />
            </label>

            <label className="block">
              <span className="field-label">Password</span>
              <input
                type="password"
                required
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field"
              />
            </label>

            {authError && (
              <p className="rounded-xl bg-primary-soft px-3 py-2 text-xs font-bold text-danger">
                {authError}
              </p>
            )}

            <button type="submit" disabled={authLoading} className="btn-candy w-full">
              {authLoading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setAuthError('')
              }}
              className="text-xs font-bold text-primary-ink hover:underline"
            >
              {isSignUp
                ? 'Already have an account? Sign In'
                : "Don't have an account? Create one"}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
