"use client";

import * as React from "react";
import { useSearchDialog } from "@/hooks/use-search-dialog";

export function SearchShortcut() {
  const { setOpen } = useSearchDialog();

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K ou Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setOpen]);

  return null;
}

