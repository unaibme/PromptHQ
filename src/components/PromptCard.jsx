import { memo, useEffect, useRef, useState } from 'react'

function PromptCard({ prompt, onCopy, onEdit, onDelete }) {
  const [showActions, setShowActions] = useState(false)
  const cardRef = useRef(null)
  const pressTimerRef = useRef(null)
  const longPressTriggeredRef = useRef(false)
  const prefersHoverActionsRef = useRef(false)
  const pointerStateRef = useRef({ id: null, x: 0, y: 0, moved: false })

  const clearPressTimer = () => {
    if (pressTimerRef.current) {
      window.clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
  }

  useEffect(() => {
    prefersHoverActionsRef.current =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches
  }, [])

  const startLongPress = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return
    }

    if (event.pointerType === 'mouse' && prefersHoverActionsRef.current) {
      return
    }

    if (event.pointerType !== 'mouse' && event.cancelable) {
      event.preventDefault()
    }

    if (typeof event.currentTarget?.setPointerCapture === 'function') {
      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        // ignore capture failures (e.g. already captured)
      }
    }

    clearPressTimer()
    longPressTriggeredRef.current = false
    pointerStateRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false,
    }
    pressTimerRef.current = window.setTimeout(() => {
      if (pointerStateRef.current.moved) {
        return
      }

      longPressTriggeredRef.current = true
      setShowActions(true)
    }, 500)
  }

  const handlePressEnd = (event) => {
    clearPressTimer()

    if (longPressTriggeredRef.current) {
      return
    }

    setShowActions(false)
    onCopy(prompt)

    if (typeof event?.currentTarget?.releasePointerCapture === 'function') {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId)
      } catch {
        // ignore release failures
      }
    }
  }

  useEffect(() => () => clearPressTimer(), [])

  useEffect(() => {
    if (!showActions) {
      return undefined
    }

    const handlePointerDownOutside = (event) => {
      if (!cardRef.current?.contains(event.target)) {
        setShowActions(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDownOutside)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDownOutside)
    }
  }, [showActions])

  const handleCardKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setShowActions(false)
      onCopy(prompt)
    }
  }

  return (
    <div
      ref={cardRef}
      className={`prompt-card ${showActions ? 'is-actions-visible' : ''}`}
      onPointerDown={startLongPress}
      onPointerUp={handlePressEnd}
      onPointerMove={(event) => {
        if (pointerStateRef.current.id !== event.pointerId) {
          return
        }

        const deltaX = event.clientX - pointerStateRef.current.x
        const deltaY = event.clientY - pointerStateRef.current.y
        const distance = Math.hypot(deltaX, deltaY)
        if (distance > 10) {
          pointerStateRef.current.moved = true
          clearPressTimer()
        }
      }}
      onMouseEnter={() => {
        if (prefersHoverActionsRef.current) {
          setShowActions(true)
        }
      }}
      onMouseLeave={() => {
        if (prefersHoverActionsRef.current) {
          setShowActions(false)
        }
      }}
      onPointerLeave={() => {
        clearPressTimer()
      }}
      onPointerCancel={() => {
        pointerStateRef.current.id = null
        clearPressTimer()
      }}
      onContextMenu={(event) => {
        event.preventDefault()
      }}
      onKeyDown={handleCardKeyDown}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setShowActions(false)
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Copy prompt ${prompt.title}`}
      title="Click to copy prompt. Hold to show edit and delete."
    >
      <h3 className="prompt-card-title">{prompt.title}</h3>
      <p className="prompt-card-content">{prompt.content}</p>

      <div
        className="prompt-card-actions"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="btn btn-icon"
          onClick={() => {
            setShowActions(false)
            onEdit(prompt)
          }}
          title="Edit"
        >
          Edit
        </button>
        <button
          type="button"
          className="btn btn-icon"
          onClick={() => {
            setShowActions(false)
            onDelete(prompt.id)
          }}
          title="Delete"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

export default memo(PromptCard)
