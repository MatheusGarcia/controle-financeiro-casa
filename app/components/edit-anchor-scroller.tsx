"use client";

import { useEffect } from "react";

export function EditAnchorScroller({ expenseId }: { expenseId: string }) {
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      document.getElementById("expense-form")?.scrollIntoView({ block: "start" });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [expenseId]);

  return null;
}
