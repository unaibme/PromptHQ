import { useEffect, useState } from 'react'

function PromptModal({ isOpen, onClose, onSave, prompt, labels }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (prompt) {
      setTitle(prompt.title || '')
      setContent(prompt.content || '')
    } else {
      setTitle('')
      setContent('')
    }
  }, [prompt, isOpen])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!title.trim() || !content.trim()) {
      return
    }

    setIsSubmitting(true)

    try {
      await onSave({
        id: prompt?.id,
        title: title.trim(),
        content: content.trim(),
      })

      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{prompt ? labels.editPrompt : labels.newPrompt}</h2>
          <button className="btn btn-icon" onClick={onClose}>
            {labels.close}
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="title">{labels.titleField}</label>
              <input
                type="text"
                id="title"
                className="form-input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={labels.titlePlaceholder}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="content">{labels.contentField}</label>
              <textarea
                id="content"
                className="form-textarea"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder={labels.contentPlaceholder}
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              {labels.cancel}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || !title.trim() || !content.trim()}
            >
              {isSubmitting ? labels.saving : prompt ? labels.update : labels.create}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PromptModal
