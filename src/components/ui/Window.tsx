import type { ReactNode } from 'react'

export function WindowTitlebar({
  title,
  actions,
}: {
  title: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="window-titlebar">
      <span className="flex shrink-0 gap-1" aria-hidden="true">
        <span className="window-dot bg-primary" />
        <span className="window-dot bg-butter" />
        <span className="window-dot bg-mint" />
      </span>
      <span className="min-w-0 flex-1 truncate">{title}</span>
      {actions}
    </div>
  )
}

export default function Window({
  title,
  actions,
  className = '',
  bodyClassName = 'p-4 sm:p-6',
  children,
}: {
  title?: ReactNode
  actions?: ReactNode
  className?: string
  bodyClassName?: string
  children: ReactNode
}) {
  return (
    <section className={`window ${className}`}>
      {title && <WindowTitlebar title={title} actions={actions} />}
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}
