"use client";

import * as React from "react";

interface MovimentacaoFormContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const MovimentacaoFormContext = React.createContext<MovimentacaoFormContextType | null>(
  null
);

export function MovimentacaoFormProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <MovimentacaoFormContext.Provider value={{ open, setOpen }}>
      {children}
    </MovimentacaoFormContext.Provider>
  );
}

export function useMovimentacaoForm() {
  const context = React.useContext(MovimentacaoFormContext);
  if (!context) {
    throw new Error("useMovimentacaoForm must be used within MovimentacaoFormProvider");
  }
  return context;
}

