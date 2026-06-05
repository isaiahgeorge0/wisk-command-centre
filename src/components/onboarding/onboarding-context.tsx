"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { completeOnboarding } from "@/app/(dashboard)/onboarding/actions";

type OnboardingContextValue = {
  isOpen: boolean;
  currentSlide: number;
  direction: number;
  setSlide: (index: number) => void;
  nextSlide: () => void;
  prevSlide: () => void;
  complete: () => Promise<boolean>;
  restart: () => void;
  close: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

type OnboardingProviderProps = {
  children: React.ReactNode;
  initialOpen: boolean;
};

export function OnboardingProvider({
  children,
  initialOpen,
}: OnboardingProviderProps) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);

  const setSlide = useCallback((index: number) => {
    setCurrentSlide((prev) => {
      setDirection(index > prev ? 1 : -1);
      return index;
    });
  }, []);

  const nextSlide = useCallback(() => {
    setDirection(1);
    setCurrentSlide((prev) => prev + 1);
  }, []);

  const prevSlide = useCallback(() => {
    setDirection(-1);
    setCurrentSlide((prev) => Math.max(0, prev - 1));
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setCurrentSlide(0);
    setDirection(1);
  }, []);

  const complete = useCallback(async () => {
    const result = await completeOnboarding();
    if (result.success) {
      close();
      return true;
    }
    return false;
  }, [close]);

  const restart = useCallback(() => {
    setCurrentSlide(0);
    setDirection(1);
    setIsOpen(true);
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      currentSlide,
      direction,
      setSlide,
      nextSlide,
      prevSlide,
      complete,
      restart,
      close,
    }),
    [
      isOpen,
      currentSlide,
      direction,
      setSlide,
      nextSlide,
      prevSlide,
      complete,
      restart,
      close,
    ]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}
