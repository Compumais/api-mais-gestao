"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, FileUp, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
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
import { Progress } from "@/components/ui/progress";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	entidadesService,
	type FormatoImportacaoEntidades,
	type ImportarEntidadesResponse,
	type PreviewImportacaoEntidadesResponse,
} from "@/services/entidades.service";

interface ImportarClientesDialogProps {
	formato: FormatoImportacaoEntidades | null;
	onFechar: () => void;
}

type Etapa = "selecionar" | "preview" | "importando" | "concluido";

async function lerArquivo(
	arquivo: File,
	formato: FormatoImportacaoEntidades,
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

export function ImportarClientesDialog({
	formato,
	onFechar,
}: ImportarClientesDialogProps) {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const queryClient = useQueryClient();
	const inputArquivoRef = useRef<HTMLInputElement>(null);

	const [etapa, setEtapa] = useState<Etapa>("selecionar");
	const [arquivo, setArquivo] = useState<File | null>(null);
	const [conteudo, setConteudo] = useState("");
	const [preview, setPreview] =
		useState<PreviewImportacaoEntidadesResponse | null>(null);
	const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
	const [progressoUpload, setProgressoUpload] = useState(0);
	const [resultadoImportacao, setResultadoImportacao] =
		useState<ImportarEntidadesResponse | null>(null);

	const aberto = formato !== null;

	const resetar = () => {
		setEtapa("selecionar");
		setArquivo(null);
		setConteudo("");
		setPreview(null);
		setMostrarConfirmacao(false);
		setProgressoUpload(0);
		setResultadoImportacao(null);
	};

	const fechar = () => {
		resetar();
		onFechar();
	};

	const previewMutation = useMutation({
		mutationFn: (dados: { conteudo: string; nomeArquivo: string }) =>
			entidadesService.previewImportacao({
				idempresa: empresa?.id as string,
				formato: formato as FormatoImportacaoEntidades,
				conteudo: dados.conteudo,
				nomeArquivo: dados.nomeArquivo,
				cliente: 1,
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
			entidadesService.importar(
				{
					idempresa: empresa?.id as string,
					formato: formato as FormatoImportacaoEntidades,
					conteudo,
					nomeArquivo: arquivo?.name,
					cliente: 1,
				},
				setProgressoUpload,
			),
		onSuccess: async (resultado) => {
			setResultadoImportacao(resultado);
			setEtapa("concluido");
			await queryClient.invalidateQueries({ queryKey: ["entidades"] });
			toast.success(
				`Importação concluída: ${resultado.totalCriados} criado(s) e ${resultado.totalAtualizados} atualizado(s)`,
			);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao importar clientes");
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

	const importacaoBloqueada =
		!preview || preview.totalErros > 0 || preview.errosGerais.length > 0;

	const linhasComErro =
		preview?.entidades.filter((entidade) => entidade.erros.length > 0) ?? [];
	const linhasPreview = (
		linhasComErro.length > 0 ? linhasComErro : (preview?.entidades ?? [])
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
							Importar clientes ({formato?.toUpperCase()})
						</DialogTitle>
						<DialogDescription>
							Clientes existentes são atualizados pelo CNPJ/CPF. Novos registros
							são criados.
						</DialogDescription>
					</DialogHeader>

					{etapa === "selecionar" && (
						<div className="flex flex-col items-center gap-4 py-8">
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
										Selecione um arquivo .{formato} com as colunas Nome e
										CNPJ/CPF. Razão social, endereço, tipo de pessoa, IE,
										contato e nascimento são opcionais.
									</p>
									<Button onClick={() => inputArquivoRef.current?.click()}>
										Selecionar arquivo
									</Button>
									<input
										ref={inputArquivoRef}
										type="file"
										accept={formato === "csv" ? ".csv" : ".xlsx"}
										className="hidden"
										aria-label="Arquivo de clientes"
										onChange={handleArquivoSelecionado}
									/>
								</>
							)}
						</div>
					)}

					{etapa === "preview" && preview && (
						<div className="flex flex-col gap-3">
							<div className="flex flex-wrap items-center gap-4 text-sm">
								<span>
									Arquivo: <span className="font-medium">{arquivo?.name}</span>
								</span>
								<span>
									Clientes:{" "}
									<span className="font-medium">{preview.totalEntidades}</span>
								</span>
								<span>
									Criar:{" "}
									<span className="font-medium">{preview.totalCriar}</span>
								</span>
								<span>
									Atualizar:{" "}
									<span className="font-medium">{preview.totalAtualizar}</span>
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
													Nome
												</th>
												<th className="px-3 py-2 text-left font-medium">
													CNPJ/CPF
												</th>
												<th className="px-3 py-2 text-left font-medium">
													Ação
												</th>
												<th className="px-3 py-2 text-left font-medium">
													Erros
												</th>
											</tr>
										</thead>
										<tbody>
											{linhasPreview.map((entidade) => (
												<tr
													key={`${entidade.linha}-${entidade.cnpjcpf}`}
													className="border-t"
												>
													<td className="px-3 py-2">{entidade.linha}</td>
													<td className="px-3 py-2">{entidade.nome || "-"}</td>
													<td className="px-3 py-2">
														{entidade.cnpjcpf || "-"}
													</td>
													<td className="px-3 py-2">
														{entidade.acao === "criar" ? "Criar" : "Atualizar"}
													</td>
													<td className="px-3 py-2 text-destructive">
														{entidade.erros.join("; ")}
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
									Confirmar importação
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
										: `Processando ${preview?.totalEntidades ?? 0} cliente(s)...`}
								</p>
							</div>
							<Progress value={progressoUpload} />
							<p className="text-xs text-muted-foreground">
								Não feche esta janela durante a importação.
							</p>
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
								criado(s) e {resultadoImportacao.totalAtualizados}{" "}
								atualizado(s).
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
							Serão criados {preview?.totalCriar ?? 0} cliente(s) e atualizados{" "}
							{preview?.totalAtualizar ?? 0}. Deseja continuar?
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
