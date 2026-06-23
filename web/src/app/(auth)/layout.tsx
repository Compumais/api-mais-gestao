"use client";

import { MovimentacaoForm } from "@/app/(auth)/movimentacoes/components/movimentacao-form";
import { AppSidebar } from "@/components/app-sidebar";
// import { AtenaChatButton } from "@/components/atena-chat-button";
// import { AtenaChatWindow } from "@/components/atena-chat-window";
import { ProtectedRoute } from "@/components/protected-route";
import { SearchDialog } from "@/components/search-dialog";
import { SearchShortcut } from "@/components/search-shortcut";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
// import { AtenaChatProvider } from "@/hooks/use-atena-chat";
import {
	MovimentacaoFormProvider,
	useMovimentacaoForm,
} from "@/hooks/use-movimentacao-form";
import {
	SearchDialogProvider,
	useSearchDialog,
} from "@/hooks/use-search-dialog";

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
							<MovimentacaoFormWrapper />
							{/* <AtenaChatButton /> */}
							{/* <AtenaChatWindow /> */}
						</SidebarProvider>
					{/* </AtenaChatProvider> */}
				</MovimentacaoFormProvider>
			</SearchDialogProvider>
		</ProtectedRoute>
	);
}
