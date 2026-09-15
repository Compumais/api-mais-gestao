"use client";

import { CaixaBloqueioOverlay } from "@/components/pdv/caixa-bloqueio-overlay";
import { ProtectedRoute } from "@/components/protected-route";
import { CaixaPdvProvider } from "@/hooks/use-caixa-pdv";

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
