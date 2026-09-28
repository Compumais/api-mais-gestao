"use client";

import { AtenaChatButton } from "@/components/atena-chat-button";
import { AtenaChatWindow } from "@/components/atena-chat-window";
import { VisualErrorBoundary } from "@/components/error-boundary/visual-error-boundary";
import { AtenaChatProvider } from "@/hooks/use-atena-chat";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<AtenaChatProvider>
			{children}
			<VisualErrorBoundary title="Não foi possível carregar o assistente Atena">
				<AtenaChatButton />
				<AtenaChatWindow />
			</VisualErrorBoundary>
		</AtenaChatProvider>
	);
}
