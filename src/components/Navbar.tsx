'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../utils/supabase'
import type { User } from '@supabase/supabase-js'

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
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
    } catch (err: any) {
      setAuthError(err.message)
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-pink-100 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl">🍓</span>
            <span className="font-black text-xl text-pink-600 tracking-tight group-hover:text-pink-500 transition">
              Shopkins Hub
            </span>
          </Link>

          <nav className="flex items-center gap-3 sm:gap-6 text-sm font-semibold">
            <Link href="/" className="text-gray-600 hover:text-pink-600 transition">
              Catalog
            </Link>

            {user && (
              <Link href="/my-collection" className="text-gray-600 hover:text-pink-600 transition">
                My Collection
              </Link>
            )}

            {/* Admin only links */}
            {user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
              <div className="flex items-center gap-1.5">
                <Link
                  href="/admin/add-item"
                  className="text-xs bg-pink-50 text-pink-600 px-2.5 py-1.5 rounded-lg border border-pink-200 hover:bg-pink-100 transition font-bold"
                >
                  + Add
                </Link>
                <Link
                  href="/admin/manage"
                  className="text-xs bg-pink-50 text-pink-600 px-2.5 py-1.5 rounded-lg border border-pink-200 hover:bg-pink-100 transition font-bold"
                >
                  Manage
                </Link>
              </div>
            )}

            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 hidden sm:inline">
                  {user.email?.split('@')[0]}
                </span>
                <button
                  onClick={handleSignOut}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs px-3 py-1.5 rounded-full font-bold transition"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-pink-500 hover:bg-pink-600 text-white text-xs px-4 py-2 rounded-full font-bold shadow-xs hover:shadow transition"
              >
                Sign In
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 relative border border-pink-100 shadow-2xl">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-lg"
            >
              ×
            </button>

            <h3 className="text-xl font-black text-gray-800 text-center mb-1">
              {isSignUp ? 'Join the Hub! 💕' : 'Welcome Back! ✨'}
            </h3>
            <p className="text-xs text-gray-400 text-center mb-5">
              {isSignUp
                ? 'Create an account to track your collection and wishlist.'
                : 'Sign in to access your collection checklist.'}
            </p>

            <form onSubmit={handleAuth} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-600">Email</label>
                <input
                  type="email"
                  required
                  placeholder="collector@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full mt-1 p-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-pink-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full mt-1 p-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-pink-400 focus:outline-none"
                />
              </div>

              {authError && (
                <p className="text-xs text-red-500 font-medium">{authError}</p>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl text-sm transition shadow-sm disabled:bg-gray-300"
              >
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
                className="text-xs text-pink-600 font-bold hover:underline"
              >
                {isSignUp
                  ? 'Already have an account? Sign In'
                  : "Don't have an account? Create one"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
