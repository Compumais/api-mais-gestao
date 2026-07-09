import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Notas fiscais de serviço | Mais Gestão",
	description:
		"Listagem e gestão de NFS-e emitidas manualmente no Mais Gestão.",
	openGraph: {
		title: "Notas fiscais de serviço | Mais Gestão",
		description:
			"Listagem e gestão de NFS-e emitidas manualmente no Mais Gestão.",
	},
	robots: { index: false, follow: false },
};

export { default } from "./page-client";
