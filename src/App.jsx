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
import { isSupabaseConfigured, supabase } from './supabase'

const LOCAL_STORAGE_KEY = 'prompt-manager.prompts'
const LANGUAGE_STORAGE_KEY = 'prompt-manager.language'
const TITLE_TRANSLATION_CACHE_KEY = 'prompt-manager.title-translations.pt-BR'
const ADMIN_MODE_STORAGE_KEY = 'prompt-manager.admin-mode'
const ADMIN_MODE_PASSWORD = 'HydraHen2.0'
const PromptModal = lazy(() => import('./components/PromptModal'))

const MESSAGES = {
  en: {
    languageLabel: 'Language',
    languageEnglish: 'English',
    languagePortugueseBrazil: 'Portuguese (Brazil)',
    adminMode: 'Admin',
    adminPasswordPrompt: 'Enter admin password',
    adminPasswordWrong: 'Incorrect password. Admin mode was not enabled.',
    adminPasswordPlaceholder: 'Password',
    searchPlaceholder: 'Search by title...',
    noPromptsChip: 'No prompts',
    noPromptsFoundTitle: 'No prompts found',
    noPromptsYetTitle: 'No prompts yet',
    noPromptsFoundHint: 'Try a different search term or create a new prompt.',
    noPromptsYetHint: 'Create your first prompt to get started!',
    createPrompt: 'Create Prompt',
    createNewPromptA11y: 'Create new prompt',
    copyToClipboard: 'Copy to Clipboard',
    edit: 'Edit',
    delete: 'Delete',
    newPrompt: 'New Prompt',
    editPrompt: 'Edit Prompt',
    close: 'Close',
    titleField: 'Title *',
    titlePlaceholder: 'Enter prompt title...',
    contentField: 'Prompt Content *',
    contentPlaceholder: 'Enter your prompt here...',
    cancel: 'Cancel',
    saving: 'Saving...',
    update: 'Update',
    create: 'Create',
    syncNotConfigured:
      'Supabase is not configured. Showing prompts saved on this device only.',
    syncedWithSupabase: 'Synced with Supabase.',
    syncFailed: 'Supabase sync failed. Showing prompts saved on this device.',
    savedLocalOnly: 'Saved locally only because Supabase is not configured.',
    savedToSupabase: 'Saved to Supabase.',
    saveFailedAlert: 'Saving to Supabase failed. Please try again.',
    confirmDeletePrompt: 'Are you sure you want to delete this prompt?',
    deletedLocalOnly: 'Deleted locally only because Supabase is not configured.',
    deletedFromSupabase: 'Deleted from Supabase.',
    deleteFailedAlert: 'Deleting from Supabase failed. Please try again.',
    copyFailedAlert: 'Copy failed. Please check clipboard permissions and try again.',
  },
  'pt-BR': {
    languageLabel: 'Idioma',
    languageEnglish: 'Ingles',
    languagePortugueseBrazil: 'Portugues (Brasil)',
    adminMode: 'Admin',
    adminPasswordPrompt: 'Digite a senha de admin',
    adminPasswordWrong: 'Senha incorreta. O modo admin nao foi ativado.',
    adminPasswordPlaceholder: 'Senha',
    searchPlaceholder: 'Buscar por titulo...',
    noPromptsChip: 'Sem prompts',
    noPromptsFoundTitle: 'Nenhum prompt encontrado',
    noPromptsYetTitle: 'Ainda sem prompts',
    noPromptsFoundHint: 'Tente outro termo de busca ou crie um novo prompt.',
    noPromptsYetHint: 'Crie seu primeiro prompt para comecar!',
    createPrompt: 'Criar prompt',
    createNewPromptA11y: 'Criar novo prompt',
    copyToClipboard: 'Copiar para a area de transferencia',
    edit: 'Editar',
    delete: 'Excluir',
    newPrompt: 'Novo prompt',
    editPrompt: 'Editar prompt',
    close: 'Fechar',
    titleField: 'Titulo *',
    titlePlaceholder: 'Digite o titulo do prompt...',
    contentField: 'Conteudo do prompt *',
    contentPlaceholder: 'Digite seu prompt aqui...',
    cancel: 'Cancelar',
    saving: 'Salvando...',
    update: 'Atualizar',
    create: 'Criar',
    syncNotConfigured:
      'Supabase nao configurado. Exibindo apenas prompts salvos neste dispositivo.',
    syncedWithSupabase: 'Sincronizado com o Supabase.',
    syncFailed: 'Falha na sincronizacao com Supabase. Exibindo prompts locais.',
    savedLocalOnly: 'Salvo localmente porque o Supabase nao esta configurado.',
    savedToSupabase: 'Salvo no Supabase.',
    saveFailedAlert: 'Falha ao salvar no Supabase. Tente novamente.',
    confirmDeletePrompt: 'Tem certeza de que deseja excluir este prompt?',
    deletedLocalOnly: 'Removido localmente porque o Supabase nao esta configurado.',
    deletedFromSupabase: 'Removido do Supabase.',
    deleteFailedAlert: 'Falha ao excluir no Supabase. Tente novamente.',
    copyFailedAlert:
      'Falha ao copiar. Verifique as permissoes da area de transferencia.',
  },
}

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

