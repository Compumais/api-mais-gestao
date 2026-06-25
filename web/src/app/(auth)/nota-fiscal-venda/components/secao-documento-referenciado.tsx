"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FileUp, Link2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Field,
	FieldDescription,
	FieldLabel,
	FieldSet,
	FieldLegend,
} from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { notaFiscalService } from "@/services/nota-fiscal.service";
import { listarNfesEmitidas, resolverReferenciaEmissao } from "@/services/nfe-emissao.service";
import { NFE_STATUS } from "@/constants/nfe-status";
import {
	LABEL_TIPO_DEVOLUCAO,
	type TipoDevolucaoNfe,
} from "@/util/cfop-devolucao-util";
import type { DocumentoReferenciadoResolvido } from "@/services/nfe-emissao.service";

type ModoReferencia = "nota" | "chave" | "xml";

interface SecaoDocumentoReferenciadoProps {
	idempresa: string;
	tipoDevolucao: TipoDevolucaoNfe;
	valor?: {
		tipoDevolucao?: TipoDevolucaoNfe;
		idnotafiscalReferenciada?: string;
		chaveNfe?: string;
	};
	notaReferenciadaInicial?: string;
	onChange: (valor: {
		tipoDevolucao?: TipoDevolucaoNfe;
		idnotafiscalReferenciada?: string;
		chaveNfe?: string;
		xml?: string;
	} | undefined) => void;
	onResolvido?: (dados: DocumentoReferenciadoResolvido) => void;
}

