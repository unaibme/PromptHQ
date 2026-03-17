import {
  lazy,
  Suspense,
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react'
import PromptCard from './components/PromptCard'

const LOCAL_STORAGE_KEY = 'prompt-manager.prompts'
const SEARCH_OPTIONS = [
  { value: 'title', label: 'Title' },
  { value: 'keyword', label: 'Keyword' },
]
const PromptModal = lazy(() => import('./components/PromptModal'))

function sanitizeKeyword(value) {
  return value.replace(/^#+/, '').trim()
}

function normalizeKeywords(values = []) {
  return [...new Set(values.map(sanitizeKeyword).filter(Boolean))]
}

function normalizePrompt(prompt) {
  const legacyKeywords = prompt['hash' + 'tags'] || []

  return {
    ...prompt,
    keywords: normalizeKeywords([...(prompt.keywords || []), ...legacyKeywords]),
  }
}

function createLocalPrompt(promptData) {
  const timestamp = new Date().toISOString()

  return {
    ...promptData,
    keywords: normalizeKeywords(promptData.keywords),
    id: crypto.randomUUID(),
    created_at: timestamp,
    updated_at: timestamp,
  }
}

function mergeLocalPrompt(prompt, promptData) {
  return {
    ...prompt,
    ...promptData,
    keywords: normalizeKeywords(promptData.keywords ?? prompt.keywords),
    updated_at: new Date().toISOString(),
  }
}

function readLocalPrompts() {
  try {
    const rawPrompts = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!rawPrompts) {
      return []
    }

    const parsedPrompts = JSON.parse(rawPrompts)
    return Array.isArray(parsedPrompts) ? parsedPrompts.map(normalizePrompt) : []
  } catch (error) {
    console.error('Error reading local prompts:', error)
    return []
  }
}

function App() {
  const [prompts, setPrompts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMode, setSearchMode] = useState('title')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState(null)
  const [copiedPromptId, setCopiedPromptId] = useState(null)
  const deferredSearchQuery = useDeferredValue(searchQuery)

  const fetchPrompts = async () => {
    setLoading(true)
    setPrompts(readLocalPrompts())
    setLoading(false)
  }

  useEffect(() => {
    fetchPrompts()
  }, [])

  useEffect(() => {
    if (!loading) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(prompts))
    }
  }, [loading, prompts])

  const searchablePrompts = useMemo(
    () =>
      prompts.map((prompt) => ({
        prompt,
        fields: {
          title: prompt.title?.toLowerCase() || '',
          keyword: (prompt.keywords || []).join('\n').toLowerCase(),
        },
      })),
    [prompts]
  )

  const filteredPrompts = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase()
    if (!query) {
      return prompts
    }

    return searchablePrompts
      .filter(({ fields }) => fields[searchMode].includes(query))
      .map(({ prompt }) => prompt)
  }, [deferredSearchQuery, prompts, searchMode, searchablePrompts])

  const handleSavePrompt = async (promptData) => {
    setPrompts((prev) => {
      if (promptData.id) {
        return prev.map((prompt) =>
          prompt.id === promptData.id
            ? mergeLocalPrompt(prompt, promptData)
            : prompt
        )
      }

      return [createLocalPrompt(promptData), ...prev]
    })
  }

  const handleDeletePrompt = async (id) => {
    if (!confirm('Are you sure you want to delete this prompt?')) {
      return
    }

    setPrompts((prev) => prev.filter((prompt) => prompt.id !== id))
  }

  const handleNewPrompt = () => {
    setEditingPrompt(null)
    setIsModalOpen(true)
  }

  const handleEditPrompt = (prompt) => {
    setEditingPrompt(prompt)
    setIsModalOpen(true)
  }

  const handleCopyPrompt = async (prompt) => {
    try {
      await navigator.clipboard.writeText(prompt.content)
      setCopiedPromptId(prompt.id)
    } catch (error) {
      console.error('Error copying prompt:', error)
      window.alert('Copy failed. Please check clipboard permissions and try again.')
    }
  }

  useEffect(() => {
    if (!copiedPromptId) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setCopiedPromptId(null)
    }, 1800)

    return () => window.clearTimeout(timeoutId)
  }, [copiedPromptId])

  return (
    <div className="app-container">
      <div className="search-container">
        <div className="search-toolbar">
          <div
            className="search-filter-group"
            role="tablist"
            aria-label="Search mode"
          >
            {SEARCH_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`search-filter ${searchMode === option.value ? 'is-active' : ''}`}
                onClick={() => setSearchMode(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <input
            type="text"
            className="search-input"
            placeholder={`Search by ${searchMode}...`}
            value={searchQuery}
            onChange={(event) => {
              const nextValue = event.target.value
              startTransition(() => {
                setSearchQuery(nextValue)
              })
            }}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      ) : filteredPrompts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">No prompts</div>
          <h3>{searchQuery ? 'No prompts found' : 'No prompts yet'}</h3>
          <p>
            {searchQuery
              ? 'Try a different search term or create a new prompt.'
              : 'Create your first prompt to get started!'}
          </p>
          {!searchQuery && (
            <button
              className="btn btn-primary"
              onClick={handleNewPrompt}
              style={{ marginTop: '1rem' }}
            >
              + Create Prompt
            </button>
          )}
        </div>
      ) : (
        <div className="prompt-grid">
          {filteredPrompts.map((prompt) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              onCopy={handleCopyPrompt}
              onEdit={handleEditPrompt}
              onDelete={handleDeletePrompt}
            />
          ))}
        </div>
      )}

      <Suspense fallback={null}>
        <PromptModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setEditingPrompt(null)
          }}
          onSave={handleSavePrompt}
          prompt={editingPrompt}
        />
      </Suspense>

      <button
        className="floating-create-btn"
        type="button"
        onClick={handleNewPrompt}
        aria-label="Create new prompt"
        title="Create new prompt"
      >
        <span className="floating-create-btn__icon" aria-hidden="true">
          <span></span>
          <span></span>
        </span>
      </button>
    </div>
  )
}

export default App
