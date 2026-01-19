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

/**
 * Atom for tracking whether the user has completed the onboarding tour.
 * Persisted to localStorage.
 */
export const tourCompletedAtom = atomWithStorage('hare-tour-completed', false)