function writeLocalPrompts(prompts) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(prompts))
}

function sortPromptsByUpdatedAt(prompts) {
  return [...prompts].sort((left, right) =>
    new Date(right.updated_at || right.created_at || 0).getTime() -
    new Date(left.updated_at || left.created_at || 0).getTime()
  )
}

function mergePromptCollections(...collections) {
  const promptMap = new Map()

  collections.flat().forEach((prompt) => {
    const normalizedPrompt = normalizePrompt(prompt)
    const existingPrompt = promptMap.get(normalizedPrompt.id)

    if (!existingPrompt) {
      promptMap.set(normalizedPrompt.id, normalizedPrompt)
      return
    }

    const existingTime = new Date(
      existingPrompt.updated_at || existingPrompt.created_at || 0
    ).getTime()
    const nextTime = new Date(
      normalizedPrompt.updated_at || normalizedPrompt.created_at || 0
    ).getTime()

    promptMap.set(
      normalizedPrompt.id,
      nextTime >= existingTime ? normalizedPrompt : existingPrompt
    )
  })

  return sortPromptsByUpdatedAt([...promptMap.values()])
}

function shouldUploadLocalPrompt(localPrompt, remotePrompt) {
  if (!remotePrompt) {
    return true
  }

  const localTime = new Date(
    localPrompt.updated_at || localPrompt.created_at || 0
  ).getTime()
  const remoteTime = new Date(
    remotePrompt.updated_at || remotePrompt.created_at || 0
  ).getTime()

  return localTime > remoteTime
}

