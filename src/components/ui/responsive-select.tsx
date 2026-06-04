"use client";

import { cn } from "@/lib/utils";

export type ResponsiveSelectOption = {
  value: string;
  label: string;
};

type ResponsiveSelectProps = {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: ResponsiveSelectOption[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** Desktop custom select (hidden below md) */
  children: React.ReactNode;
};

const nativeSelectClassName =
  "flex h-11 w-full min-w-0 appearance-none rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30";

export function ResponsiveSelect({
  id,
  value,
  onValueChange,
  options,
  disabled,
  placeholder,
  className,
  children,
}: ResponsiveSelectProps) {
  return (
    <>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn(nativeSelectClassName, "md:hidden", className)}
      >
        {placeholder ? (
          <option value="" disabled hidden>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className={cn("hidden md:block", className)}>{children}</div>
    </>
  );
}
