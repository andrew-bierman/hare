/**
 * Jotai Atoms
 *
 * Global state atoms with persistence.
 */

import { atomWithStorage } from 'jotai/utils'

// =============================================================================
// Onboarding State
// =============================================================================

/**
 * Atom for tracking whether the user has dismissed the onboarding wizard.
 * Persisted to localStorage.
 */
export const onboardingDismissedAtom = atomWithStorage('hare-onboarding-dismissed', false)

// =============================================================================
// Workspace State
// =============================================================================

/**
 * Atom for tracking the active workspace ID.
 * Persisted to localStorage.
 */
export const activeWorkspaceIdAtom = atomWithStorage<string | null>('hare-active-workspace', null)
