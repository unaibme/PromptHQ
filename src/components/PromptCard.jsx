import { memo } from 'react'

function PromptCard({ prompt, onEdit, onDelete }) {
  const allTags = prompt.keywords || []

  return (
    <div className="prompt-card" onClick={() => onEdit(prompt)}>
      {prompt.name && <p className="prompt-card-name">{prompt.name}</p>}
      <h3 className="prompt-card-title">{prompt.title}</h3>
      <p className="prompt-card-content">{prompt.content}</p>

      {allTags.length > 0 && (
        <div className="prompt-card-tags">
          {allTags.slice(0, 4).map((tag, index) => (
            <span key={`${tag}-${index}`} className="tag">
              {tag}
            </span>
          ))}
          {allTags.length > 4 && (
            <span className="tag">+{allTags.length - 4}</span>
          )}
        </div>
      )}

      <div
        className="prompt-card-actions"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="btn btn-icon"
          onClick={() => onEdit(prompt)}
          title="Edit"
        >
          Edit
        </button>
        <button
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
