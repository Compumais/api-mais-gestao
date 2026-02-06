"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useAtualizarSecaoConfiguracao } from "@/hooks/use-configuracao";
import type { Configuracao } from "@/services/configuracao.service";

interface ImpressaoFormProps {
	configuracao: Configuracao | undefined;
	idempresa: string;
}

export function ImpressaoForm({ configuracao, idempresa }: ImpressaoFormProps) {
	const atualizarMutation = useAtualizarSecaoConfiguracao();

	const impressao = configuracao?.impressao || {
		cabecalho: {
			texto: null,
			logo: null,
		},
		rodape: {
			texto: null,
		},
		documentosFiscais: {
			incluirLogo: false,
			incluirDadosEmpresa: false,
			dadosEmpresa: {
				razaoSocial: false,
				cnpj: false,
				endereco: false,
				contato: false,
			},
		},
	};

	const handleAtualizarImpressao = (campo: string, valor: unknown) => {
		atualizarMutation.mutate({
			idempresa,
			secao: "impressao",
			dados: {
				...impressao,
				[campo]: valor,
			},
		});
	};

	return (
		<div className="space-y-6">
			{/* Cabeçalho e Rodapé */}
			<div className="rounded-lg border bg-card p-6">
				<h2 className="text-lg font-semibold mb-4">Cabeçalho e Rodapé</h2>
				<FieldGroup>
					<Field>
						<FieldLabel>Texto do Cabeçalho</FieldLabel>
						<Textarea
							value={impressao.cabecalho.texto || ""}
							onChange={(e) =>
								handleAtualizarImpressao("cabecalho", {
									...impressao.cabecalho,
									texto: e.target.value || null,
								})
							}
							placeholder="Digite o texto do cabeçalho"
							rows={3}
						/>
					</Field>
					<Field>
						<FieldLabel>Logo</FieldLabel>
						<input
							type="file"
							accept="image/*"
							onChange={(e) => {
								const file = e.target.files?.[0];
								if (file) {
									const reader = new FileReader();
									reader.onloadend = () => {
										handleAtualizarImpressao("cabecalho", {
											...impressao.cabecalho,
											logo: reader.result as string,
										});
									};
									reader.readAsDataURL(file);
								}
							}}
							className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
						/>
						{impressao.cabecalho.logo && (
							<div className="mt-2">
								<img
									src={impressao.cabecalho.logo}
									alt="Logo"
									className="max-h-20"
								/>
							</div>
						)}
					</Field>
					<Field>
						<FieldLabel>Texto do Rodapé</FieldLabel>
						<Textarea
							value={impressao.rodape.texto || ""}
							onChange={(e) =>
								handleAtualizarImpressao("rodape", {
									...impressao.rodape,
									texto: e.target.value || null,
								})
							}
							placeholder="Digite o texto do rodapé"
							rows={3}
						/>
					</Field>
				</FieldGroup>
			</div>

			{/* Documentos Fiscais */}
			<div className="rounded-lg border bg-card p-6">
				<h2 className="text-lg font-semibold mb-4">Documentos Fiscais</h2>
				<FieldGroup>
					<Field>
						<div className="flex items-center gap-3">
							<Checkbox
								id="incluir-logo"
								checked={impressao.documentosFiscais.incluirLogo}
								onCheckedChange={(checked) =>
									handleAtualizarImpressao("documentosFiscais", {
										...impressao.documentosFiscais,
										incluirLogo: checked,
									})
								}
							/>
							<FieldLabel htmlFor="incluir-logo" className="cursor-pointer">
								Incluir logo nos documentos fiscais
							</FieldLabel>
						</div>
					</Field>
					<Field>
						<div className="flex items-center gap-3">
							<Checkbox
								id="incluir-dados-empresa"
								checked={impressao.documentosFiscais.incluirDadosEmpresa}
								onCheckedChange={(checked) =>
									handleAtualizarImpressao("documentosFiscais", {
										...impressao.documentosFiscais,
										incluirDadosEmpresa: checked,
									})
								}
							/>
							<FieldLabel
								htmlFor="incluir-dados-empresa"
								className="cursor-pointer"
							>
								Incluir dados da empresa
							</FieldLabel>
						</div>
					</Field>
					{impressao.documentosFiscais.incluirDadosEmpresa && (
						<div className="ml-7 space-y-2">
							<Field>
								<div className="flex items-center gap-3">
									<Checkbox
										id="razao-social"
										checked={
											impressao.documentosFiscais.dadosEmpresa.razaoSocial
										}
										onCheckedChange={(checked) =>
											handleAtualizarImpressao("documentosFiscais", {
												...impressao.documentosFiscais,
												dadosEmpresa: {
													...impressao.documentosFiscais.dadosEmpresa,
													razaoSocial: checked,
												},
											})
										}
									/>
									<FieldLabel htmlFor="razao-social" className="cursor-pointer">
										Razão Social
									</FieldLabel>
								</div>
							</Field>
							<Field>
								<div className="flex items-center gap-3">
									<Checkbox
										id="cnpj"
										checked={impressao.documentosFiscais.dadosEmpresa.cnpj}
										onCheckedChange={(checked) =>
											handleAtualizarImpressao("documentosFiscais", {
												...impressao.documentosFiscais,
												dadosEmpresa: {
													...impressao.documentosFiscais.dadosEmpresa,
													cnpj: checked,
												},
											})
										}
									/>
									<FieldLabel htmlFor="cnpj" className="cursor-pointer">
										CNPJ
									</FieldLabel>
								</div>
							</Field>
							<Field>
								<div className="flex items-center gap-3">
									<Checkbox
										id="endereco"
										checked={impressao.documentosFiscais.dadosEmpresa.endereco}
										onCheckedChange={(checked) =>
											handleAtualizarImpressao("documentosFiscais", {
												...impressao.documentosFiscais,
												dadosEmpresa: {
													...impressao.documentosFiscais.dadosEmpresa,
													endereco: checked,
												},
											})
										}
									/>
									<FieldLabel htmlFor="endereco" className="cursor-pointer">
										Endereço
									</FieldLabel>
								</div>
							</Field>
							<Field>
								<div className="flex items-center gap-3">
									<Checkbox
										id="contato"
										checked={impressao.documentosFiscais.dadosEmpresa.contato}
										onCheckedChange={(checked) =>
											handleAtualizarImpressao("documentosFiscais", {
												...impressao.documentosFiscais,
												dadosEmpresa: {
													...impressao.documentosFiscais.dadosEmpresa,
													contato: checked,
												},
											})
										}
									/>
									<FieldLabel htmlFor="contato" className="cursor-pointer">
										Contato
									</FieldLabel>
								</div>
							</Field>
						</div>
					)}
				</FieldGroup>
			</div>
		</div>
	);
}