function App() {
  const [prompts, setPrompts] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncMessage, setSyncMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState(null)
  const [copiedPromptId, setCopiedPromptId] = useState(null)
  const [translatedTitles, setTranslatedTitles] = useState({})
  const [isAdminPasswordModalOpen, setIsAdminPasswordModalOpen] = useState(false)
  const [adminPasswordInput, setAdminPasswordInput] = useState('')
  const [isAdminMode, setIsAdminMode] = useState(() => {
    return localStorage.getItem(ADMIN_MODE_STORAGE_KEY) === 'true'
  })
  const [language, setLanguage] = useState(() => {
    const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    return storedLanguage === 'pt-BR' ? 'pt-BR' : 'en'
  })
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const t = MESSAGES[language]

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  }, [language])

  useEffect(() => {
    localStorage.setItem(ADMIN_MODE_STORAGE_KEY, String(isAdminMode))
  }, [isAdminMode])

  useEffect(() => {
    if (language !== 'pt-BR') {
      setTranslatedTitles({})
      return
    }

    let isCancelled = false
    const loadTranslatedTitles = async () => {
      let cache = {}

      try {
        const rawCache = localStorage.getItem(TITLE_TRANSLATION_CACHE_KEY)
        cache = rawCache ? JSON.parse(rawCache) : {}
      } catch {
        cache = {}
      }

      const nextTitles = { ...cache }
      const uniqueTitles = [...new Set(prompts.map((prompt) => (prompt.title || '').trim()))]
      const titlesToTranslate = uniqueTitles.filter(
        (title) => title && !nextTitles[title]
      )

      if (titlesToTranslate.length > 0) {
        const translations = await Promise.all(
          titlesToTranslate.map(async (title) => {
            try {
              const response = await fetch(
                `https://api.mymemory.translated.net/get?q=${encodeURIComponent(title)}&langpair=en|pt-BR`
              )
              const payload = await response.json()
              const translatedTitle = payload?.responseData?.translatedText?.trim()
              if (!translatedTitle) {
                return [title, title]
              }

              return [title, translatedTitle]
            } catch {
              return [title, title]
            }
          })
        )

        translations.forEach(([sourceTitle, translatedTitle]) => {
          nextTitles[sourceTitle] = translatedTitle
        })
      }

      if (isCancelled) {
        return
      }

      setTranslatedTitles(nextTitles)
      localStorage.setItem(TITLE_TRANSLATION_CACHE_KEY, JSON.stringify(nextTitles))
    }

    loadTranslatedTitles()

    return () => {
      isCancelled = true
    }
  }, [language, prompts])

  const fetchPrompts = async () => {
    setLoading(true)
    const localPrompts = readLocalPrompts()

    if (!isSupabaseConfigured || !supabase) {
      setPrompts(localPrompts)
      setSyncMessage(t.syncNotConfigured)
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) {
        throw error
      }

      const remotePrompts = (data || []).map(normalizePrompt)
      const remotePromptMap = new Map(
        remotePrompts.map((prompt) => [prompt.id, prompt])
      )
      const promptsToUpload = localPrompts.filter((prompt) =>
        shouldUploadLocalPrompt(prompt, remotePromptMap.get(prompt.id))
      )

      if (promptsToUpload.length > 0) {
        const { data: uploadedPrompts, error: uploadError } = await supabase
          .from('prompts')
          .upsert(promptsToUpload, { onConflict: 'id' })
          .select()

        if (uploadError) {
          throw uploadError
        }

        const mergedPrompts = mergePromptCollections(
          remotePrompts,
          uploadedPrompts || []
        )

        setPrompts(mergedPrompts)
        writeLocalPrompts(mergedPrompts)
        setSyncMessage(t.syncedWithSupabase)
      } else {
        setPrompts(remotePrompts)
        writeLocalPrompts(remotePrompts)
        setSyncMessage(t.syncedWithSupabase)
      }
    } catch (error) {
      console.error('Error fetching prompts:', error)
      setPrompts(localPrompts)
      setSyncMessage(t.syncFailed)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPrompts()
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return undefined
    }

    const channel = supabase
      .channel('prompts-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'prompts' },
        () => {
          fetchPrompts()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (!loading) {
      writeLocalPrompts(prompts)
    }
  }, [loading, prompts])

  const filteredPrompts = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase()
    if (!query) {
      return prompts
    }

    return prompts.filter((prompt) =>
      (prompt.title || '').toLowerCase().includes(query)
    )
  }, [deferredSearchQuery, prompts])

  const handleSavePrompt = async (promptData) => {
    if (!isSupabaseConfigured || !supabase) {
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

      setSyncMessage(t.savedLocalOnly)
      return
    }

    try {
      if (promptData.id) {
        const currentPrompt = prompts.find((prompt) => prompt.id === promptData.id)
        const nextPrompt = mergeLocalPrompt(currentPrompt || {}, promptData)
        const { data, error } = await supabase
          .from('prompts')
          .update({
            title: nextPrompt.title,
            content: nextPrompt.content,
            keywords: nextPrompt.keywords,
            updated_at: nextPrompt.updated_at,
          })
          .eq('id', promptData.id)
          .select()
          .single()

        if (error) {
          throw error
        }

        setPrompts((prev) =>
          sortPromptsByUpdatedAt(
            prev.map((prompt) => (prompt.id === data.id ? normalizePrompt(data) : prompt))
          )
        )
      } else {
        const nextPrompt = createLocalPrompt(promptData)
        const { data, error } = await supabase
          .from('prompts')
          .insert({
            id: nextPrompt.id,
            title: nextPrompt.title,
            content: nextPrompt.content,
            keywords: nextPrompt.keywords,
            created_at: nextPrompt.created_at,
            updated_at: nextPrompt.updated_at,
          })
          .select()
          .single()

        if (error) {
          throw error
        }

        setPrompts((prev) => [normalizePrompt(data), ...prev])
      }

      setSyncMessage(t.savedToSupabase)
    } catch (error) {
      console.error('Error saving prompt:', error)
      window.alert(t.saveFailedAlert)
    }
  }

  const handleDeletePrompt = async (id) => {
    if (!confirm(t.confirmDeletePrompt)) {
      return
    }

    if (!isSupabaseConfigured || !supabase) {
      setPrompts((prev) => prev.filter((prompt) => prompt.id !== id))
      setSyncMessage(t.deletedLocalOnly)
      return
    }

    try {
      const { error } = await supabase.from('prompts').delete().eq('id', id)

      if (error) {
        throw error
      }

      setPrompts((prev) => prev.filter((prompt) => prompt.id !== id))
      setSyncMessage(t.deletedFromSupabase)
    } catch (error) {
      console.error('Error deleting prompt:', error)
      window.alert(t.deleteFailedAlert)
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

  const handleCopyPrompt = async (prompt) => {
    try {
      await navigator.clipboard.writeText(prompt.content)
      setCopiedPromptId(prompt.id)
    } catch (error) {
      console.error('Error copying prompt:', error)
      window.alert(t.copyFailedAlert)
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

  const handleAdminModeToggle = () => {
    if (isAdminMode) {
      setIsAdminMode(false)
      return
    }

    setAdminPasswordInput('')
    setIsAdminPasswordModalOpen(true)
  }

  const handleAdminPasswordSubmit = (event) => {
    event.preventDefault()

    if (adminPasswordInput === ADMIN_MODE_PASSWORD) {
      setIsAdminMode(true)
      setIsAdminPasswordModalOpen(false)
      setAdminPasswordInput('')
      return
    }

    window.alert(t.adminPasswordWrong)
    setAdminPasswordInput('')
  }

  return (
    <div className="app-container">
      <div className="search-container">
        <div className="search-toolbar">
          {syncMessage ? <p className="sync-status">{syncMessage}</p> : null}
          <div className="search-filter-group" role="tablist" aria-label={t.languageLabel}>
            <button
              type="button"
              role="tab"
              aria-selected={language === 'en'}
              className={`search-filter ${language === 'en' ? 'is-active' : ''}`}
              onClick={() => setLanguage('en')}
            >
              ENG
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={language === 'pt-BR'}
              className={`search-filter ${language === 'pt-BR' ? 'is-active' : ''}`}
              onClick={() => setLanguage('pt-BR')}
            >
              POR
            </button>
            <button
              type="button"
              className={`search-filter ${isAdminMode ? 'is-active' : ''}`}
              onClick={handleAdminModeToggle}
            >
              {t.adminMode}
            </button>
          </div>

          <input
            type="text"
            className="search-input"
            placeholder={t.searchPlaceholder}
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
          <div className="empty-state-icon">{t.noPromptsChip}</div>
          <h3>{searchQuery ? t.noPromptsFoundTitle : t.noPromptsYetTitle}</h3>
          <p>
            {searchQuery
              ? t.noPromptsFoundHint
              : t.noPromptsYetHint}
          </p>
          {!searchQuery && isAdminMode && (
            <button
              className="btn btn-primary"
              onClick={handleNewPrompt}
              style={{ marginTop: '1rem' }}
            >
              + {t.createPrompt}
            </button>
          )}
        </div>
      ) : (
        <div className="prompt-grid">
          {filteredPrompts.map((prompt) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              displayTitle={
                language === 'pt-BR'
                  ? translatedTitles[prompt.title] || prompt.title
                  : prompt.title
              }
              onCopy={handleCopyPrompt}
              onEdit={handleEditPrompt}
              onDelete={handleDeletePrompt}
              labels={t}
              isAdminMode={isAdminMode}
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
          labels={t}
        />
      </Suspense>

      {isAdminPasswordModalOpen ? (
        <div className="modal-overlay" onClick={() => setIsAdminPasswordModalOpen(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>{t.adminPasswordPrompt}</h2>
              <button
                className="btn btn-icon"
                type="button"
                onClick={() => setIsAdminPasswordModalOpen(false)}
              >
                {t.close}
              </button>
            </div>
            <form onSubmit={handleAdminPasswordSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="admin-password">{t.adminPasswordPrompt}</label>
                  <input
                    id="admin-password"
                    type="password"
                    className="form-input"
                    value={adminPasswordInput}
                    onChange={(event) => setAdminPasswordInput(event.target.value)}
                    placeholder={t.adminPasswordPlaceholder}
                    autoFocus
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAdminPasswordModalOpen(false)}
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!adminPasswordInput}
                >
                  {t.adminMode}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isAdminMode ? (
        <button
          className="floating-create-btn"
          type="button"
          onClick={handleNewPrompt}
          aria-label={t.createNewPromptA11y}
          title={t.createNewPromptA11y}
        >
          <span className="floating-create-btn__icon" aria-hidden="true">
            <span></span>
            <span></span>
          </span>
        </button>
      ) : null}
    </div>
  )
}

export default App
