"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { NavAbasAbertasBar } from "@/components/nav-abas-abertas-bar";
import { ProtectedRoute } from "@/components/protected-route";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { SearchDialog } from "@/components/search-dialog";
import { SearchShortcut } from "@/components/search-shortcut";
import { SiteHeader } from "@/components/site-header";
import { SiteHeaderTopbar } from "@/components/site-header-topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { NavAbasAbertasProvider } from "@/hooks/use-nav-abas-abertas";
import { useLayoutMenu } from "@/hooks/use-preferencias-ui-usuario";
import {
	SearchDialogProvider,
	useSearchDialog,
} from "@/hooks/use-search-dialog";

function SearchDialogWrapper() {
	const { open, setOpen } = useSearchDialog();
	return <SearchDialog open={open} onOpenChange={setOpen} />;
}

function LayoutComum({ children }: { children: React.ReactNode }) {
	return (
		<>
			{children}
			<SearchShortcut />
			<SearchDialogWrapper />
		</>
	);
}

function LayoutSidebar({ children }: { children: React.ReactNode }) {
	return (
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
				<PwaInstallPrompt />
				<SiteHeader />
				<NavAbasAbertasBar variante="sidebar" />
				{children}
			</SidebarInset>
			<LayoutComum>{null}</LayoutComum>
		</SidebarProvider>
	);
}

function LayoutTopbar({ children }: { children: React.ReactNode }) {
	return (
		<div
			className="flex min-h-svh flex-col"
			style={
				{
					"--header-height": "calc(var(--spacing) * 12)",
				} as React.CSSProperties
			}
		>
			<AppTopbar />
			<PwaInstallPrompt />
			<SiteHeaderTopbar />
			<main className="flex flex-1 flex-col">{children}</main>
			<LayoutComum>{null}</LayoutComum>
		</div>
	);
}

function AuthLayoutShell({ children }: { children: React.ReactNode }) {
	const { layoutMenu, isLoading } = useLayoutMenu();
	const { user } = useAuth();

	const shell = (() => {
		// Evita flash do menu lateral para quem usa topbar enquanto preferências carregam.
		if (isLoading) {
			return (
				<div className="min-h-svh bg-background" aria-busy="true" />
			);
		}
		if (layoutMenu === "topbar") {
			return <LayoutTopbar>{children}</LayoutTopbar>;
		}
		return <LayoutSidebar>{children}</LayoutSidebar>;
	})();

	return (
		<NavAbasAbertasProvider userId={user?.id}>{shell}</NavAbasAbertasProvider>
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
				<AuthLayoutShell>{children}</AuthLayoutShell>
			</SearchDialogProvider>
		</ProtectedRoute>
	);
}
