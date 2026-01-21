/**
 * Jotai Atoms
 *
 * Global state atoms with persistence.
 */

import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

// =============================================================================
// Onboarding State
// =============================================================================

/**
 * Atom for tracking whether the user has dismissed the onboarding wizard.
 * Persisted to localStorage.
 */
export const onboardingDismissedAtom = atomWithStorage('hare-onboarding-dismissed', false)

/**
 * Atom for tracking whether the user has completed the onboarding tour.
 * Persisted to localStorage.
 */
export const tourCompletedAtom = atomWithStorage('hare-tour-completed', false)

/**
 * Atom for tracking whether the tour is currently active.
 * Not persisted - resets on page reload.
 */
export const tourActiveAtom = atom(false)

/**
 * Atom for tracking the current tour step index.
 * Persisted to sessionStorage to maintain state across page navigation.
 */
export const tourCurrentStepAtom = atomWithStorage('hare-tour-current-step', 0, undefined, {
	getOnInit: true,
})
