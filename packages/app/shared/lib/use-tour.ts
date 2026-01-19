'use client'

import { useCallback, useEffect } from 'react'
import { useAtom } from 'jotai'
import { tourCompletedAtom, tourActiveAtom, tourCurrentStepAtom } from './atoms'

export interface UseTourReturn {
	/** Whether the tour has been completed */
	isCompleted: boolean
	/** Whether the tour is currently active */
	isActive: boolean
	/** Current step index */
	currentStep: number
	/** Start or restart the tour from the beginning */
	startTour: () => void
	/** Complete the tour and mark as done */
	completeTour: () => void
	/** Skip the tour without marking as completed */
	skipTour: () => void
	/** Go to a specific step */
	goToStep: (step: number) => void
	/** Move to the next step */
	nextStep: () => void
	/** Move to the previous step */
	prevStep: () => void
}

export interface UseTourOptions {
	/** Number of steps in the tour */
	totalSteps: number
	/** Auto-start the tour on first visit (default: true) */
	autoStart?: boolean
}

/**
 * Hook for managing onboarding tour state.
 *
 * Provides auto-start capability for new users, replay functionality,
 * and persists current step across page navigation.
 */
export function useTour(options: UseTourOptions): UseTourReturn {
	const { totalSteps, autoStart = true } = options
	const [isCompleted, setIsCompleted] = useAtom(tourCompletedAtom)
	const [isActive, setIsActive] = useAtom(tourActiveAtom)
	const [currentStep, setCurrentStep] = useAtom(tourCurrentStepAtom)

	// Auto-start tour for new users
	useEffect(() => {
		if (autoStart && !isCompleted && !isActive) {
			// Small delay to let the UI settle
			const timer = setTimeout(() => {
				setIsActive(true)
				setCurrentStep(0)
			}, 500)
			return () => clearTimeout(timer)
		}
	}, [autoStart, isCompleted, isActive, setIsActive, setCurrentStep])

	const startTour = useCallback(() => {
		setCurrentStep(0)
		setIsActive(true)
		// Don't reset completion status - allow replaying
	}, [setCurrentStep, setIsActive])

	const completeTour = useCallback(() => {
		setIsCompleted(true)
		setIsActive(false)
		setCurrentStep(0)
	}, [setIsCompleted, setIsActive, setCurrentStep])

	const skipTour = useCallback(() => {
		setIsActive(false)
		setIsCompleted(true) // Mark as completed when skipping
		setCurrentStep(0)
	}, [setIsActive, setIsCompleted, setCurrentStep])

	const goToStep = useCallback(
		(step: number) => {
			if (step >= 0 && step < totalSteps) {
				setCurrentStep(step)
			}
		},
		[totalSteps, setCurrentStep],
	)

	const nextStep = useCallback(() => {
		if (currentStep < totalSteps - 1) {
			setCurrentStep(currentStep + 1)
		} else {
			completeTour()
		}
	}, [currentStep, totalSteps, setCurrentStep, completeTour])

	const prevStep = useCallback(() => {
		if (currentStep > 0) {
			setCurrentStep(currentStep - 1)
		}
	}, [currentStep, setCurrentStep])

	return {
		isCompleted,
		isActive,
		currentStep,
		startTour,
		completeTour,
		skipTour,
		goToStep,
		nextStep,
		prevStep,
	}
}
