"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CPlusIcon } from "@/components/icons/c-plus";
import { useAuth } from "@/hooks/use-auth";
import { useEmpresa } from "@/hooks/use-empresa";

interface ProtectedRouteProps {
	children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
	const { isAuthenticated, isLoading } = useAuth();
	const { localStorageEmpresa } = useEmpresa();
	const router = useRouter();

	useEffect(() => {
		if (!isLoading && !isAuthenticated) {
			router.push("/entrar");
		}

		if (!localStorageEmpresa) {
			router.push("/empresas/nova");
		}
	}, [isAuthenticated, isLoading, router, localStorageEmpresa]);

	if (isLoading) {
		return (
			<div className="flex min-h-svh items-center justify-center bg-background">
				<div className="flex flex-col items-center gap-6">
					<div className="relative">
						<div className="text-primary mr-3">
							<CPlusIcon size={64} />
						</div>
						<div className="absolute inset-0 flex items-center justify-center">
							<div className="h-16 w-16 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
						</div>
					</div>
					<div className="flex flex-col items-center gap-2">
						<h2 className="text-xl font-semibold">Mais Gestão</h2>
						<p className="text-sm text-muted-foreground">
							Carregando sua área de trabalho
							<span className="loading-dots">
								<span className="dot">.</span>
								<span className="dot">.</span>
								<span className="dot">.</span>
							</span>
						</p>
					</div>
				</div>
			</div>
		);
	}

	if (!isAuthenticated) {
		return null;
	}

	return <>{children}</>;
}
