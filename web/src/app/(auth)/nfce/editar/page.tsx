"use client";

import { EditarNfcePdv } from "@/components/pdv/editar-nfce-pdv";
import { CaixaPdvProvider } from "@/hooks/use-caixa-pdv";
import { PageContainer } from "../../components/page-container";

export default function NfceEditarPage() {
	return (
		<PageContainer>
			<CaixaPdvProvider>
				<EditarNfcePdv />
			</CaixaPdvProvider>
		</PageContainer>
	);
}
