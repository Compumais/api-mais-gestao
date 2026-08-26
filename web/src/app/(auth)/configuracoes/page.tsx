"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConfiguracao } from "@/hooks/use-configuracao";
import { useEmpresa } from "@/hooks/use-empresa";
import { PageContainer } from "../components/page-container";
import { DominioIntegracaoSection } from "./components/dominio-integracao-section";
import { EmpresaFiscalForm } from "./components/empresa-fiscal-form";
import { ImpressaoForm } from "./components/impressao-form";
import { IntegracaoForm } from "./components/integracao-form";
import { ModelosImpressaoOsLista } from "./components/modelos-impressao-os-lista";
import { ModelosImpressaoPedidoLista } from "./components/modelos-impressao-pedido-lista";
import { NfceConfiguracaoForm } from "./components/nfce-configuracao-form";
import { NfeConfiguracaoForm } from "./components/nfe-configuracao-form";
import { NfseConfiguracaoForm } from "./components/nfse-configuracao-form";
import { NotificacoesForm } from "./components/notificacoes-form";
import { OrdemServicoConfigForm } from "./components/ordem-servico-form";
import { RelatoriosForm } from "./components/relatorios-form";
import { TemaForm } from "./components/tema-form";

function AvisoEmpresaNecessaria() {
	return (
		<div className="flex items-center justify-center py-8 px-4">
			<p className="text-muted-foreground">
				Selecione uma empresa para visualizar estas configurações
			</p>
		</div>
	);
}

export default function ConfiguracoesPage() {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const searchParams = useSearchParams();
	const tabInicial = searchParams.get("tab") ?? "notificacoes";
	const [tabAtiva, setTabAtiva] = useState(tabInicial);

	const { data: configuracao, isLoading } = useConfiguracao(
		empresa?.id || null,
	);

	const conteudoEmpresa =
		!empresa || isLoading ? (
			!empresa ? (
				<AvisoEmpresaNecessaria />
			) : (
				<div className="flex items-center justify-center py-8">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
				</div>
			)
		) : null;

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="px-4">
					<h1 className="text-2xl font-bold">Configurações</h1>
					<p className="text-muted-foreground text-sm">
						Gerencie as configurações da empresa e preferências de interface
					</p>
				</div>

				<div className="px-4">
					<Tabs value={tabAtiva} onValueChange={setTabAtiva}>
						<TabsList className="h-auto flex-wrap">
							<TabsTrigger value="tema">Tema</TabsTrigger>
							<TabsTrigger value="notificacoes">Notificações</TabsTrigger>
							<TabsTrigger value="empresa-fiscal">Empresa fiscal</TabsTrigger>
							<TabsTrigger value="nfe">NF-e</TabsTrigger>
							<TabsTrigger value="nfce">NFC-e</TabsTrigger>
							<TabsTrigger value="nfse">NFS-e</TabsTrigger>
							<TabsTrigger value="ordem-servico">Ordem de serviço</TabsTrigger>
							<TabsTrigger value="modelos-impressao">
								Modelos de impressão
							</TabsTrigger>
							<TabsTrigger value="integracao">Integrações</TabsTrigger>
							<TabsTrigger value="integracoes-contabeis">
								Integrações contábeis
							</TabsTrigger>
							<TabsTrigger value="relatorios">Relatórios</TabsTrigger>
							<TabsTrigger value="impressao">Impressão</TabsTrigger>
						</TabsList>

						<TabsContent value="tema" className="mt-4">
							<TemaForm />
						</TabsContent>

						<TabsContent value="notificacoes" className="mt-4">
							{conteudoEmpresa ?? (
								<NotificacoesForm
									configuracao={configuracao}
									idempresa={empresa!.id}
								/>
							)}
						</TabsContent>

						<TabsContent value="empresa-fiscal" className="mt-4">
							{conteudoEmpresa ?? (
								<EmpresaFiscalForm idempresa={empresa!.id} />
							)}
						</TabsContent>

						<TabsContent value="nfe" className="mt-4">
							{conteudoEmpresa ?? (
								<NfeConfiguracaoForm idempresa={empresa!.id} />
							)}
						</TabsContent>

						<TabsContent value="nfce" className="mt-4">
							{conteudoEmpresa ?? (
								<NfceConfiguracaoForm idempresa={empresa!.id} />
							)}
						</TabsContent>

						<TabsContent value="nfse" className="mt-4">
							{conteudoEmpresa ?? (
								<NfseConfiguracaoForm idempresa={empresa!.id} />
							)}
						</TabsContent>

						<TabsContent value="ordem-servico" className="mt-4">
							{conteudoEmpresa ?? (
								<OrdemServicoConfigForm idempresa={empresa!.id} />
							)}
						</TabsContent>

						<TabsContent value="modelos-impressao" className="mt-4 space-y-8">
							{conteudoEmpresa ?? (
								<>
									<ModelosImpressaoOsLista idempresa={empresa!.id} />
									<ModelosImpressaoPedidoLista idempresa={empresa!.id} />
								</>
							)}
						</TabsContent>

						<TabsContent value="integracao" className="mt-4">
							{conteudoEmpresa ?? (
								<IntegracaoForm
									configuracao={configuracao}
									idempresa={empresa!.id}
								/>
							)}
						</TabsContent>

						<TabsContent value="integracoes-contabeis" className="mt-4">
							{conteudoEmpresa ?? (
								<DominioIntegracaoSection idempresa={empresa!.id} />
							)}
						</TabsContent>

						<TabsContent value="relatorios" className="mt-4">
							{conteudoEmpresa ?? (
								<RelatoriosForm
									configuracao={configuracao}
									idempresa={empresa!.id}
								/>
							)}
						</TabsContent>

						<TabsContent value="impressao" className="mt-4">
							{conteudoEmpresa ?? (
								<ImpressaoForm
									configuracao={configuracao}
									idempresa={empresa!.id}
								/>
							)}
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</PageContainer>
	);
}
