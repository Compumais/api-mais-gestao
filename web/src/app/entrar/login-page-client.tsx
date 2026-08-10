"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { LoginForm } from "@/components/login-form";
import { useAuth } from "@/hooks/use-auth";
import { useEmpresasUsuario } from "@/hooks/use-empresas-usuario";
import { resolveRedirectForUser } from "@/lib/perfis";

export function LoginPageClient() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { isAuthenticated, isLoading, user } = useAuth();
	const redirectTo = searchParams.get("redirect");
	const {
		data: empresas,
		isSuccess: empresasCarregadas,
		isLoading: empresasLoading,
	} = useEmpresasUsuario();

	useEffect(() => {
		if (isLoading || !isAuthenticated || !user) return;
		if (empresasLoading || !empresasCarregadas) return;

		const destino =
			(empresas?.length ?? 0) === 0
				? "/empresas/nova"
				: resolveRedirectForUser(user, redirectTo);
		router.push(destino);
	}, [
		isAuthenticated,
		isLoading,
		router,
		redirectTo,
		user,
		empresas,
		empresasCarregadas,
		empresasLoading,
	]);

	if (isLoading || (isAuthenticated && (empresasLoading || !empresasCarregadas))) {
		return (
			<div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
				<div className="flex flex-col items-center gap-4">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
					<p className="text-muted-foreground">Carregando...</p>
				</div>
			</div>
		);
	}

	if (isAuthenticated) {
		return null;
	}

	return (
		<div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
			<div className="w-full max-w-sm md:max-w-4xl">
				<LoginForm redirectTo={redirectTo} />
			</div>
		</div>
	);
}
