"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { completeProjectTour } from "@/app/(dashboard)/spotlight-tour/actions";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";
import {
  PROJECT_TOUR_STEPS,
  SPOTLIGHT_STEP_TRANSITION_MS,
} from "@/lib/spotlight-tour/project-tour-steps";

type SpotlightTourContextValue = {
  isActive: boolean;
  showCelebration: boolean;
  stepIndex: number;
  step: (typeof PROJECT_TOUR_STEPS)[number] | null;
  stepCount: number;
  isTransitioning: boolean;
  canStartTour: boolean;
  requestProjectTourStart: () => void;
  consumePendingStart: () => void;
  preventProjectTour: () => Promise<void>;
  nextStep: () => void;
  skipTour: () => Promise<void>;
  handleStepAction: () => void;
  handleProjectCreated: () => void;
  dismissCelebration: () => Promise<void>;
};

const SpotlightTourContext = createContext<SpotlightTourContextValue | null>(
  null
);

type SpotlightTourProviderProps = {
  children: React.ReactNode;
  hasProjects: boolean;
  projectTourCompleted: boolean;
};

export function SpotlightTourProvider({
  children,
  hasProjects,
  projectTourCompleted,
}: SpotlightTourProviderProps) {
  const { projectAddOpen, setProjectAddOpen, openProjectAdd } = useQuickAdd();
  const [tourCompletedLocal, setTourCompletedLocal] = useState(
    projectTourCompleted
  );
  const [pendingStart, setPendingStart] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const canStartTour = !hasProjects && !tourCompletedLocal;

  useEffect(() => {
    if (projectTourCompleted) {
      setTourCompletedLocal(true);
    }
  }, [projectTourCompleted]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  const clearTransitionTimer = useCallback(() => {
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
  }, []);

  const advanceStep = useCallback(() => {
    setStepIndex((prev) => {
      if (prev >= PROJECT_TOUR_STEPS.length - 1) {
        return prev;
      }
      return prev + 1;
    });
  }, []);

  const goToNextStepWithPause = useCallback(() => {
    clearTransitionTimer();
    setIsTransitioning(true);
    transitionTimerRef.current = window.setTimeout(() => {
      if (!mountedRef.current) return;
      advanceStep();
      setIsTransitioning(false);
      transitionTimerRef.current = null;
    }, SPOTLIGHT_STEP_TRANSITION_MS);
  }, [advanceStep, clearTransitionTimer]);

  const startTour = useCallback(() => {
    setShowCelebration(false);
    setStepIndex(0);
    setIsTransitioning(false);
    setIsActive(true);
    setPendingStart(false);
  }, []);

  const requestProjectTourStart = useCallback(() => {
    if (!canStartTour) return;
    setPendingStart(true);
  }, [canStartTour]);

  const consumePendingStart = useCallback(() => {
    if (!pendingStart) return;
    if (!canStartTour) {
      setPendingStart(false);
      return;
    }
    startTour();
  }, [canStartTour, pendingStart, startTour]);

  const finishTourPermanently = useCallback(async () => {
    const result = await completeProjectTour();
    if (result.success) {
      setTourCompletedLocal(true);
    }
  }, []);

  const preventProjectTour = useCallback(async () => {
    if (tourCompletedLocal) return;
    await finishTourPermanently();
  }, [finishTourPermanently, tourCompletedLocal]);

  const endTour = useCallback(() => {
    clearTransitionTimer();
    setIsActive(false);
    setShowCelebration(false);
    setStepIndex(0);
    setIsTransitioning(false);
    setPendingStart(false);
  }, [clearTransitionTimer]);

  const skipTour = useCallback(async () => {
    endTour();
    setProjectAddOpen(false);
    await finishTourPermanently();
  }, [endTour, finishTourPermanently, setProjectAddOpen]);

  const dismissCelebration = useCallback(async () => {
    await finishTourPermanently();
    setProjectAddOpen(false);
    endTour();
  }, [endTour, finishTourPermanently, setProjectAddOpen]);

  const handleProjectCreated = useCallback(() => {
    setProjectAddOpen(false);
    setIsActive(false);
    setIsTransitioning(false);
    setShowCelebration(true);
  }, [setProjectAddOpen]);

  const nextStep = useCallback(() => {
    goToNextStepWithPause();
  }, [goToNextStepWithPause]);

  const handleStepAction = useCallback(() => {
    const step = PROJECT_TOUR_STEPS[stepIndex];
    if (!step) return;

    if (stepIndex === 0) {
      openProjectAdd();
      return;
    }

    if (stepIndex === PROJECT_TOUR_STEPS.length - 1) {
      // Dismiss the overlay so the dialog's own submit button handles creation.
      setIsActive(false);
      setIsTransitioning(false);
      return;
    }

    nextStep();
  }, [nextStep, openProjectAdd, stepIndex]);

  useEffect(() => {
    if (!isActive || stepIndex !== 0 || !projectAddOpen) return;

    const timer = window.setTimeout(() => {
      goToNextStepWithPause();
    }, 200);

    return () => window.clearTimeout(timer);
  }, [goToNextStepWithPause, isActive, projectAddOpen, stepIndex]);

  const step = isActive ? (PROJECT_TOUR_STEPS[stepIndex] ?? null) : null;

  const value = useMemo(
    () => ({
      isActive,
      showCelebration,
      stepIndex,
      step,
      stepCount: PROJECT_TOUR_STEPS.length,
      isTransitioning,
      canStartTour,
      requestProjectTourStart,
      consumePendingStart,
      preventProjectTour,
      nextStep,
      skipTour,
      handleStepAction,
      handleProjectCreated,
      dismissCelebration,
    }),
    [
      isActive,
      showCelebration,
      stepIndex,
      step,
      isTransitioning,
      canStartTour,
      requestProjectTourStart,
      consumePendingStart,
      preventProjectTour,
      nextStep,
      skipTour,
      handleStepAction,
      handleProjectCreated,
      dismissCelebration,
    ]
  );

  return (
    <SpotlightTourContext.Provider value={value}>
      {children}
    </SpotlightTourContext.Provider>
  );
}

export function useSpotlightTour() {
  const context = useContext(SpotlightTourContext);
  if (!context) {
    throw new Error("useSpotlightTour must be used within SpotlightTourProvider");
  }
  return context;
}

export function useSpotlightTourOptional() {
  return useContext(SpotlightTourContext);
}
