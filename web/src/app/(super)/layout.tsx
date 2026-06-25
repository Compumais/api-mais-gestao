"use client";

import { SuperProtectedRoute } from "@/components/super-protected-route";
import { SuperSidebar } from "@/components/super-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function SuperLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<SuperProtectedRoute>
			<SidebarProvider
				style={
					{
						"--sidebar-width": "calc(var(--spacing) * 72)",
						"--header-height": "calc(var(--spacing) * 12)",
					} as React.CSSProperties
				}
			>
				<SuperSidebar variant="inset" />
				<SidebarInset>
					<div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
				</SidebarInset>
			</SidebarProvider>
		</SuperProtectedRoute>
	);
}
