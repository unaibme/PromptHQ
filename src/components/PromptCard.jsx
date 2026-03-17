import { memo, useEffect, useRef, useState } from 'react'

function PromptCard({ prompt, onCopy, onEdit, onDelete }) {
  const [showActions, setShowActions] = useState(false)
  const cardRef = useRef(null)
  const pressTimerRef = useRef(null)
  const longPressTriggeredRef = useRef(false)

  const clearPressTimer = () => {
    if (pressTimerRef.current) {
      window.clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
  }

  const startLongPress = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return
    }

    clearPressTimer()
    longPressTriggeredRef.current = false
    pressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true
      setShowActions(true)
    }, 500)
  }

  const handlePressEnd = () => {
    clearPressTimer()

    if (longPressTriggeredRef.current) {
      return
    }

    setShowActions(false)
    onCopy(prompt)
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
      onPointerLeave={() => {
        clearPressTimer()
      }}
      onPointerCancel={() => {
        clearPressTimer()
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