export function SecaoDocumentoReferenciado({
	idempresa,
	tipoDevolucao,
	valor,
	notaReferenciadaInicial,
	onChange,
	onResolvido,
}: SecaoDocumentoReferenciadoProps) {
	const [modo, setModo] = useState<ModoReferencia>("nota");
	const [chaveManual, setChaveManual] = useState(valor?.chaveNfe ?? "");
	const [xmlConteudo, setXmlConteudo] = useState("");
	const [notaSelecionada, setNotaSelecionada] = useState(
		valor?.idnotafiscalReferenciada ?? notaReferenciadaInicial ?? "",
	);
	const [referenciaResolvida, setReferenciaResolvida] =
		useState<DocumentoReferenciadoResolvido | null>(null);

	const { data: notasEntrada } = useQuery({
		queryKey: ["notas-entrada-referencia", idempresa],
		queryFn: () =>
			notaFiscalService.listar({
				idempresa,
				tipoorigem: 0,
				limit: 100,
			}),
		enabled: !!idempresa && tipoDevolucao === "compra",
	});

	const { data: notasVenda } = useQuery({
		queryKey: ["notas-venda-referencia-devolucao", idempresa],
		queryFn: () =>
			listarNfesEmitidas({
				idempresa,
				status: NFE_STATUS.AUTORIZADA,
				limit: 100,
			}),
		enabled: !!idempresa && tipoDevolucao === "venda",
	});

	const notasDisponiveis = useMemo(() => {
		if (tipoDevolucao === "venda") {
			return (notasVenda?.data ?? []).filter((n) => n.chavenfe);
		}
		return (notasEntrada?.data ?? []).filter(
			(n) => n.chavenfe && n.status !== 99,
		);
	}, [tipoDevolucao, notasEntrada, notasVenda]);

	const descricaoReferencia =
		tipoDevolucao === "venda"
			? "Informe a NF-e de venda autorizada que originou esta devolução do cliente."
			: "Informe a NF-e de entrada (compra) que originou esta devolução ao fornecedor.";

	const labelNota =
		tipoDevolucao === "venda" ? "Nota de venda" : "Nota de entrada (compra)";

	const { mutate: resolver, isPending } = useMutation({
		mutationFn: resolverReferenciaEmissao,
		onSuccess: (dados) => {
			setReferenciaResolvida(dados);
			onChange({
				tipoDevolucao,
				idnotafiscalReferenciada: dados.idnotafiscalReferenciada,
				chaveNfe: dados.chave,
			});
			onResolvido?.(dados);
			toast.success("Documento referenciado validado", {
				description: `Chave: ${dados.chave}`,
			});
		},
		onError: (erro) => {
			setReferenciaResolvida(null);
			toast.error("Não foi possível validar a referência", {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		},
	});

	function handleResolver() {
		if (modo === "nota") {
			if (!notaSelecionada) {
				toast.error(`Selecione a ${labelNota.toLowerCase()}`);
				return;
			}
			resolver({
				idempresa,
				tipoDevolucao,
				idnotafiscalReferenciada: notaSelecionada,
			});
			return;
		}

		if (modo === "chave") {
			if (!chaveManual.replace(/\D/g, "").match(/^\d{44}$/)) {
				toast.error("Informe a chave NF-e com 44 dígitos");
				return;
			}
			resolver({ idempresa, tipoDevolucao, chaveNfe: chaveManual });
			return;
		}

		if (!xmlConteudo.trim()) {
			toast.error("Cole ou envie o XML da nota referenciada");
			return;
		}
		resolver({ idempresa, tipoDevolucao, xml: xmlConteudo });
	}

	function handleXmlUpload(arquivo: File | null) {
		if (!arquivo) return;
		const leitor = new FileReader();
		leitor.onload = () => {
			const conteudo = String(leitor.result ?? "");
			setXmlConteudo(conteudo);
		};
		leitor.readAsText(arquivo);
	}

	return (
		<FieldSet className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
			<FieldLegend className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
				<Link2 className="size-4" />
				{LABEL_TIPO_DEVOLUCAO[tipoDevolucao]} — documento referenciado
			</FieldLegend>
			<FieldDescription className="mb-3">{descricaoReferencia}</FieldDescription>

			<div className="mb-4 flex flex-wrap gap-2">
				<Button
					type="button"
					size="sm"
					variant={modo === "nota" ? "default" : "outline"}
					onClick={() => setModo("nota")}
				>
					Nota no sistema
				</Button>
				<Button
					type="button"
					size="sm"
					variant={modo === "chave" ? "default" : "outline"}
					onClick={() => setModo("chave")}
				>
					Chave NF-e
				</Button>
				<Button
					type="button"
					size="sm"
					variant={modo === "xml" ? "default" : "outline"}
					onClick={() => setModo("xml")}
				>
					XML referenciado
				</Button>
			</div>

			{modo === "nota" && (
				<Field>
					<FieldLabel>{labelNota}</FieldLabel>
					<Select
						value={notaSelecionada}
						onValueChange={(v) => {
							setNotaSelecionada(v);
							setReferenciaResolvida(null);
							onChange({ tipoDevolucao, idnotafiscalReferenciada: v });
						}}
					>
						<SelectTrigger>
							<SelectValue placeholder={`Selecione a ${labelNota.toLowerCase()}...`} />
						</SelectTrigger>
						<SelectContent>
							{notasDisponiveis.map((nota) => (
								<SelectItem key={nota.id} value={nota.id}>
									Nº{" "}
									{nota.numeronotafiscal ??
										("numero" in nota ? nota.numero : null) ??
										"—"}{" "}
									—{" "}
									{nota.razaosocial ??
										(tipoDevolucao === "venda" && "cnpjcpf" in nota
											? nota.cnpjcpf
											: "cnpjemissor" in nota
												? nota.cnpjemissor
												: null) ??
										"—"}{" "}
									— {nota.chavenfe?.slice(-8)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>
			)}

			{modo === "chave" && (
				<Field>
					<FieldLabel>Chave de acesso (44 dígitos)</FieldLabel>
					<Input
						value={chaveManual}
						onChange={(e) => {
							setChaveManual(e.target.value);
							setReferenciaResolvida(null);
							onChange({ tipoDevolucao, chaveNfe: e.target.value });
						}}
						placeholder="35210112345678901234550010000000011234567890"
						maxLength={44}
					/>
				</Field>
			)}

			{modo === "xml" && (
				<div className="space-y-3">
					<Field>
						<FieldLabel>Arquivo XML</FieldLabel>
						<Input
							type="file"
							accept=".xml,text/xml,application/xml"
							onChange={(e) => handleXmlUpload(e.target.files?.[0] ?? null)}
						/>
					</Field>
					<Field>
						<FieldLabel>Ou cole o XML</FieldLabel>
						<Textarea
							rows={5}
							value={xmlConteudo}
							onChange={(e) => {
								setXmlConteudo(e.target.value);
								setReferenciaResolvida(null);
								onChange({ tipoDevolucao, xml: e.target.value });
							}}
							placeholder="<?xml version='1.0'..."
							className="font-mono text-xs"
						/>
					</Field>
				</div>
			)}

			<div className="mt-4 flex items-center gap-3">
				<Button
					type="button"
					size="sm"
					variant="secondary"
					onClick={handleResolver}
					disabled={isPending}
				>
					<Search className="mr-1 size-4" />
					{isPending ? "Validando..." : "Validar referência"}
				</Button>
				{referenciaResolvida && (
					<span className="text-sm text-muted-foreground">
						Chave: <code className="text-xs">{referenciaResolvida.chave}</code>
					</span>
				)}
			</div>

			{referenciaResolvida?.itensSugeridos &&
				referenciaResolvida.itensSugeridos.length > 0 && (
					<p className="mt-2 text-xs text-muted-foreground">
						<FileUp className="mr-1 inline size-3" />
						{referenciaResolvida.itensSugeridos.length} item(ns) disponível(is)
						para importar da nota referenciada.
					</p>
				)}
		</FieldSet>
	);
}
