"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { CaixaPdvProvider } from "@/hooks/use-caixa-pdv";
import { CaixaBloqueioOverlay } from "./gourmet/components/caixa-bloqueio-overlay";

export default function GourmetLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<ProtectedRoute>
			<CaixaPdvProvider>
				<div className="relative flex h-svh flex-col bg-background">
					{children}
					<CaixaBloqueioOverlay />
				</div>
			</CaixaPdvProvider>
		</ProtectedRoute>
	);
}
