"use client";

import { AtenaChatButton } from "@/components/atena-chat-button";
import { AtenaChatWindow } from "@/components/atena-chat-window";
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
			<AtenaChatWindow />
		</AtenaChatProvider>
	);
}
