import { Suspense } from "react";
import { LoginPageClient } from "./login-page-client";

function LoginPageFallback() {
	return (
		<div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
			<div className="flex flex-col items-center gap-4">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
				<p className="text-muted-foreground">Carregando...</p>
			</div>
		</div>
	);
}

export default function LoginPage() {
	return (
		<Suspense fallback={<LoginPageFallback />}>
			<LoginPageClient />
		</Suspense>
	);
}
