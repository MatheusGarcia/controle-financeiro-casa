"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  pendingLabel: string;
};

export function SubmitButton({ children, disabled, pendingLabel, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button {...props} aria-busy={pending} disabled={disabled || pending} type="submit">
      {pending ? pendingLabel : children}
    </button>
  );
}
