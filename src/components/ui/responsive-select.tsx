"use client";

import {
  FORM_CONTROL_FOCUS,
  FORM_CONTROL_TEXT,
} from "@/lib/ui/form-control-styles";
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

const nativeSelectClassName = cn(
  "flex h-11 w-full min-w-0 appearance-none rounded-lg border border-input bg-transparent px-2.5 py-2 outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
  FORM_CONTROL_TEXT,
  FORM_CONTROL_FOCUS
);

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
