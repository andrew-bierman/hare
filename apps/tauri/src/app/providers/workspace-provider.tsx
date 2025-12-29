'use client'

// Re-export WorkspaceProvider from @hare/app
// This keeps the same API as web while allowing Tauri-specific overrides if needed
export { useWorkspace, WorkspaceProvider } from '@hare/app/providers'
