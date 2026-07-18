"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconFileUpload } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	FieldGroup,
} from "@/components/ui/field";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type ImportarXmlNfFormData,
	importarXmlNfSchema,
} from "@/schemas/nota-fiscal.schema";
import { notaFiscalService } from "@/services/nota-fiscal.service";
import {
	CampoCondicaoPagamentoCompra,
	CampoFormaPagamentoCompra,
	CampoPlanoContasDespesa,
} from "./campos-financeiros-nf-compra";

export function FormImportarXmlNotaFiscalCompra() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const inputRef = useRef<HTMLInputElement>(null);
	const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
	const [conteudoXml, setConteudoXml] = useState<string>("");

	const form = useForm<ImportarXmlNfFormData>({
		resolver: zodResolver(importarXmlNfSchema),
		defaultValues: {
			gerarCustos: true,
			gerarFinanceiro: true,
		},
	});

	const { handleSubmit, setValue, watch } = form;
	const idplanocontas = watch("idplanocontas");
	const idcondicaopagto = watch("idcondicaopagto");
	const idtipodocumento = watch("idtipodocumento");

	const { mutate: importarXml, isPending } = useMutation({
		mutationFn: async (dados: ImportarXmlNfFormData) => {
			if (!empresa) throw new Error("Empresa não selecionada");
			if (!conteudoXml) throw new Error("Selecione um arquivo XML");

			return notaFiscalService.criarRascunhoImportacaoXml({
				idempresa: empresa.id,
				xml: conteudoXml,
				idplanocontas: dados.idplanocontas || null,
				idcondicaopagto: dados.idcondicaopagto || null,
				idtipodocumento: dados.idtipodocumento || null,
			});
		},
		onSuccess: (data) => {
			toast.success("Rascunho criado. Revise os itens antes de finalizar.");
			queryClient.invalidateQueries({ queryKey: ["notas-fiscais-compra"] });
			queryClient.invalidateQueries({ queryKey: ["rascunhos-importacao-nf"] });
			router.push(`/nota-fiscal-compra/rascunho/${data.idRascunho}`);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao importar XML");
		},
	});

	const handleArquivo = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const arquivo = event.target.files?.[0];
		if (!arquivo) return;

		if (!arquivo.name.toLowerCase().endsWith(".xml")) {
			toast.error("Selecione um arquivo .xml válido");
			return;
		}

		const texto = await arquivo.text();
		setConteudoXml(texto);
		setNomeArquivo(arquivo.name);
	};

	if (!empresa) {
		return (
			<p className="text-muted-foreground">
				Selecione uma empresa para importar a nota fiscal.
			</p>
		);
	}

	return (
		<form
			onSubmit={handleSubmit((dados) => importarXml(dados))}
			className="flex flex-col gap-6"
		>
			<FieldGroup>
				<h2 className="text-lg font-semibold">Arquivo XML NF-e</h2>
				<p className="text-sm text-muted-foreground">
					Selecione o arquivo XML da nota fiscal de compra (modelo 55). Os
					dados serão extraídos automaticamente: emitente, itens, impostos e
					totais.
				</p>

				<input
					ref={inputRef}
					type="file"
					accept=".xml,text/xml,application/xml"
					className="sr-only"
					onChange={handleArquivo}
					aria-label="Selecionar arquivo XML da NF-e"
				/>

				<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
					<Button
						type="button"
						variant="outline"
						onClick={() => inputRef.current?.click()}
					>
						<IconFileUpload className="size-4" />
						Selecionar XML
					</Button>
					{nomeArquivo ? (
						<span className="text-sm text-muted-foreground">
							Arquivo: <strong>{nomeArquivo}</strong>
						</span>
					) : (
						<span className="text-sm text-muted-foreground">
							Nenhum arquivo selecionado
						</span>
					)}
				</div>
			</FieldGroup>

			<FieldGroup>
				<h2 className="text-lg font-semibold">Complementos (opcional)</h2>
				<div className="grid gap-4 md:grid-cols-2">
					<CampoPlanoContasDespesa
						id="idplanocontas-xml"
						value={idplanocontas}
						onChange={(value) => setValue("idplanocontas", value)}
					/>
					<CampoFormaPagamentoCompra
						id="idtipodocumento-xml"
						value={idtipodocumento}
						onChange={(value) => setValue("idtipodocumento", value)}
					/>
					<CampoCondicaoPagamentoCompra
						id="idcondicaopagto-xml"
						value={idcondicaopagto}
						onChange={(value) => setValue("idcondicaopagto", value)}
					/>
				</div>
			</FieldGroup>

			<div className="flex gap-3 justify-end">
				<Button
					type="button"
					variant="outline"
					onClick={() => router.push("/nota-fiscal-compra")}
				>
					Cancelar
				</Button>
				<Button type="submit" disabled={isPending || !conteudoXml}>
					{isPending ? "Processando..." : "Continuar para revisão"}
				</Button>
			</div>
		</form>
	);
}
