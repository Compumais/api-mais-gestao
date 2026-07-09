import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Detalhe NFS-e | Mais Gestão",
	description: "Detalhes da nota fiscal de serviço emitida no Mais Gestão.",
	openGraph: {
		title: "Detalhe NFS-e | Mais Gestão",
		description: "Detalhes da nota fiscal de serviço emitida no Mais Gestão.",
	},
	robots: { index: false, follow: false },
};

export { default } from "./page-client";
