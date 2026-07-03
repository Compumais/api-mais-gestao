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
	type FormatoImportacaoPlanoContas,
	type ImportarPlanoContasResponse,
	type PreviewImportacaoResponse,
	planoContasService,
} from "@/services/plano-contas.service";
import { PreviewImportacaoTree } from "./preview-importacao-tree";

interface ImportarPlanoContasDialogProps {
	formato: FormatoImportacaoPlanoContas | null;
	onFechar: () => void;
}

type Etapa = "selecionar" | "preview" | "importando" | "concluido";

async function lerArquivo(
	arquivo: File,
	formato: FormatoImportacaoPlanoContas,
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

export function ImportarPlanoContasDialog({
	formato,
	onFechar,
}: ImportarPlanoContasDialogProps) {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const queryClient = useQueryClient();
	const inputArquivoRef = useRef<HTMLInputElement>(null);

	const [etapa, setEtapa] = useState<Etapa>("selecionar");
	const [arquivo, setArquivo] = useState<File | null>(null);
	const [conteudo, setConteudo] = useState<string>("");
	const [preview, setPreview] = useState<PreviewImportacaoResponse | null>(
		null,
	);
	const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
	const [progressoUpload, setProgressoUpload] = useState(0);
	const [resultadoImportacao, setResultadoImportacao] =
		useState<ImportarPlanoContasResponse | null>(null);

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
			planoContasService.previewImportacao({
				idempresa: empresa?.id as string,
				formato: formato as FormatoImportacaoPlanoContas,
				conteudo: dados.conteudo,
				nomeArquivo: dados.nomeArquivo,
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
			planoContasService.importar(
				{
					idempresa: empresa?.id as string,
					formato: formato as FormatoImportacaoPlanoContas,
					conteudo,
					nomeArquivo: arquivo?.name,
				},
				setProgressoUpload,
			),
		onSuccess: async (resultado) => {
			setResultadoImportacao(resultado);
			setEtapa("concluido");
			await queryClient.invalidateQueries({ queryKey: ["plano-contas"] });
			await queryClient.refetchQueries({ queryKey: ["plano-contas"] });
			toast.success(
				`Plano de contas importado com sucesso: ${resultado.totalImportadas} conta(s)`,
			);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao importar plano de contas");
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
		!preview ||
		preview.totalErros > 0 ||
		preview.errosGerais.length > 0 ||
		preview.vinculos.possui;

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
							Importar plano de contas ({formato?.toUpperCase()})
						</DialogTitle>
						<DialogDescription>
							O plano importado substituirá completamente o plano de contas
							atual da empresa.
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
									<p className="text-sm text-muted-foreground">
										Selecione um arquivo .{formato} com as colunas Código,
										Descrição, Tipo e Ativo
									</p>
									<Button onClick={() => inputArquivoRef.current?.click()}>
										Selecionar arquivo
									</Button>
									<input
										ref={inputArquivoRef}
										type="file"
										accept={formato === "csv" ? ".csv" : ".xlsx"}
										className="hidden"
										aria-label="Arquivo do plano de contas"
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
									Contas encontradas:{" "}
									<span className="font-medium">{preview.totalContas}</span>
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

							{preview.vinculos.possui && (
								<div
									className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
									aria-live="polite"
								>
									<p className="flex items-center gap-2 font-medium">
										<AlertCircle
											className="h-4 w-4 shrink-0"
											aria-hidden="true"
										/>
										Existem registros vinculados ao plano de contas atual. A
										importação está bloqueada até que os vínculos sejam
										removidos:
									</p>
									<ul className="mt-1 list-disc pl-9">
										{preview.vinculos.detalhes.map((vinculo) => (
											<li key={vinculo.tabela}>
												{vinculo.tabela}: {vinculo.quantidade} registro(s)
											</li>
										))}
									</ul>
								</div>
							)}

							{preview.totalErros > 0 && (
								<p className="text-sm text-destructive" aria-live="polite">
									Corrija as inconsistências destacadas no arquivo e selecione-o
									novamente para liberar a importação.
								</p>
							)}

							{preview.contas.length > 0 && (
								<PreviewImportacaoTree contas={preview.contas} />
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
									Confirmar Importação
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
										: `Processando ${preview?.totalContas ?? 0} conta(s)...`}
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
							<p className="text-sm" aria-live="polite">
								Importação concluída: {resultadoImportacao.totalImportadas}{" "}
								conta(s) importada(s)
								{resultadoImportacao.totalRemovidas > 0 &&
									` e ${resultadoImportacao.totalRemovidas} conta(s) do plano anterior removida(s)`}
								.
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
						<AlertDialogTitle>Substituir plano de contas</AlertDialogTitle>
						<AlertDialogDescription>
							O plano de contas atual será removido permanentemente e
							substituído pelo novo plano importado. Deseja continuar?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmarImportacao}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Continuar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
