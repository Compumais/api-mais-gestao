"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEmpresa } from "@/hooks/use-empresa";
import { useConfiguracao } from "@/hooks/use-configuracao";
import { PageContainer } from "../components/page-container";
import { EmpresaFiscalForm } from "./components/empresa-fiscal-form";
import { ImpressaoForm } from "./components/impressao-form";
import { IntegracaoForm } from "./components/integracao-form";
import { NfeConfiguracaoForm } from "./components/nfe-configuracao-form";
import { NfceConfiguracaoForm } from "./components/nfce-configuracao-form";
import { NotificacoesForm } from "./components/notificacoes-form";
import { RelatoriosForm } from "./components/relatorios-form";

export default function ConfiguracoesPage() {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const searchParams = useSearchParams();
	const tabInicial = searchParams.get("tab") ?? "notificacoes";
	const [tabAtiva, setTabAtiva] = useState(tabInicial);

	const { data: configuracao, isLoading } = useConfiguracao(
		empresa?.id || null,
	);

	if (!empresa) {
		return (
			<PageContainer>
				<div className="flex items-center justify-center py-8 px-4">
					<p className="text-muted-foreground">
						Selecione uma empresa para visualizar as configurações
					</p>
				</div>
			</PageContainer>
		);
	}

	if (isLoading) {
		return (
			<PageContainer>
				<div className="flex items-center justify-center py-8">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
				</div>
			</PageContainer>
		);
	}

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="px-4">
					<h1 className="text-2xl font-bold">Configurações</h1>
					<p className="text-muted-foreground text-sm">
						Gerencie as configurações da empresa
					</p>
				</div>

				<div className="px-4">
					<Tabs value={tabAtiva} onValueChange={setTabAtiva}>
						<TabsList>
							<TabsTrigger value="notificacoes">Notificações</TabsTrigger>
							<TabsTrigger value="empresa-fiscal">Empresa fiscal</TabsTrigger>
							<TabsTrigger value="nfe">NF-e</TabsTrigger>
							<TabsTrigger value="nfce">NFC-e</TabsTrigger>
							<TabsTrigger value="integracao">Integrações</TabsTrigger>
							<TabsTrigger value="relatorios">Relatórios</TabsTrigger>
							<TabsTrigger value="impressao">Impressão</TabsTrigger>
						</TabsList>

						<TabsContent value="notificacoes" className="mt-4">
							<NotificacoesForm
								configuracao={configuracao}
								idempresa={empresa.id}
							/>
						</TabsContent>

						<TabsContent value="empresa-fiscal" className="mt-4">
							<EmpresaFiscalForm idempresa={empresa.id} />
						</TabsContent>

						<TabsContent value="nfe" className="mt-4">
							<NfeConfiguracaoForm idempresa={empresa.id} />
						</TabsContent>

						<TabsContent value="nfce" className="mt-4">
							<NfceConfiguracaoForm idempresa={empresa.id} />
						</TabsContent>

						<TabsContent value="integracao" className="mt-4">
							<IntegracaoForm
								configuracao={configuracao}
								idempresa={empresa.id}
							/>
						</TabsContent>

						<TabsContent value="relatorios" className="mt-4">
							<RelatoriosForm
								configuracao={configuracao}
								idempresa={empresa.id}
							/>
						</TabsContent>

						<TabsContent value="impressao" className="mt-4">
							<ImpressaoForm
								configuracao={configuracao}
								idempresa={empresa.id}
							/>
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</PageContainer>
	);
}
