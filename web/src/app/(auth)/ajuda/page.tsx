import { Metadata } from "next";
import { AjudaHomeContent } from "./components/ajuda-home-content";

export const metadata: Metadata = {
	title: "Central de Ajuda | Mais Gestão",
	description:
		"Encontre respostas para suas dúvidas sobre o Mais Gestão. Tutoriais, guias e suporte completo.",
};

export default function AjudaPage() {
	return (
		<div className="flex min-h-screen flex-col">
			<AjudaHomeContent />

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
