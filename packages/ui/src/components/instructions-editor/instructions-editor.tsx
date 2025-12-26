'use client'

import { useMemo, useCallback, useState, useEffect } from 'react'
import { cn } from '../../lib/utils'
import type { InstructionsEditorProps } from './types'
import { useTokenCount } from './use-token-count'
import { StatsFooter } from './stats-footer'

// Dynamic import for CodeMirror to handle SSR
let CodeMirror: any = null
let markdown: any = null
let markdownLanguage: any = null
let languages: any = null
let EditorView: any = null

export function InstructionsEditor({
  value,
  onChange,
  placeholder = 'Write your agent instructions...',
  minHeight = '200px',
  maxHeight = '500px',
  maxLength,
  showLineNumbers = true,
  disabled = false,
  className,
  onTokenCountChange,
}: InstructionsEditorProps) {
  const [isClient, setIsClient] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const stats = useTokenCount(value)

  // Handle client-side mounting
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Load CodeMirror dynamically on client
  useEffect(() => {
    if (!isClient) return

    const loadCodeMirror = async () => {
      try {
        const codemirrorModule = await import('@uiw/react-codemirror')
        const markdownModule = await import('@codemirror/lang-markdown')
        const languageDataModule = await import('@codemirror/language-data')
        const viewModule = await import('@codemirror/view')

        CodeMirror = codemirrorModule.default
        markdown = markdownModule.markdown
        markdownLanguage = markdownModule.markdownLanguage
        languages = languageDataModule.languages
        EditorView = viewModule.EditorView

        setIsLoaded(true)
      } catch (error) {
        console.error('Failed to load CodeMirror:', error)
      }
    }

    loadCodeMirror()
  }, [isClient])

  // Notify parent of token count changes
  useEffect(() => {
    if (onTokenCountChange && !stats.isLoading) {
      onTokenCountChange(stats.tokens)
    }
  }, [stats.tokens, stats.isLoading, onTokenCountChange])

  const extensions = useMemo(() => {
    if (!markdown || !markdownLanguage || !languages || !EditorView) return []

    return [
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      EditorView.lineWrapping,
      EditorView.theme({
        '&': { height: '100%' },
        '.cm-scroller': { overflow: 'auto' },
      }),
    ]
  }, [isLoaded])

  const handleChange = useCallback((val: string) => {
    if (maxLength && val.length > maxLength) {
      return // Don't allow exceeding max length
    }
    onChange(val)
  }, [onChange, maxLength])

  // Fallback to textarea if CodeMirror is not loaded or we're on server
  if (!isClient || !isLoaded || !CodeMirror) {
    return (
      <div className={cn(
        'border rounded-md overflow-hidden',
        'focus-within:ring-2 focus-within:ring-ring',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}>
        <textarea
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full p-3 font-mono text-sm bg-background resize-none focus:outline-none"
          style={{ minHeight, maxHeight }}
        />
        <StatsFooter stats={stats} maxLength={maxLength} />
      </div>
    )
  }

  return (
    <div className={cn(
      'border rounded-md overflow-hidden',
      'focus-within:ring-2 focus-within:ring-ring',
      disabled && 'opacity-50 cursor-not-allowed',
      className
    )}>
      <CodeMirror
        value={value}
        onChange={handleChange}
        extensions={extensions}
        placeholder={placeholder}
        editable={!disabled}
        basicSetup={{
          lineNumbers: showLineNumbers,
          foldGutter: true,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
        }}
        style={{ minHeight, maxHeight }}
        className="text-sm"
      />
      <StatsFooter stats={stats} maxLength={maxLength} />
    </div>
  )
}
