"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { ReactQueryProvider } from "@/lib/react-query";
import { EmpresaProvider } from "@/provider/empresa-provider";

export function Providers({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
			<ReactQueryProvider>
				<EmpresaProvider>
					{children}
					<Toaster />
				</EmpresaProvider>
			</ReactQueryProvider>
		</ThemeProvider>
	);
}
