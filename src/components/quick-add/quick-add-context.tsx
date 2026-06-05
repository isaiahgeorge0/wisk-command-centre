"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type QuickAddContextValue = {
  projectAddOpen: boolean;
  setProjectAddOpen: (open: boolean) => void;
  openProjectAdd: () => void;
  taskAddOpen: boolean;
  setTaskAddOpen: (open: boolean) => void;
  openTaskAdd: () => void;
  goalAddOpen: boolean;
  setGoalAddOpen: (open: boolean) => void;
  openGoalAdd: () => void;
  ideaAddOpen: boolean;
  setIdeaAddOpen: (open: boolean) => void;
  openIdeaAdd: () => void;
  leadAddOpen: boolean;
  setLeadAddOpen: (open: boolean) => void;
  openLeadAdd: () => void;
  contentAddOpen: boolean;
  setContentAddOpen: (open: boolean) => void;
  openContentAdd: () => void;
};

const QuickAddContext = createContext<QuickAddContextValue | null>(null);

export function QuickAddProvider({ children }: { children: React.ReactNode }) {
  const [projectAddOpen, setProjectAddOpen] = useState(false);
  const [taskAddOpen, setTaskAddOpen] = useState(false);
  const [goalAddOpen, setGoalAddOpen] = useState(false);
  const [ideaAddOpen, setIdeaAddOpen] = useState(false);
  const [leadAddOpen, setLeadAddOpen] = useState(false);
  const [contentAddOpen, setContentAddOpen] = useState(false);

  const openProjectAdd = useCallback(() => {
    setProjectAddOpen(true);
  }, []);

  const openTaskAdd = useCallback(() => {
    setTaskAddOpen(true);
  }, []);

  const openGoalAdd = useCallback(() => {
    setGoalAddOpen(true);
  }, []);

  const openIdeaAdd = useCallback(() => {
    setIdeaAddOpen(true);
  }, []);

  const openLeadAdd = useCallback(() => {
    setLeadAddOpen(true);
  }, []);

  const openContentAdd = useCallback(() => {
    setContentAddOpen(true);
  }, []);

  const value = useMemo(
    () => ({
      projectAddOpen,
      setProjectAddOpen,
      openProjectAdd,
      taskAddOpen,
      setTaskAddOpen,
      openTaskAdd,
      goalAddOpen,
      setGoalAddOpen,
      openGoalAdd,
      ideaAddOpen,
      setIdeaAddOpen,
      openIdeaAdd,
      leadAddOpen,
      setLeadAddOpen,
      openLeadAdd,
      contentAddOpen,
      setContentAddOpen,
      openContentAdd,
    }),
    [
      projectAddOpen,
      taskAddOpen,
      goalAddOpen,
      ideaAddOpen,
      leadAddOpen,
      contentAddOpen,
      openProjectAdd,
      openTaskAdd,
      openGoalAdd,
      openIdeaAdd,
      openLeadAdd,
      openContentAdd,
    ]
  );

  return (
    <QuickAddContext.Provider value={value}>{children}</QuickAddContext.Provider>
  );
}

export function useQuickAdd() {
  const context = useContext(QuickAddContext);
  if (!context) {
    throw new Error("useQuickAdd must be used within QuickAddProvider");
  }
  return context;
}
