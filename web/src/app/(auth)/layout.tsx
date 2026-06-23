"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { ProtectedRoute } from "@/components/protected-route";
import { SearchDialog } from "@/components/search-dialog";
import { SearchShortcut } from "@/components/search-shortcut";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import {
	SearchDialogProvider,
	useSearchDialog,
} from "@/hooks/use-search-dialog";

function SearchDialogWrapper() {
	const { open, setOpen } = useSearchDialog();
	return <SearchDialog open={open} onOpenChange={setOpen} />;
}

export default function AuthLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<ProtectedRoute>
			<SearchDialogProvider>
				{/* <AtenaChatProvider> */}
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
							{/* <AtenaChatButton /> */}
							{/* <AtenaChatWindow /> */}
						</SidebarProvider>
					{/* </AtenaChatProvider> */}
			</SearchDialogProvider>
		</ProtectedRoute>
	);
}
