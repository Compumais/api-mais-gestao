import { Metadata } from "next";
import { HelpCategories } from "./components/help-categories";
import { HelpSearch } from "./components/help-search";
import { PopularArticles } from "./components/popular-articles";

export const metadata: Metadata = {
	title: "Central de Ajuda | Mais Gestão",
	description:
		"Encontre respostas para suas dúvidas sobre o Mais Gestão. Tutoriais, guias e suporte completo.",
};

export default function AjudaPage() {
	return (
		<div className="flex min-h-screen flex-col">
			{/* Hero Section */}
			<section className="bg-gradient-to-br from-primary/10 via-primary/5 to-background py-16">
				<div className="container mx-auto max-w-4xl px-4">
					<h1 className="mb-4 text-center text-4xl font-bold tracking-tight">
						Como podemos ajudar?
					</h1>
					<p className="mb-8 text-center text-muted-foreground">
						Pesquise artigos de ajuda ou navegue pelas categorias abaixo
					</p>
					<HelpSearch />
				</div>
			</section>

			{/* Categories Section */}
			<section className="container mx-auto max-w-7xl px-4 py-12">
				<h2 className="mb-8 text-2xl font-semibold">Navegue por categorias</h2>
				<HelpCategories />
			</section>

			{/* Popular Articles Section */}
			<section className="bg-muted/30 py-12">
				<div className="container mx-auto max-w-7xl px-4">
					<h2 className="mb-8 text-2xl font-semibold">Artigos populares</h2>
					<PopularArticles />
				</div>
			</section>

			{/* Contact Support Section */}
			<section className="container mx-auto max-w-4xl px-4 py-16 text-center">
				<h2 className="mb-4 text-2xl font-semibold">Ainda precisa de ajuda?</h2>
				<p className="mb-6 text-muted-foreground">
					Nossa equipe de suporte está pronta para ajudar você
				</p>
				<div className="flex flex-wrap justify-center gap-4">
					<a
						href="mailto:contato@compumais.com.br"
						className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
					>
						Enviar e-mail
					</a>
					<a
						href="https://wa.me/553433511861?text=Olá,%20gostaria%20de%20abrir%20um%20chamado%20sobre%20o%20Mais%20Gestão"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-2 rounded-lg border bg-background px-6 py-3 font-medium transition-colors hover:bg-accent"
					>
						Abrir chamado
					</a>
				</div>
			</section>
		</div>
	);
}
