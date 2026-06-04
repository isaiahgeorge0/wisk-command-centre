"use client";

import { motion } from "framer-motion";

import { fadeUpHidden, fadeUpVisible } from "@/lib/motion/config";

type StaggerItemProps = {
  children: React.ReactNode;
  className?: string;
  /** When false, renders a plain element (no entrance animation) */
  stagger?: boolean;
  as?: "div" | "li";
};

export function StaggerItem({
  children,
  className,
  stagger = true,
  as = "div",
}: StaggerItemProps) {
  const Component = motion[as];

  if (!stagger) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <Component
      className={className}
      variants={{
        hidden: fadeUpHidden,
        visible: fadeUpVisible,
      }}
    >
      {children}
    </Component>
  );
}
