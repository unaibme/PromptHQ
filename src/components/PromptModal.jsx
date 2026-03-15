import { useEffect, useState } from 'react'

function normalizeList(input, formatter = (value) => value) {
  return [
    ...new Set(
      input
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
        .map(formatter)
    ),
  ]
}

function normalizeKeyword(value) {
  return value.replace(/^#+/, '').trim()
}

function PromptModal({ isOpen, onClose, onSave, prompt }) {
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [keywordsInput, setKeywordsInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (prompt) {
      setName(prompt.name || '')
      setTitle(prompt.title || '')
      setContent(prompt.content || '')
      setKeywordsInput((prompt.keywords || []).join(', '))
    } else {
      setName('')
      setTitle('')
      setContent('')
      setKeywordsInput('')
    }
  }, [prompt, isOpen])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!title.trim() || !content.trim()) {
      return
    }

    setIsSubmitting(true)

    try {
      const keywords = normalizeList(keywordsInput, normalizeKeyword)

      await onSave({
        id: prompt?.id,
        name: name.trim(),
        title: title.trim(),
        content: content.trim(),
        keywords,
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
          <h2>{prompt ? 'Edit Prompt' : 'New Prompt'}</h2>
          <button className="btn btn-icon" onClick={onClose}>
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                className="form-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Add a prompt name..."
              />
            </div>

            <div className="form-group">
              <label htmlFor="title">Title *</label>
              <input
                type="text"
                id="title"
                className="form-input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Enter prompt title..."
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="content">Prompt Content *</label>
              <textarea
                id="content"
                className="form-textarea"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Enter your prompt here..."
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="keywords">Keywords</label>
              <input
                type="text"
                id="keywords"
                className="form-input"
                value={keywordsInput}
                onChange={(event) => setKeywordsInput(event.target.value)}
                placeholder="productivity, chatgpt, midjourney..."
              />
              <p className="form-hint">
                Separate with commas for additional search terms.
              </p>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || !title.trim() || !content.trim()}
            >
              {isSubmitting ? 'Saving...' : prompt ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PromptModal
