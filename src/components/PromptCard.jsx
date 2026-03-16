import { memo } from 'react'

function PromptCard({ prompt, onCopy, onEdit, onDelete }) {
  const handleCardKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onCopy(prompt)
    }
  }

  return (
    <div
      className="prompt-card"
      onClick={() => onCopy(prompt)}
      onKeyDown={handleCardKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Copy prompt ${prompt.title}`}
      title="Click to copy prompt"
    >
      <h3 className="prompt-card-title">{prompt.title}</h3>
      <p className="prompt-card-content">{prompt.content}</p>

      <div
        className="prompt-card-actions"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="btn btn-icon"
          onClick={() => onEdit(prompt)}
          title="Edit"
        >
          Edit
        </button>
        <button
          type="button"
          className="btn btn-icon"
          onClick={() => onDelete(prompt.id)}
          title="Delete"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

export default memo(PromptCard)
