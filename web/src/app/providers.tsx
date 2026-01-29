"use client"

import { Toaster } from "@/components/ui/sonner"
import { ReactQueryProvider } from "@/lib/react-query"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReactQueryProvider>
      {children}
      <Toaster />
    </ReactQueryProvider>
  )
}


