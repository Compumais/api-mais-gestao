import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LEGAL_CONTACT } from "@/constants/legal-contact";

interface LegalDocumentLayoutProps {
	title: string;
	lastUpdated: string;
	children: React.ReactNode;
}

export function LegalDocumentLayout({
	title,
	lastUpdated,
	children,
}: LegalDocumentLayoutProps) {
	return (
		<div className="flex min-h-screen flex-col">
			<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="container mx-auto flex h-16 items-center justify-between px-4">
					<Link href="/" className="flex items-center gap-2">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
							MG
						</div>
						<span className="text-xl font-bold">Mais Gestão</span>
					</Link>
					<nav className="flex items-center gap-2">
						<Button asChild variant="outline" size="sm">
							<Link href="/entrar">Entrar</Link>
						</Button>
						<Button asChild size="sm">
							<Link href="/registrar">Criar conta</Link>
						</Button>
					</nav>
				</div>
			</header>

			<main className="flex-1">
				<article className="container mx-auto max-w-3xl px-4 py-12 md:py-16">
					<header className="mb-10 border-b pb-8">
						<h1 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">
							{title}
						</h1>
						<p className="text-sm text-muted-foreground">
							Última atualização: {lastUpdated}
						</p>
					</header>
					<div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-foreground [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_ul]:text-muted-foreground">
						{children}
					</div>
				</article>
			</main>

			<footer className="border-t bg-muted/30">
				<div className="container mx-auto max-w-3xl px-4 py-8">
					<div className="flex flex-col gap-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
						<p>
							© {new Date().getFullYear()} Mais Gestão. Todos os direitos
							reservados.
						</p>
						<nav className="flex flex-wrap gap-4">
							<Link
								href="/termos-de-servico"
								className="transition-colors hover:text-foreground"
							>
								Termos de Serviço
							</Link>
							<Link
								href="/politica-de-privacidade"
								className="transition-colors hover:text-foreground"
							>
								Política de Privacidade
							</Link>
							<a
								href={`mailto:${LEGAL_CONTACT.email}`}
								className="transition-colors hover:text-foreground"
							>
								Contato
							</a>
						</nav>
					</div>
				</div>
			</footer>
		</div>
	);
}
