"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { ProtectedRoute } from "@/components/protected-route";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { SearchDialog } from "@/components/search-dialog";
import { SearchShortcut } from "@/components/search-shortcut";
import { SiteHeader } from "@/components/site-header";
import { SiteHeaderTopbar } from "@/components/site-header-topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
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

	if (isLoading) {
		return <LayoutSidebar>{children}</LayoutSidebar>;
	}

	if (layoutMenu === "topbar") {
		return <LayoutTopbar>{children}</LayoutTopbar>;
	}

	return <LayoutSidebar>{children}</LayoutSidebar>;
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
