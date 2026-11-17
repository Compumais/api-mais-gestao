"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, FileUp, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ResolverClientesImportacao } from "@/app/(auth)/contratos/components/resolver-clientes-importacao";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type ClientePendenteImportacao,
	contratoService,
	type FormatoImportacaoContratos,
	type ImportarContratosResponse,
	type PreviewImportacaoContratosResponse,
	type VincularClienteImportacaoResponse,
} from "@/services/contrato.service";
import { tipoDocumentoFinanceiroService } from "@/services/tipo-documento-financeiro.service";

interface ImportarContratosDialogProps {
	formato: FormatoImportacaoContratos | null;
	onFechar: () => void;
}

type Etapa = "selecionar" | "preview" | "importando" | "clientes" | "concluido";

async function lerArquivo(
	arquivo: File,
	formato: FormatoImportacaoContratos,
): Promise<string> {
	if (formato === "csv") {
		return arquivo.text();
	}

	const buffer = await arquivo.arrayBuffer();
	const bytes = new Uint8Array(buffer);
	let binario = "";
	const tamanhoBloco = 0x8000;

	for (let inicio = 0; inicio < bytes.length; inicio += tamanhoBloco) {
		binario += String.fromCharCode(
			...bytes.subarray(inicio, inicio + tamanhoBloco),
		);
	}

	return btoa(binario);
}

