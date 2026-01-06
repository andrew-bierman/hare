'use client'

import { useMemo, useCallback, useState, useEffect, useRef } from 'react'
import type ReactCodeMirror from '@uiw/react-codemirror'
import type { Extension } from '@codemirror/state'
import { cn } from '../../lib/utils'
import type { InstructionsEditorProps } from './types'
import { useTokenCount } from './use-token-count'
import { StatsFooter } from './stats-footer'
import { Toolbar, applyMarkdownFormat, type ToolbarAction } from './toolbar'

// Dynamic import for CodeMirror to handle SSR
// Types are defined but values loaded at runtime
type MarkdownFn = (config?: { base?: unknown; codeLanguages?: unknown }) => Extension
type LanguageArray = Array<{ name: string; extensions: string[] }>
type EditorViewType = typeof import('@codemirror/view').EditorView

let CodeMirror: typeof ReactCodeMirror | null = null
let markdown: MarkdownFn | null = null
let markdownLanguage: unknown = null
let languages: LanguageArray | null = null
let EditorView: EditorViewType | null = null
let templateVariableHighlight: Extension | null = null
let templateVariableTheme: Extension | null = null

export function InstructionsEditor({
	value,
	onChange,
	placeholder = 'Write your agent instructions...',
	minHeight = '200px',
	maxHeight = '500px',
	maxLength,
	showLineNumbers = true,
	showToolbar = true,
	disabled = false,
	className,
	onTokenCountChange,
}: InstructionsEditorProps) {
	const [isClient, setIsClient] = useState(false)
	const [isLoaded, setIsLoaded] = useState(false)
	const [isDarkMode, setIsDarkMode] = useState(false)
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const stats = useTokenCount(value)

	// Handle client-side mounting
	useEffect(() => {
		setIsClient(true)
		// Check for dark mode
		const checkDarkMode = () => {
			setIsDarkMode(document.documentElement.classList.contains('dark'))
		}
		checkDarkMode()

		// Watch for theme changes
		const observer = new MutationObserver(checkDarkMode)
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class'],
		})

		return () => observer.disconnect()
	}, [])

	// Load CodeMirror dynamically on client
	useEffect(() => {
		if (!isClient) return

		const loadCodeMirror = async () => {
			try {
				const [codemirrorModule, markdownModule, languageDataModule, viewModule, templateModule] =
					await Promise.all([
						import('@uiw/react-codemirror'),
						import('@codemirror/lang-markdown'),
						import('@codemirror/language-data'),
						import('@codemirror/view'),
						import('./template-variables'),
					])

				CodeMirror = codemirrorModule.default
				markdown = markdownModule.markdown
				markdownLanguage = markdownModule.markdownLanguage
				languages = languageDataModule.languages
				EditorView = viewModule.EditorView
				templateVariableHighlight = templateModule.templateVariableHighlight
				templateVariableTheme = templateModule.templateVariableTheme

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

		const exts = [
			markdown({ base: markdownLanguage, codeLanguages: languages }),
			EditorView.lineWrapping,
			EditorView.theme({
				'&': {
					height: '100%',
					fontSize: '14px',
				},
				'.cm-scroller': {
					overflow: 'auto',
					fontFamily: 'ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace',
				},
				'.cm-content': {
					padding: '12px 0',
				},
				'.cm-line': {
					padding: '0 12px',
				},
				'.cm-gutters': {
					backgroundColor: 'transparent',
					border: 'none',
				},
				'.cm-activeLineGutter': {
					backgroundColor: 'transparent',
				},
				'&.cm-focused': {
					outline: 'none',
				},
				// Placeholder styling
				'.cm-placeholder': {
					color: 'hsl(var(--muted-foreground))',
					fontStyle: 'italic',
				},
			}),
		]

		// Add template variable highlighting if loaded
		if (templateVariableHighlight && templateVariableTheme) {
			exts.push(templateVariableHighlight)
			exts.push(templateVariableTheme)
		}

		return exts
	}, [isLoaded])

	const handleChange = useCallback(
		(val: string) => {
			if (maxLength && val.length > maxLength) {
				return // Don't allow exceeding max length
			}
			onChange(val)
		},
		[onChange, maxLength]
	)

	// Handle toolbar actions for textarea fallback
	const handleToolbarAction = useCallback(
		(action: ToolbarAction) => {
			const textarea = textareaRef.current
			if (!textarea) return

			const { selectionStart, selectionEnd } = textarea
			const result = applyMarkdownFormat({
				text: value,
				selectionStart,
				selectionEnd,
				action,
			})

			onChange(result.text)

			// Restore selection after React re-render
			requestAnimationFrame(() => {
				textarea.focus()
				textarea.setSelectionRange(result.selectionStart, result.selectionEnd)
			})
		},
		[value, onChange]
	)

	// Get CodeMirror theme based on dark mode
	const getTheme = useCallback(() => {
		if (!isLoaded) return undefined

		return isDarkMode ? 'dark' : 'light'
	}, [isLoaded, isDarkMode])

	// Fallback to textarea if CodeMirror is not loaded or we're on server
	if (!isClient || !isLoaded || !CodeMirror) {
		return (
			<div
				className={cn(
					'border rounded-md overflow-hidden bg-background',
					'focus-within:ring-2 focus-within:ring-ring',
					disabled && 'opacity-50 cursor-not-allowed',
					className
				)}
			>
				{showToolbar && <Toolbar onAction={handleToolbarAction} disabled={disabled} />}
				<textarea
					ref={textareaRef}
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
		<div
			className={cn(
				'border rounded-md overflow-hidden bg-background',
				'focus-within:ring-2 focus-within:ring-ring',
				disabled && 'opacity-50 cursor-not-allowed',
				className
			)}
		>
			{showToolbar && <Toolbar onAction={handleToolbarAction} disabled={disabled} />}
			<CodeMirror
				value={value}
				onChange={handleChange}
				extensions={extensions}
				placeholder={placeholder}
				editable={!disabled}
				theme={getTheme()}
				basicSetup={{
					lineNumbers: showLineNumbers,
					foldGutter: true,
					highlightActiveLine: true,
					highlightSelectionMatches: true,
					bracketMatching: true,
					autocompletion: false,
				}}
				style={{ minHeight, maxHeight }}
				className="text-sm"
			/>
			<StatsFooter stats={stats} maxLength={maxLength} />
		</div>
	)
}
