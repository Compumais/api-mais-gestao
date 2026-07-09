import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Nova NFS-e | Mais Gestão",
	description: "Emitir nota fiscal de serviço manualmente no Mais Gestão.",
	openGraph: {
		title: "Nova NFS-e | Mais Gestão",
		description: "Emitir nota fiscal de serviço manualmente no Mais Gestão.",
	},
	robots: { index: false, follow: false },
};

export { default } from "./page-client";
