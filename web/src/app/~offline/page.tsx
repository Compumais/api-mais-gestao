import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
	return (
		<main className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
			<h1 className="text-2xl font-semibold">Sem conexão</h1>
			<p className="max-w-md text-muted-foreground">
				Não foi possível carregar esta página. Verifique sua internet e tente
				novamente.
			</p>
			<Button asChild>
				<Link href="/dashboard">Voltar ao início</Link>
			</Button>
		</main>
	);
}
