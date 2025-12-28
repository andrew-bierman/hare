/**
 * Widgets Layer
 *
 * Large self-contained UI blocks.
 * Following Feature-Sliced Design, this layer contains:
 * - sidebar: Dashboard navigation sidebar
 * - header: Dashboard header with search
 * - agent-builder: Agent configuration components
 * - memory-viewer: Agent memory management
 * - scheduled-tasks: Scheduled task management
 * - chat-interface: Chat/conversation components
 * - workspace-switcher: Workspace selection
 * - tool-picker: Tool selection for agents
 */

// Sidebar widget
export * from './sidebar'

// Header widget
export * from './header'

// Agent builder widget
export * from './agent-builder'

// Memory viewer widget
export * from './memory-viewer'

// Scheduled tasks widget
export * from './scheduled-tasks'

// Chat interface widget
export * from './chat-interface'

// Workspace switcher widget
export * from './workspace-switcher'

// Tool picker widget
export * from './tool-picker'
