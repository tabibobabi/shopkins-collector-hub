'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../utils/supabase'
import { rarityClass } from '../../utils/shopkins'
import { seasonTheme } from '../../utils/seasons'

interface SeasonItem {
  season: number | null
  character_id: string
  rarity: string
  team: string
  finish: string
  release_year: number | null
  cover_image_url: string | null
  characters?: { name: string } | null
}

interface SeasonSummary {
  season: number
  itemCount: number
  characterCount: number
  year: number | null
  teams: string[]
  specialFinishes: { rarity: string; finish: string }[]
  showcase: { url: string; name: string }[]
}

const DEFAULT_FINISH = 'Classic / Opaque'
const SHOWCASE_SIZE = 5
const RARITY_PRIORITY = ['Limited Edition', 'Special Edition', 'Ultra Rare', 'Rare', 'Common']

function rarityRank(rarity: string) {
  const rank = RARITY_PRIORITY.indexOf(rarity)
  return rank === -1 ? RARITY_PRIORITY.length : rank
}

function summarize(items: SeasonItem[]): SeasonSummary[] {
  const bySeason = new Map<number, SeasonItem[]>()
  for (const item of items) {
    if (item.season === null) continue
    bySeason.set(item.season, [...(bySeason.get(item.season) ?? []), item])
  }

  return [...bySeason.entries()]
    .sort(([a], [b]) => a - b)
    .map(([season, seasonItems]) => {
      const specialFinishes = new Map<string, string>()
      for (const item of seasonItems) {
        if (item.finish && item.finish !== DEFAULT_FINISH && !specialFinishes.has(item.rarity)) {
          specialFinishes.set(item.rarity, item.finish)
        }
      }

      const showcase: SeasonSummary['showcase'] = []
      const shownCharacters = new Set<string>()
      for (const item of [...seasonItems].sort((a, b) => rarityRank(a.rarity) - rarityRank(b.rarity))) {
        const url = item.cover_image_url?.trim()
        if (!url || shownCharacters.has(item.character_id)) continue
        shownCharacters.add(item.character_id)
        showcase.push({ url, name: item.characters?.name ?? 'Shopkin' })
        if (showcase.length === SHOWCASE_SIZE) break
      }

      return {
        season,
        itemCount: seasonItems.length,
        characterCount: new Set(seasonItems.map((item) => item.character_id)).size,
        year: seasonItems.find((item) => item.release_year)?.release_year ?? null,
        teams: [...new Set(seasonItems.map((item) => item.team).filter(Boolean))].sort(),
        specialFinishes: [...specialFinishes.entries()]
          .sort(([a], [b]) => rarityRank(a) - rarityRank(b))
          .map(([rarity, finish]) => ({ rarity, finish })),
        showcase,
      }
    })
}

function SeasonBanner({ summary }: { summary: SeasonSummary }) {
  const theme = seasonTheme(summary.season)

  return (
    <Link
      href={`/?season=${summary.season}`}
      aria-label={`Browse Season ${summary.season}`}
      className={`card-frame is-interactive group relative flex flex-col gap-5 overflow-hidden p-5 sm:p-6 md:flex-row md:items-center ${theme.banner}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage: 'radial-gradient(var(--surface) 1.5px, transparent 1.8px)',
          backgroundSize: '14px 14px',
        }}
        aria-hidden="true"
      />

      <div className="relative min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-2">
          <span className={`sticker -rotate-3 font-pixel text-base ${theme.badge}`}>S{summary.season}</span>
          {summary.year && (
            <span className="chip border-line-strong bg-surface font-pixel font-normal text-ink-soft">
              {summary.year}
            </span>
          )}
        </div>

        <h2 className="title-pop text-3xl sm:text-4xl">Season {summary.season}</h2>
        {theme.tagline && (
          <p className="mt-1 max-w-md text-sm font-semibold text-ink-soft">{theme.tagline}</p>
        )}

        <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs">
          {[
            ['Listings', summary.itemCount],
            ['Characters', summary.characterCount],
            ['Teams', summary.teams.length],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="font-pixel text-[11px] text-ink-faint">{label}</dt>
              <dd className="font-display text-xl font-bold text-ink">{value}</dd>
            </div>
          ))}
        </dl>

        {summary.specialFinishes.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {summary.specialFinishes.map(({ rarity, finish }) => (
              <span key={rarity} className={`chip ${rarityClass(rarity)}`} title={rarity}>
                {finish}
              </span>
            ))}
          </div>
        )}

        <span className="btn-candy btn-sm mt-5 inline-flex">
          Browse Season {summary.season}
          <span aria-hidden="true" className="transition group-hover:translate-x-0.5">→</span>
        </span>
      </div>

      {summary.showcase.length > 0 && (
        <div className="relative flex shrink-0 items-end justify-center px-3 py-2" aria-hidden="true">
          {summary.showcase.map((shopkin, index) => {
            const offset = index - (summary.showcase.length - 1) / 2
            return (
              <img
                key={shopkin.url}
                src={shopkin.url}
                alt=""
                title={shopkin.name}
                loading="lazy"
                className="-mx-2 h-20 w-20 rounded-2xl border-2 border-line bg-surface object-contain p-1 shadow-[2px_2px_0_var(--shadow-pop)] transition duration-200 group-hover:-translate-y-1 sm:h-24 sm:w-24"
                style={{
                  rotate: `${offset * 6}deg`,
                  translate: `0 ${Math.abs(offset) * 6}px`,
                  zIndex: SHOWCASE_SIZE - Math.abs(Math.round(offset)),
                }}
              />
            )
          })}
        </div>
      )}
    </Link>
  )
}

export default function SeasonsPage() {
  const [summaries, setSummaries] = useState<SeasonSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('items')
        .select('season, character_id, rarity, team, finish, release_year, cover_image_url, characters(name)')

      if (error) {
        console.error('Error fetching seasons:', error.message)
      } else if (data) {
        setSummaries(summarize(data as unknown as SeasonItem[]))
      }
      setLoading(false)
    }

    void load()
  }, [])

  return (
    <main className="px-3 py-6 sm:px-6 md:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="window pattern-gingham mb-6 px-5 py-6 text-center sm:py-8">
          <span className="sparkle absolute left-4 top-3 text-xl text-primary sm:left-8 sm:top-6 sm:text-2xl" aria-hidden="true">✦</span>
          <span className="sparkle absolute bottom-3 right-5 text-lg text-lavender-ink [animation-delay:0.8s] sm:bottom-6 sm:right-10 sm:text-2xl" aria-hidden="true">✧</span>
          <h1 className="title-pop text-3xl sm:text-5xl">Browse by Season</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm font-semibold text-ink-soft sm:text-base">
            Pick a season to jump straight to its full checklist.
          </p>
        </header>

        {loading ? (
          <div className="py-20 text-center font-pixel text-lg text-primary-ink">
            <span className="sparkle" aria-hidden="true">✦</span> Loading seasons...
          </div>
        ) : summaries.length === 0 ? (
          <div className="window mx-auto max-w-md px-6 py-12 text-center">
            <p className="font-display text-lg font-semibold text-ink">No seasons in the catalog yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {summaries.map((summary) => (
              <SeasonBanner key={summary.season} summary={summary} />
            ))}
            <Link href="/" className="btn-ghost mx-auto">
              View all seasons together
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
