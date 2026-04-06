'use client'

import {
	Decoration,
	type DecorationSet,
	EditorView,
	ViewPlugin,
	type ViewUpdate,
} from '@codemirror/view'

// Regex to match {{variable_name}} patterns
const TEMPLATE_REGEX = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g

export const templateVariableTheme = EditorView.baseTheme({
	'.cm-template-variable': {
		backgroundColor: 'hsl(var(--primary) / 0.15)',
		color: 'hsl(var(--primary))',
		padding: '1px 4px',
		borderRadius: '4px',
		fontWeight: '500',
	},
})

function findTemplateVariables(text: string): Array<{ from: number; to: number; name: string }> {
	const matches: Array<{ from: number; to: number; name: string }> = []
	let match: RegExpExecArray | null

	// Reset regex lastIndex
	TEMPLATE_REGEX.lastIndex = 0

	while ((match = TEMPLATE_REGEX.exec(text)) !== null) {
		const name = match[1]
		if (name) {
			matches.push({
				from: match.index,
				to: match.index + match[0].length,
				name,
			})
		}
	}

	return matches
}

export const templateVariableHighlight = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet

		constructor(view: EditorView) {
			this.decorations = this.buildDecorations(view)
		}

		update(update: ViewUpdate) {
			if (update.docChanged || update.viewportChanged) {
				this.decorations = this.buildDecorations(update.view)
			}
		}

		buildDecorations(view: EditorView): DecorationSet {
			const text = view.state.doc.toString()
			const matches = findTemplateVariables(text)

			const decorations = matches.map(({ from, to }) =>
				Decoration.mark({
					class: 'cm-template-variable',
				}).range(from, to),
			)

			return Decoration.set(decorations)
		}
	},
	{ decorations: (v) => v.decorations },
)
