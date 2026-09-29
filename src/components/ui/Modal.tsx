'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { WindowTitlebar } from './Window'

export default function Modal({
  title,
  onClose,
  children,
  size = 'md',
  onPaste,
}: {
  title: ReactNode
  onClose: () => void
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
  onPaste?: React.ClipboardEventHandler<HTMLDivElement>
}) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCloseRef.current()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const widthClass = size === 'sm' ? 'sm:max-w-sm' : size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#2a0f22]/45 backdrop-blur-xs sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onPaste={onPaste}
        className={`window animate-sheet-up flex max-h-[92dvh] w-full flex-col rounded-b-none outline-none sm:max-h-[90vh] sm:rounded-b-[1.25rem] ${widthClass}`}
      >
        <WindowTitlebar
          title={<span id={titleId}>{title}</span>}
          actions={
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-my-1 -mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-line-strong bg-surface font-sans text-base font-black leading-none text-primary-ink transition hover:bg-primary-soft"
            >
              ×
            </button>
          }
        />
        <div className="overflow-y-auto overscroll-contain p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
