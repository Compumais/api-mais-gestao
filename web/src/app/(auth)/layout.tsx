"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { ProtectedRoute } from "@/components/protected-route";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SearchShortcut } from "@/components/search-shortcut";
import { SearchDialogProvider, useSearchDialog } from "@/hooks/use-search-dialog";
import { SearchDialog } from "@/components/search-dialog";
import { MovimentacaoFormProvider, useMovimentacaoForm } from "@/hooks/use-movimentacao-form";
import { MovimentacaoForm } from "@/app/(auth)/movimentacoes/components/movimentacao-form";

function SearchDialogWrapper() {
  const { open, setOpen } = useSearchDialog();
  return <SearchDialog open={open} onOpenChange={setOpen} />;
}

function MovimentacaoFormWrapper() {
  const { open, setOpen } = useMovimentacaoForm();
  return (
    <MovimentacaoForm
      open={open}
      onOpenChange={setOpen}
      modo="criar"
      lancamento={null}
    />
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <SearchDialogProvider>
        <MovimentacaoFormProvider>
          <SidebarProvider
            style={
              {
                "--sidebar-width": "calc(var(--spacing) * 72)",
                "--header-height": "calc(var(--spacing) * 12)",
              } as React.CSSProperties
            }
          >
            <AppSidebar variant="inset" />
            <SidebarInset>
              <SiteHeader />
              {children}
            </SidebarInset>
            <SearchShortcut />
            <SearchDialogWrapper />
            <MovimentacaoFormWrapper />
          </SidebarProvider>
        </MovimentacaoFormProvider>
      </SearchDialogProvider>
    </ProtectedRoute>
  );
}
