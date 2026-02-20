"use client";

import * as React from "react";

interface SearchDialogContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SearchDialogContext = React.createContext<SearchDialogContextType | null>(
  null
);

export function SearchDialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <SearchDialogContext.Provider value={{ open, setOpen }}>
      {children}
    </SearchDialogContext.Provider>
  );
}

export function useSearchDialog() {
  const context = React.useContext(SearchDialogContext);
  if (!context) {
    throw new Error("useSearchDialog must be used within SearchDialogProvider");
  }
  return context;
}

