"use client";

import { AtenaChatButton } from "@/components/atena-chat-button";
import { AtenaChatWindow } from "@/components/atena-chat-window";
import { BlocoErrorBoundary } from "@/components/bloco-error-boundary";
import { AtenaChatProvider } from "@/hooks/use-atena-chat";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<AtenaChatProvider>
			{children}
			<AtenaChatButton />
			<BlocoErrorBoundary titulo="Erro no chat Atena" variante="compacto">
				<AtenaChatWindow />
			</BlocoErrorBoundary>
		</AtenaChatProvider>
	);
}
