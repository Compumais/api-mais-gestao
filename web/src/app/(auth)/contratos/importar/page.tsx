"use client";

import { FileSpreadsheet, FileUp } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ImportarContratosDialog } from "@/app/(auth)/contratos/components/importar-contratos-dialog";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { Button } from "@/components/ui/button";
import { type FormatoImportacaoContratos } from "@/services/contrato.service";

export default function ImportarContratosPage() {
	const [formatoImportacao, setFormatoImportacao] =
		useState<FormatoImportacaoContratos | null>(null);

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4 gap-4 flex-wrap">
				<div>
					<h1 className="text-2xl font-bold">Importar contratos</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Importe contratos via CSV ou XLSX. Grupo e tipo inexistentes são
						cadastrados automaticamente.
					</p>
				</div>
				<Button asChild variant="outline">
					<Link href="/contratos">Voltar para contratos</Link>
				</Button>
			</div>

			<div className="px-4 pb-8">
				<div className="rounded-lg border bg-card p-6 max-w-xl space-y-4">
					<p className="text-sm text-muted-foreground">
						Colunas esperadas: Código do cliente (CNPJ/CPF), Grupo contrato, Tipo
						contrato, Descrição do contrato, Valor e Vencimento.
					</p>
					<div className="flex flex-wrap gap-2">
						<Button onClick={() => setFormatoImportacao("csv")}>
							<FileUp className="mr-2 size-4" />
							Importar CSV
						</Button>
						<Button
							variant="outline"
							onClick={() => setFormatoImportacao("xlsx")}
						>
							<FileSpreadsheet className="mr-2 size-4" />
							Importar XLSX
						</Button>
					</div>
				</div>
			</div>

			<ImportarContratosDialog
				formato={formatoImportacao}
				onFechar={() => setFormatoImportacao(null)}
			/>
		</PageContainer>
	);
}
