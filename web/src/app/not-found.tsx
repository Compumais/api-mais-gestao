import { IconCalculator, IconReceipt, IconSearch } from "@tabler/icons-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CPlusIcon } from "@/components/icons/c-plus";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
	title: "404 - Página não encontrada | Mais Gestão",
	description: "A página que você está procurando não foi encontrada.",
	robots: {
		index: false,
		follow: false,
	},
};

export default function NotFound() {
	return (
		<div className="flex min-h-svh flex-col items-center justify-center bg-background p-6">
			<div className="flex max-w-2xl flex-col items-center gap-8 text-center">
				{/* Logo e número 404 */}
				<div className="flex flex-col items-center gap-6">
					<div className="flex items-center justify-centers gap-4">
						<div className="text-6xl font-bold text-muted-foreground/70">
							404
						</div>
					</div>
					<div className="flex items-center gap-2 text-4xl font-bold text-primary">
						<IconCalculator className="h-10 w-10" />
						<span>Conta não encontrada</span>
					</div>
				</div>

				{/* Mensagem principal */}
				<div className="flex flex-col gap-4">
					<h1 className="text-3xl font-bold">
						Ops! Esta página está com saldo zerado
					</h1>
					<p className="text-lg text-muted-foreground">
						Parece que a página que você está procurando não existe em nosso
						extrato. Ela pode ter sido movida, removida ou nunca ter sido
						cadastrada.
					</p>
				</div>

				{/* Ícones decorativos */}
				<div className="flex items-center gap-8 text-muted-foreground/40">
					<IconReceipt className="h-16 w-16 animate-pulse" />
					<IconSearch className="h-12 w-12 animate-pulse delay-150" />
					<IconCalculator className="h-16 w-16 animate-pulse delay-300" />
				</div>

				{/* Ações */}
				<div className="flex flex-col gap-4 sm:flex-row">
					<Button asChild size="lg" className="gap-2">
						<Link href="/dashboard">
							<IconCalculator className="h-5 w-5" />
							Voltar ao Dashboard
						</Link>
					</Button>
					<Button asChild variant="outline" size="lg">
						<Link href="/">Ir para a página inicial</Link>
					</Button>
				</div>

				{/* Mensagem adicional divertida */}
				<div className="mt-4 rounded-lg border border-dashed border-muted-foreground/20 bg-muted/30 p-4">
					<p className="text-sm text-muted-foreground">
						💡 <strong>Dica:</strong> Verifique se digitou o endereço
						corretamente ou tente navegar pelo menu lateral.
					</p>
				</div>
			</div>
		</div>
	);
}
