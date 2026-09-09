import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useT } from '../i18n'

const FOCUSABLE = 'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]'

/** Callers explicitly opt into dismissal when it is safe to leave the dialog.
    Close paths (X, Escape) play the exit animation before unmounting. */
export function Modal({ title, children, onClose, closing = false }: {
  title: string
  children: ReactNode
  onClose?: () => void
  closing?: boolean
}) {
  const dialog = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  const [exiting, setExiting] = useState(false)
  const exitingRef = useRef(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const requestClose = () => {
    if (exitingRef.current || !close.current) return
    exitingRef.current = true
    setExiting(true)
    timer.current = window.setTimeout(() => close.current?.(), 180)
  }

  useLayoutEffect(() => {
    const panel = dialog.current!
    const previous = document.activeElement as HTMLElement | null
    const focusable = () => Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
      .filter((element) => !element.closest('[disabled], [hidden], [inert]'))
    const inFloatingMenu = (target: EventTarget | null) =>
      target instanceof Element && target.closest('[role="listbox"]') !== null
    if (!panel.contains(document.activeElement) && !inFloatingMenu(document.activeElement)) (focusable()[0] ?? panel).focus()
    const onFocus = (event: FocusEvent) => {
      if (panel.contains(event.target as Node) || inFloatingMenu(event.target)) return
      ;(focusable()[0] ?? panel).focus()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && close.current) {
        event.preventDefault()
        requestClose()
      }
      if (event.key !== 'Tab') return
      const items = focusable()
      const first = items[0] ?? panel
      const last = items[items.length - 1] ?? panel
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel)) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('focusin', onFocus)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('focusin', onFocus)
      document.removeEventListener('keydown', onKey)
      if (previous?.isConnected) previous.focus()
    }
  }, [])

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title}
      className={`modal-backdrop fixed inset-0 z-50 grid place-items-center bg-scrim p-4 ${closing || exiting ? 'is-closing' : ''}`}>
      <div ref={dialog} tabIndex={-1}
        className="modal-panel modal-solid max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl p-6 text-text shadow-lg">
        {children}
        {onClose ? <ModalClose onClose={requestClose} /> : null}
      </div>
    </div>,
    document.body,
  )
}

function ModalClose({ onClose }: { onClose: () => void }) {
  const t = useT()
  return (
    <button
      type="button"
      aria-label={t('modal.close')}
      onClick={onClose}
      className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-text-2 transition hover:bg-bg-deep hover:text-text"
    >
      <X size={18} />
    </button>
  )
}

export function useAnimatedClose(onClose: () => void, duration = 180) {
  const [closing, setClosing] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const close = useCallback(() => {
    if (closing) return
    setClosing(true)
    timer.current = window.setTimeout(onClose, duration)
  }, [closing, duration, onClose])
  return { closing, close }
}
