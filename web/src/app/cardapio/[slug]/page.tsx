import type { Metadata } from "next";
import { CardapioPublicoClient } from "./cardapio-publico-client";

type Props = {
	params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { slug } = await params;
	const base = process.env.NEXT_PUBLIC_API_URL;
	let nome = "Cardápio";
	try {
		if (base) {
			const resposta = await fetch(`${base}/publico/cardapio/${slug}`, {
				next: { revalidate: 60 },
			});
			if (resposta.ok) {
				const json = (await resposta.json()) as { nome?: string };
				if (json.nome) nome = json.nome;
			}
		}
	} catch {
		// metadata genérica
	}
	const title = `${nome} — Cardápio delivery`;
	const description = `Peça delivery no cardápio de ${nome}.`;
	return {
		title,
		description,
		openGraph: { title, description },
		robots: { index: true, follow: true },
	};
}

export default async function CardapioPublicoPage({ params }: Props) {
	const { slug } = await params;
	return <CardapioPublicoClient slug={slug} />;
}
