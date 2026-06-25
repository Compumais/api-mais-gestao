"use client";

import { IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { FormImportarXmlNotaFiscalCompra } from "../components/form-importar-xml";

export default function ImportarNotaFiscalCompraPage() {
	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex items-center gap-3 px-4">
					<Button variant="ghost" size="icon" asChild>
						<Link href="/nota-fiscal-compra" aria-label="Voltar para listagem">
							<IconArrowLeft className="size-5" />
						</Link>
					</Button>
					<h1 className="text-2xl font-bold">Importar NF-e de compra</h1>
				</div>

				<div className="rounded-lg border bg-card p-4 mx-4">
					<FormImportarXmlNotaFiscalCompra />
				</div>
			</div>
		</PageContainer>
	);
}
