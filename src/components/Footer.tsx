const BADGES = [
  { label: 'made with love', className: 'bg-primary-soft text-primary-ink' },
  { label: 'best viewed on any device', className: 'bg-lavender-soft text-lavender-ink' },
  { label: 'shop til you drop', className: 'bg-mint-soft text-mint-ink' },
  { label: 'collectors club', className: 'bg-butter-soft text-butter-ink' },
]

export default function Footer() {
  return (
    <footer className="mt-12">
      <div className="lace-edge" aria-hidden="true" />
      <div className="pattern-stripes border-t-2 border-line-strong px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center">
          <ul className="flex flex-wrap justify-center gap-2" aria-label="Site badges">
            {BADGES.map((badge) => (
              <li key={badge.label} className={`badge-88x31 ${badge.className}`}>
                {badge.label}
              </li>
            ))}
          </ul>
          <p className="font-pixel text-xs text-ink-soft">
            <span className="sparkle text-primary" aria-hidden="true">✦</span>{' '}
            Shopkins Collector Hub · a fan-made collector catalog{' '}
            <span className="sparkle text-primary [animation-delay:1.2s]" aria-hidden="true">✦</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
