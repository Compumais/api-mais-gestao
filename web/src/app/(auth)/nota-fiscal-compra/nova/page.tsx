"use client";

import { IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { FormImportarChaveNotaFiscalCompra } from "../components/form-importar-chave";
import { FormImportarXmlNotaFiscalCompra } from "../components/form-importar-xml";
import { FormManualNotaFiscalCompra } from "../components/form-manual";

export default function NovaNotaFiscalCompraPage() {
	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex items-center gap-3 px-4">
					<Button variant="ghost" size="icon" asChild>
						<Link href="/nota-fiscal-compra" aria-label="Voltar para listagem">
							<IconArrowLeft className="size-5" />
						</Link>
					</Button>
					<h1 className="text-2xl font-bold">Nova nota fiscal de compra</h1>
				</div>

				<div className="rounded-lg border bg-card p-4 mx-4">
					<Tabs defaultValue="manual">
						<TabsList className="mb-6">
							<TabsTrigger value="manual">Lançamento manual</TabsTrigger>
							<TabsTrigger value="chave">Importar por chave</TabsTrigger>
							<TabsTrigger value="xml">Importar XML</TabsTrigger>
						</TabsList>
						<TabsContent value="manual">
							<FormManualNotaFiscalCompra />
						</TabsContent>
						<TabsContent value="chave">
							<p className="mb-4 text-sm text-muted-foreground">
								Informe a chave de 44 dígitos para buscar o XML na SEFAZ e criar
								um rascunho de importação.
							</p>
							<FormImportarChaveNotaFiscalCompra />
						</TabsContent>
						<TabsContent value="xml">
							<p className="mb-4 text-sm text-muted-foreground">
								A importação cria um rascunho para revisão de produtos, conversão e
								tributos antes de confirmar a NF.
							</p>
							<FormImportarXmlNotaFiscalCompra />
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</PageContainer>
	);
}
