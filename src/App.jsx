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
import { hasSupabaseConfig, supabase } from './lib/supabase'

const LOCAL_STORAGE_KEY = 'prompt-manager.prompts'
const SEARCH_OPTIONS = [
  { value: 'title', label: 'Title' },
  { value: 'name', label: 'Name' },
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
    name: prompt.name?.trim() || '',
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
  const [storageMode, setStorageMode] = useState(
    hasSupabaseConfig ? 'remote' : 'local'
  )
  const deferredSearchQuery = useDeferredValue(searchQuery)

  const fetchPrompts = async () => {
    if (!supabase) {
      setPrompts(readLocalPrompts())
      setStorageMode('local')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      setPrompts((data || []).map(normalizePrompt))
      setStorageMode('remote')
    } catch (error) {
      console.error('Error fetching prompts:', error)
      setPrompts(readLocalPrompts())
      setStorageMode('local')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPrompts()
  }, [])

  useEffect(() => {
    if (!loading && storageMode === 'local') {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(prompts))
    }
  }, [loading, prompts, storageMode])

  const searchablePrompts = useMemo(
    () =>
      prompts.map((prompt) => ({
        prompt,
        fields: {
          title: prompt.title?.toLowerCase() || '',
          name: prompt.name?.toLowerCase() || '',
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
    if (!supabase) {
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
      return
    }

    try {
      if (promptData.id) {
        const { data, error } = await supabase
          .from('prompts')
          .update({
            name: promptData.name,
            title: promptData.title,
            content: promptData.content,
            keywords: normalizeKeywords(promptData.keywords),
          })
          .eq('id', promptData.id)
          .select()

        if (error) {
          throw error
        }

        setPrompts((prev) =>
          prev.map((prompt) =>
            prompt.id === promptData.id ? normalizePrompt(data[0]) : prompt
          )
        )
      } else {
        const { data, error } = await supabase
          .from('prompts')
          .insert([
            {
              name: promptData.name,
              title: promptData.title,
              content: promptData.content,
              keywords: normalizeKeywords(promptData.keywords),
            },
          ])
          .select()

        if (error) {
          throw error
        }

        setPrompts((prev) => [...(data || []).map(normalizePrompt), ...prev])
      }
    } catch (error) {
      console.error('Error saving prompt:', error)

      if (promptData.id) {
        setPrompts((prev) =>
          prev.map((prompt) =>
            prompt.id === promptData.id
              ? mergeLocalPrompt(prompt, promptData)
              : prompt
          )
        )
      } else {
        setPrompts((prev) => [createLocalPrompt(promptData), ...prev])
      }

      setStorageMode('local')
    }
  }

  const handleDeletePrompt = async (id) => {
    if (!confirm('Are you sure you want to delete this prompt?')) {
      return
    }

    if (!supabase) {
      setPrompts((prev) => prev.filter((prompt) => prompt.id !== id))
      return
    }

    try {
      const { error } = await supabase.from('prompts').delete().eq('id', id)

      if (error) {
        throw error
      }

      setPrompts((prev) => prev.filter((prompt) => prompt.id !== id))
    } catch (error) {
      console.error('Error deleting prompt:', error)
      setPrompts((prev) => prev.filter((prompt) => prompt.id !== id))
      setStorageMode('local')
    }
  }

  const handleNewPrompt = () => {
    setEditingPrompt(null)
    setIsModalOpen(true)
  }

  const handleEditPrompt = (prompt) => {
    setEditingPrompt(prompt)
    setIsModalOpen(true)
  }

  return (
    <div className="app-container">
      <header className="header">
        <div>
          <h1>PromptHQ</h1>
          <p className="header-subtitle">
            {storageMode === 'remote'
              ? 'Synced with Supabase'
              : 'Running in local-only mode'}
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={handleNewPrompt}>
            + New Prompt
          </button>
        </div>
      </header>

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
    </div>
  )
}

export default App
