"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CPlusIcon } from "@/components/icons/c-plus";
import { useAuth } from "@/hooks/use-auth";
import { AUTH_SESSION_COOKIE } from "@/lib/auth-session-cookie";
import { getSessionToken } from "@/lib/auth-token";
import {
	getDefaultRouteForUser,
	isRouteAllowedForSuper,
	isSuper,
} from "@/lib/perfis";

function temIndicadorSessao(): boolean {
	if (typeof window === "undefined") return false;

	const temCookie = document.cookie
		.split(";")
		.some((parte) => parte.trim().startsWith(`${AUTH_SESSION_COOKIE}=`));

	return temCookie || !!getSessionToken();
}

export function SuperProtectedRoute({
	children,
}: {
	children: React.ReactNode;
}) {
	const { isLoading, user, isError, refetchUser } = useAuth();
	const router = useRouter();
	const pathname = usePathname();
	const [isMounted, setIsMounted] = useState(false);
	const [sessionHint, setSessionHint] = useState(false);

	useEffect(() => {
		setIsMounted(true);
		setSessionHint(temIndicadorSessao());
	}, []);

	useEffect(() => {
		if (!isMounted || isLoading) return;

		if (!user && sessionHint && !isError) {
			void refetchUser();
			return;
		}

		if (!user && (!sessionHint || isError)) {
			router.push("/entrar");
			return;
		}

		if (user && !isSuper(user)) {
			router.push(getDefaultRouteForUser(user));
			return;
		}

		if (user && isSuper(user) && !isRouteAllowedForSuper(pathname)) {
			router.push(getDefaultRouteForUser(user));
		}
	}, [
		isMounted,
		isLoading,
		user,
		sessionHint,
		isError,
		refetchUser,
		router,
		pathname,
	]);

	const loadingScreen = (
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
				<p className="text-sm text-muted-foreground">Carregando admin...</p>
			</div>
		</div>
	);

	if (!isMounted || isLoading || !user || !isSuper(user)) {
		return loadingScreen;
	}

	return <>{children}</>;
}
