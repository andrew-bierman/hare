/**
 * Hare Chat Widget
 * Embeddable chat widget for Hare AI agents
 *
 * Usage:
 * <script
 *   src="https://your-domain.com/widget.js"
 *   data-agent-id="your-agent-id"
 *   data-theme="light"
 *   data-position="bottom-right"
 *   data-primary-color="#6366f1"
 *   data-initial-message="Hello! How can I help you?"
 * ></script>
 */
;(function () {
	'use strict'

	// Prevent multiple initializations
	if (window.HareWidget) {
		console.warn('Hare Widget already initialized')
		return
	}

	// Configuration from script tag
	const scriptTag = document.currentScript
	const config = {
		agentId: scriptTag?.getAttribute('data-agent-id') || '',
		theme: scriptTag?.getAttribute('data-theme') || 'light',
		position: scriptTag?.getAttribute('data-position') || 'bottom-right',
		primaryColor: scriptTag?.getAttribute('data-primary-color') || '#6366f1',
		initialMessage: scriptTag?.getAttribute('data-initial-message') || '',
		bubbleSize: scriptTag?.getAttribute('data-bubble-size') || '60',
		zIndex: scriptTag?.getAttribute('data-z-index') || '9999',
	}

	// Get base URL from script src
	const scriptSrc = scriptTag?.src || ''
	const baseUrl = scriptSrc ? new URL(scriptSrc).origin : window.location.origin

	// Validate required config
	if (!config.agentId) {
		console.error('Hare Widget: data-agent-id is required')
		return
	}

	// CSS Styles
	const styles = `
		.hare-widget-container {
			position: fixed;
			z-index: ${config.zIndex};
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		}
		.hare-widget-container.bottom-right {
			bottom: 20px;
			right: 20px;
		}
		.hare-widget-container.bottom-left {
			bottom: 20px;
			left: 20px;
		}
		.hare-widget-container.top-right {
			top: 20px;
			right: 20px;
		}
		.hare-widget-container.top-left {
			top: 20px;
			left: 20px;
		}
		.hare-widget-bubble {
			width: ${config.bubbleSize}px;
			height: ${config.bubbleSize}px;
			border-radius: 50%;
			background-color: ${config.primaryColor};
			border: none;
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
			transition: transform 0.2s ease, box-shadow 0.2s ease;
		}
		.hare-widget-bubble:hover {
			transform: scale(1.05);
			box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
		}
		.hare-widget-bubble:active {
			transform: scale(0.95);
		}
		.hare-widget-bubble svg {
			width: 28px;
			height: 28px;
			fill: white;
		}
		.hare-widget-bubble.open svg.chat-icon {
			display: none;
		}
		.hare-widget-bubble.open svg.close-icon {
			display: block;
		}
		.hare-widget-bubble:not(.open) svg.chat-icon {
			display: block;
		}
		.hare-widget-bubble:not(.open) svg.close-icon {
			display: none;
		}
		.hare-widget-iframe-container {
			position: absolute;
			width: 380px;
			height: 550px;
			background: ${config.theme === 'dark' ? '#1a1a1a' : '#ffffff'};
			border-radius: 16px;
			box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
			overflow: hidden;
			opacity: 0;
			visibility: hidden;
			transform: translateY(20px) scale(0.95);
			transition: opacity 0.25s ease, transform 0.25s ease, visibility 0.25s;
		}
		.hare-widget-container.bottom-right .hare-widget-iframe-container {
			bottom: calc(${config.bubbleSize}px + 15px);
			right: 0;
		}
		.hare-widget-container.bottom-left .hare-widget-iframe-container {
			bottom: calc(${config.bubbleSize}px + 15px);
			left: 0;
		}
		.hare-widget-container.top-right .hare-widget-iframe-container {
			top: calc(${config.bubbleSize}px + 15px);
			right: 0;
		}
		.hare-widget-container.top-left .hare-widget-iframe-container {
			top: calc(${config.bubbleSize}px + 15px);
			left: 0;
		}
		.hare-widget-iframe-container.open {
			opacity: 1;
			visibility: visible;
			transform: translateY(0) scale(1);
		}
		.hare-widget-iframe {
			width: 100%;
			height: 100%;
			border: none;
		}
		@media (max-width: 480px) {
			.hare-widget-iframe-container {
				width: calc(100vw - 40px);
				height: calc(100vh - 120px);
				max-height: 600px;
			}
			.hare-widget-container.bottom-right .hare-widget-iframe-container,
			.hare-widget-container.bottom-left .hare-widget-iframe-container {
				left: 20px;
				right: 20px;
			}
		}
	`

	// Create and inject styles
	const styleSheet = document.createElement('style')
	styleSheet.textContent = styles
	document.head.appendChild(styleSheet)

	// Create widget container
	const container = document.createElement('div')
	container.className = `hare-widget-container ${config.position}`

	// Create chat bubble button
	const bubble = document.createElement('button')
	bubble.className = 'hare-widget-bubble'
	bubble.setAttribute('aria-label', 'Open chat')
	bubble.innerHTML = `
		<svg class="chat-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
			<path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
			<path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/>
		</svg>
		<svg class="close-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
			<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
		</svg>
	`

	// Create iframe container
	const iframeContainer = document.createElement('div')
	iframeContainer.className = 'hare-widget-iframe-container'

	// Build iframe URL with config
	const iframeParams = new URLSearchParams({
		theme: config.theme,
		primaryColor: config.primaryColor,
	})
	if (config.initialMessage) {
		iframeParams.set('initialMessage', config.initialMessage)
	}

	// Create iframe
	const iframe = document.createElement('iframe')
	iframe.className = 'hare-widget-iframe'
	iframe.src = `${baseUrl}/embed/${config.agentId}?${iframeParams.toString()}`
	iframe.title = 'Chat with AI Agent'
	iframe.setAttribute('loading', 'lazy')

	// Assemble widget
	iframeContainer.appendChild(iframe)
	container.appendChild(iframeContainer)
	container.appendChild(bubble)
	document.body.appendChild(container)

	// State
	let isOpen = false

	// Toggle chat
	function toggleChat() {
		isOpen = !isOpen
		bubble.classList.toggle('open', isOpen)
		iframeContainer.classList.toggle('open', isOpen)
		bubble.setAttribute('aria-label', isOpen ? 'Close chat' : 'Open chat')

		// Notify iframe of state change
		iframe.contentWindow?.postMessage(
			{
				type: 'hare:widget:toggle',
				isOpen,
			},
			baseUrl
		)
	}

	// Event listeners
	bubble.addEventListener('click', toggleChat)

	// Listen for messages from iframe
	window.addEventListener('message', function (event) {
		// Verify origin
		if (event.origin !== baseUrl) return

		const data = event.data
		if (!data || typeof data !== 'object') return

		switch (data.type) {
			case 'hare:widget:close':
				if (isOpen) toggleChat()
				break
			case 'hare:widget:ready':
				// Widget iframe is ready
				break
			case 'hare:widget:resize':
				// Handle dynamic resize if needed
				if (data.height) {
					iframeContainer.style.height = `${Math.min(data.height, 600)}px`
				}
				break
		}
	})

	// Expose public API
	window.HareWidget = {
		open: function () {
			if (!isOpen) toggleChat()
		},
		close: function () {
			if (isOpen) toggleChat()
		},
		toggle: toggleChat,
		isOpen: function () {
			return isOpen
		},
		destroy: function () {
			container.remove()
			styleSheet.remove()
			delete window.HareWidget
		},
		sendMessage: function (message) {
			iframe.contentWindow?.postMessage(
				{
					type: 'hare:widget:send',
					message,
				},
				baseUrl
			)
		},
	}

	// Dispatch ready event
	window.dispatchEvent(new CustomEvent('hare:widget:loaded', { detail: { agentId: config.agentId } }))
})()
