"use client";

import { ProtectedRoute } from "@/components/protected-route";

export default function GarcomLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<ProtectedRoute>
			<div className="flex h-svh flex-col bg-background">{children}</div>
		</ProtectedRoute>
	);
}