export function ImportarContratosDialog({
	formato,
	onFechar,
}: ImportarContratosDialogProps) {
	const { empresa } = useEmpresa();
	const queryClient = useQueryClient();
	const inputArquivoRef = useRef<HTMLInputElement>(null);
	const avisouPendentesRef = useRef(false);

	const [etapa, setEtapa] = useState<Etapa>("selecionar");
	const [arquivo, setArquivo] = useState<File | null>(null);
	const [conteudo, setConteudo] = useState("");
	const [idtipodocumento, setIdtipodocumento] = useState("");
	const [preview, setPreview] =
		useState<PreviewImportacaoContratosResponse | null>(null);
	const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
	const [progressoUpload, setProgressoUpload] = useState(0);
	const [resultadoImportacao, setResultadoImportacao] =
		useState<ImportarContratosResponse | null>(null);
	const [clientesPendentes, setClientesPendentes] = useState<
		ClientePendenteImportacao[]
	>([]);

	const aberto = formato !== null;

	const { data: tiposDocumento = [] } = useQuery({
		queryKey: ["tipos-documento-financeiro", empresa?.id, "import-contratos"],
		enabled: Boolean(empresa?.id) && aberto,
		queryFn: () =>
			tipoDocumentoFinanceiroService.listarTodos({
				idempresa: empresa!.id,
				inativo: 0,
			}),
	});

	useEffect(() => {
		if (aberto) {
			avisouPendentesRef.current = false;
		}
	}, [aberto]);

	useEffect(() => {
		if (!aberto) return;
		if (idtipodocumento) return;
		if (tiposDocumento.length === 1 && tiposDocumento[0]) {
			setIdtipodocumento(tiposDocumento[0].id);
		}
	}, [aberto, idtipodocumento, tiposDocumento]);

	const resetar = () => {
		setEtapa("selecionar");
		setArquivo(null);
		setConteudo("");
		setPreview(null);
		setMostrarConfirmacao(false);
		setProgressoUpload(0);
		setResultadoImportacao(null);
		setClientesPendentes([]);
	};

	const fechar = () => {
		if (
			etapa === "clientes" &&
			clientesPendentes.length > 0 &&
			!avisouPendentesRef.current
		) {
			avisouPendentesRef.current = true;
			toast.warning(
				"Os contratos dos clientes sem cadastro não foram criados. Importe o arquivo de novo para vinculá-los.",
			);
		}
		resetar();
		onFechar();
	};

	const previewMutation = useMutation({
		mutationFn: (dados: { conteudo: string; nomeArquivo: string }) =>
			contratoService.previewImportacao({
				idempresa: empresa?.id as string,
				formato: formato as FormatoImportacaoContratos,
				conteudo: dados.conteudo,
				nomeArquivo: dados.nomeArquivo,
				idtipodocumento,
			}),
		onSuccess: (resultado) => {
			setPreview(resultado);
			setEtapa("preview");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao validar o arquivo");
			setEtapa("selecionar");
		},
	});

	const importarMutation = useMutation({
		mutationFn: () =>
			contratoService.importar(
				{
					idempresa: empresa?.id as string,
					formato: formato as FormatoImportacaoContratos,
					conteudo,
					nomeArquivo: arquivo?.name,
					idtipodocumento,
				},
				setProgressoUpload,
			),
		onSuccess: async (resultado) => {
			const pendentes = resultado.clientesPendentes ?? [];
			setResultadoImportacao({
				...resultado,
				clientesPendentes: pendentes,
			});
			setClientesPendentes(pendentes);
			await queryClient.invalidateQueries({ queryKey: ["contratos"] });
			await queryClient.invalidateQueries({ queryKey: ["tipos-contrato"] });
			await queryClient.invalidateQueries({ queryKey: ["grupos-contrato"] });
			if (pendentes.length > 0) {
				setEtapa("clientes");
				toast.success(
					resultado.totalCriados > 0
						? `${resultado.totalCriados} contrato(s) importado(s). Resolva os clientes sem cadastro.`
						: "Há clientes sem cadastro. Cadastre ou associe para criar os contratos.",
				);
				return;
			}
			setEtapa("concluido");
			toast.success(
				`Importação concluída: ${resultado.totalCriados} contrato(s)`,
			);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao importar contratos");
			setEtapa("preview");
		},
	});

	const handleArquivoSelecionado = async (
		evento: React.ChangeEvent<HTMLInputElement>,
	) => {
		const arquivoSelecionado = evento.target.files?.[0];
		evento.target.value = "";

		if (!arquivoSelecionado || !formato) {
			return;
		}

		if (!idtipodocumento) {
			toast.error("Selecione o tipo de documento financeiro");
			return;
		}

		if (!arquivoSelecionado.name.toLowerCase().endsWith(`.${formato}`)) {
			toast.error(
				`Extensão inválida: selecione um arquivo .${formato} para esta importação`,
			);
			return;
		}

		try {
			const conteudoLido = await lerArquivo(arquivoSelecionado, formato);
			setArquivo(arquivoSelecionado);
			setConteudo(conteudoLido);
			previewMutation.mutate({
				conteudo: conteudoLido,
				nomeArquivo: arquivoSelecionado.name,
			});
		} catch {
			toast.error("Não foi possível ler o arquivo selecionado");
		}
	};

	const clientesSemCadastro = preview?.totalClientesPendentes ?? 0;
	const contratosSemCadastro =
		preview?.contratos.filter((item) => item.clientePendente).length ?? 0;
	const importacaoBloqueada =
		!preview ||
		preview.totalErros > 0 ||
		preview.errosGerais.length > 0 ||
		!idtipodocumento ||
		(preview.totalCriar === 0 && clientesSemCadastro === 0);

	const resolverClientePendente = (
		codigocliente: string,
		resultado: VincularClienteImportacaoResponse,
	) => {
		setClientesPendentes((atual) => {
			const restantes = atual.filter(
				(item) => item.codigocliente !== codigocliente,
			);
			if (restantes.length === 0) {
				setEtapa("concluido");
			}
			return restantes;
		});
		setResultadoImportacao((atual) =>
			atual
				? {
						...atual,
						totalImportados: atual.totalImportados + resultado.totalCriados,
						totalCriados: atual.totalCriados + resultado.totalCriados,
						totalGruposCriados:
							atual.totalGruposCriados + resultado.totalGruposCriados,
						totalTiposCriados:
							atual.totalTiposCriados + resultado.totalTiposCriados,
						clientesPendentes: atual.clientesPendentes.filter(
							(item) => item.codigocliente !== codigocliente,
						),
					}
				: atual,
		);
	};

	const linhasComErro =
		preview?.contratos.filter((item) => item.erros.length > 0) ?? [];
	const linhasPreview = (
		linhasComErro.length > 0 ? linhasComErro : (preview?.contratos ?? [])
	).slice(0, 20);

	const confirmarImportacao = () => {
		setMostrarConfirmacao(false);
		setProgressoUpload(0);
		setEtapa("importando");
		importarMutation.mutate();
	};

	return (
		<>
			<Dialog
				open={aberto}
				onOpenChange={(abertoAgora) => {
					if (!abertoAgora && etapa !== "importando") {
						fechar();
					}
				}}
			>
				<DialogContent className="sm:max-w-3xl">
					<DialogHeader>
						<DialogTitle>
							{etapa === "clientes"
								? "Clientes sem cadastro"
								: `Importar contratos (${formato?.toUpperCase()})`}
						</DialogTitle>
						<DialogDescription>
							{etapa === "clientes"
								? "Cadastre um cliente novo ou associe um cadastro existente para criar os contratos que ficaram pendentes."
								: "Colunas: código do cliente (CNPJ/CPF), grupo contrato, tipo contrato, descrição, valor e vencimento. Grupo e tipo inexistentes são cadastrados automaticamente. Cliente sem cadastro é resolvido depois da importação."}
						</DialogDescription>
					</DialogHeader>

					{etapa === "selecionar" && (
						<div className="flex flex-col gap-4 py-4">
							<div className="space-y-2">
								<Label htmlFor="tipo-documento-importacao">
									Tipo de documento financeiro
								</Label>
								<Select
									value={idtipodocumento || undefined}
									onValueChange={setIdtipodocumento}
								>
									<SelectTrigger id="tipo-documento-importacao">
										<SelectValue placeholder="Selecione o tipo de documento" />
									</SelectTrigger>
									<SelectContent>
										{tiposDocumento.map((tipo) => (
											<SelectItem key={tipo.id} value={tipo.id}>
												{tipo.descricao}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="flex flex-col items-center gap-4 py-4">
								{previewMutation.isPending ? (
									<>
										<Loader2
											className="h-8 w-8 animate-spin text-primary"
											aria-hidden="true"
										/>
										<p className="text-sm text-muted-foreground">
											Validando arquivo...
										</p>
									</>
								) : (
									<>
										<FileUp
											className="h-8 w-8 text-muted-foreground"
											aria-hidden="true"
										/>
										<p className="text-sm text-muted-foreground text-center">
											Selecione um arquivo .{formato} com as colunas Código do
											cliente, Grupo contrato, Tipo contrato, Descrição do
											contrato, Valor e Vencimento.
										</p>
										<Button
											disabled={!idtipodocumento}
											onClick={() => inputArquivoRef.current?.click()}
										>
											Selecionar arquivo
										</Button>
										<input
											ref={inputArquivoRef}
											type="file"
											accept={formato === "csv" ? ".csv" : ".xlsx"}
											className="hidden"
											aria-label="Arquivo de contratos"
											onChange={handleArquivoSelecionado}
										/>
									</>
								)}
							</div>
						</div>
					)}

					{etapa === "preview" && preview && (
						<div className="flex flex-col gap-3">
							<div className="flex flex-wrap items-center gap-4 text-sm">
								<span>
									Arquivo: <span className="font-medium">{arquivo?.name}</span>
								</span>
								<span>
									Contratos:{" "}
									<span className="font-medium">{preview.totalContratos}</span>
								</span>
								<span>
									Criar:{" "}
									<span className="font-medium">{preview.totalCriar}</span>
								</span>
								<span>
									Grupos novos:{" "}
									<span className="font-medium">
										{preview.totalGruposNovos}
									</span>
								</span>
								<span>
									Tipos novos:{" "}
									<span className="font-medium">{preview.totalTiposNovos}</span>
								</span>
								<span>
									Sem cadastro:{" "}
									<span className="font-medium">{clientesSemCadastro}</span>
								</span>
								<span
									className={
										preview.totalErros > 0
											? "text-destructive"
											: "text-green-800 dark:text-green-500"
									}
								>
									Inconsistências:{" "}
									<span className="font-medium">{preview.totalErros}</span>
								</span>
							</div>

							{preview.errosGerais.length > 0 && (
								<div
									className="flex flex-col gap-1 rounded-md border border-destructive/50 bg-destructive/10 p-3"
									aria-live="polite"
								>
									{preview.errosGerais.map((erro) => (
										<p
											key={erro}
											className="flex items-center gap-2 text-sm text-destructive"
										>
											<AlertCircle
												className="h-4 w-4 shrink-0"
												aria-hidden="true"
											/>
											{erro}
										</p>
									))}
								</div>
							)}

							{preview.totalErros > 0 && (
								<p className="text-sm text-destructive" aria-live="polite">
									Corrija as inconsistências no arquivo e selecione-o novamente
									para liberar a importação.
								</p>
							)}

							{linhasPreview.length > 0 && (
								<div className="max-h-64 overflow-auto rounded-md border">
									<table className="w-full text-sm">
										<thead className="bg-muted/60">
											<tr>
												<th className="px-3 py-2 text-left font-medium">
													Linha
												</th>
												<th className="px-3 py-2 text-left font-medium">
													Cliente
												</th>
												<th className="px-3 py-2 text-left font-medium">
													Descrição
												</th>
												<th className="px-3 py-2 text-left font-medium">
													Grupo/Tipo
												</th>
												<th className="px-3 py-2 text-left font-medium">
													Erros
												</th>
											</tr>
										</thead>
										<tbody>
											{linhasPreview.map((item) => (
												<tr
													key={`${item.linha}-${item.descricao}`}
													className="border-t"
												>
													<td className="px-3 py-2">{item.linha}</td>
													<td className="px-3 py-2">
														{item.nomeCliente || item.codigocliente || "-"}
													</td>
													<td className="px-3 py-2">{item.descricao || "-"}</td>
													<td className="px-3 py-2">
														{[
															item.criarGrupo
																? `+${item.grupocontrato}`
																: item.grupocontrato,
															item.criarTipo
																? `+${item.tipocontrato}`
																: item.tipocontrato,
														]
															.filter(Boolean)
															.join(" / ") || "-"}
													</td>
													<td className="px-3 py-2">
														{item.clientePendente && (
															<span className="text-amber-700 dark:text-amber-400">
																Sem cadastro
																{item.nomeSugerido
																	? ` (${item.nomeSugerido})`
																	: ""}
															</span>
														)}
														{item.erros.length > 0 && (
															<span className="text-destructive">
																{item.clientePendente ? "; " : ""}
																{item.erros.join("; ")}
															</span>
														)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}

							<DialogFooter>
								<Button variant="outline" onClick={fechar}>
									Cancelar
								</Button>
								<Button
									variant="outline"
									onClick={() => {
										resetar();
									}}
								>
									Selecionar outro arquivo
								</Button>
								<Button
									disabled={importacaoBloqueada}
									onClick={() => setMostrarConfirmacao(true)}
								>
									{preview.totalCriar === 0
										? "Resolver clientes"
										: "Confirmar importação"}
								</Button>
							</DialogFooter>
						</div>
					)}

					{etapa === "importando" && (
						<div className="flex flex-col gap-4 py-6">
							<div className="flex items-center gap-3">
								<Loader2
									className="h-5 w-5 animate-spin text-primary"
									aria-hidden="true"
								/>
								<p className="text-sm" aria-live="polite">
									{progressoUpload < 100
										? `Enviando arquivo... ${progressoUpload}%`
										: `Processando ${preview?.totalContratos ?? 0} contrato(s)...`}
								</p>
							</div>
							<Progress value={progressoUpload} />
							<p className="text-xs text-muted-foreground">
								Não feche esta janela durante a importação.
							</p>
						</div>
					)}

					{etapa === "clientes" && empresa?.id && idtipodocumento && (
						<div className="flex flex-col gap-4">
							<ResolverClientesImportacao
								idempresa={empresa.id}
								idtipodocumento={idtipodocumento}
								clientes={clientesPendentes}
								totalCriados={resultadoImportacao?.totalCriados ?? 0}
								onResolvido={resolverClientePendente}
							/>
							<DialogFooter>
								<Button variant="outline" onClick={fechar}>
									Fechar
								</Button>
							</DialogFooter>
						</div>
					)}

					{etapa === "concluido" && resultadoImportacao && (
						<div className="flex flex-col items-center gap-4 py-8">
							<CheckCircle2
								className="h-10 w-10 text-green-600 dark:text-green-500"
								aria-hidden="true"
							/>
							<p className="text-sm text-center" aria-live="polite">
								Importação concluída: {resultadoImportacao.totalCriados}{" "}
								contrato(s), {resultadoImportacao.totalGruposCriados} grupo(s) e{" "}
								{resultadoImportacao.totalTiposCriados} tipo(s).
							</p>
							<Button onClick={fechar}>Fechar</Button>
						</div>
					)}
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={mostrarConfirmacao}
				onOpenChange={setMostrarConfirmacao}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Confirmar importação</AlertDialogTitle>
						<AlertDialogDescription>
							Serão criados {preview?.totalCriar ?? 0} contrato(s)
							{(preview?.totalGruposNovos ?? 0) > 0 ||
							(preview?.totalTiposNovos ?? 0) > 0
								? `, com ${preview?.totalGruposNovos ?? 0} grupo(s) e ${preview?.totalTiposNovos ?? 0} tipo(s) novos`
								: ""}
							.
							{clientesSemCadastro > 0
								? ` ${clientesSemCadastro} cliente(s) sem cadastro (${contratosSemCadastro} contrato(s)) ficam para a próxima janela, onde é possível cadastrar ou associar.`
								: ""}{" "}
							Deseja continuar?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction onClick={confirmarImportacao}>
							Continuar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
