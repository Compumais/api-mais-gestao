"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconKey, IconSearch, IconUpload } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type ImportarChaveNfFormData,
	importarChaveNfSchema,
} from "@/schemas/nota-fiscal.schema";
import { diagnosticarChaveNfeInbound } from "@/services/nfe-inbound.service";
import { notaFiscalService } from "@/services/nota-fiscal.service";
import {
	CampoCondicaoPagamentoCompra,
	CampoPlanoContasDespesa,
} from "./campos-financeiros-nf-compra";

type ConsultaSituacaoErro = {
	cStat?: string;
	xMotivo?: string;
};

type ErroImportarChaveDetalhe = {
	mensagem: string;
	cStat?: string;
	codigoErro?: string;
	consultaSituacao?: ConsultaSituacaoErro | null;
};

function extrairErroImportarChave(error: unknown): ErroImportarChaveDetalhe {
	if (axios.isAxiosError(error) && error.response?.data) {
		const data = error.response.data as {
			error?: string;
			cStat?: string;
			codigoErro?: string;
			consultaSituacao?: ConsultaSituacaoErro | null;
		};

		return {
			mensagem: data.error ?? "Erro ao importar por chave",
			cStat: data.cStat,
			codigoErro: data.codigoErro,
			consultaSituacao: data.consultaSituacao ?? null,
		};
	}

	if (error instanceof Error) {
		return { mensagem: error.message };
	}

	return { mensagem: "Erro ao importar por chave" };
}

function mensagemIndicaErroDistribuicaoDfe(mensagem: string): boolean {
	return (
		/\[(137|217|632|640)\]/.test(mensagem) ||
		mensagem.includes("Distribuição DF-e") ||
		mensagem.includes("Distribuicao DF-e")
	);
}

export function FormImportarChaveNotaFiscalCompra() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const inputXmlRef = useRef<HTMLInputElement>(null);
	const [xmlOpcional, setXmlOpcional] = useState<string | undefined>();
	const [nomeArquivoXml, setNomeArquivoXml] = useState<string | null>(null);
	const [ultimoErro, setUltimoErro] = useState<ErroImportarChaveDetalhe | null>(
		null,
	);

	const form = useForm<ImportarChaveNfFormData>({
		resolver: zodResolver(importarChaveNfSchema),
		defaultValues: {
			chaveNfe: "",
		},
	});

	const { handleSubmit, setValue, watch, register, formState, getValues } = form;
	const idplanocontas = watch("idplanocontas");
	const idcondicaopagto = watch("idcondicaopagto");

	const { mutate: importarPorChave, isPending } = useMutation({
		mutationFn: async (dados: ImportarChaveNfFormData) => {
			if (!empresa) throw new Error("Empresa não selecionada");

			return notaFiscalService.importarNotaPorChave({
				idempresa: empresa.id,
				chaveNfe: dados.chaveNfe,
				idplanocontas: dados.idplanocontas || null,
				idcondicaopagto: dados.idcondicaopagto || null,
				xmlOpcional,
			});
		},
		onSuccess: (data) => {
			setUltimoErro(null);
			toast.success("Rascunho criado a partir da chave NF-e.");
			queryClient.invalidateQueries({ queryKey: ["notas-fiscais-compra"] });
			queryClient.invalidateQueries({ queryKey: ["rascunhos-importacao-nf"] });
			router.push(`/nota-fiscal-compra/rascunho/${data.idRascunho}`);
		},
		onError: (error: unknown) => {
			const detalhe = extrairErroImportarChave(error);
			setUltimoErro(detalhe);
			toast.error(detalhe.mensagem);
		},
	});

	const { mutate: diagnosticarChave, isPending: diagnosticando } = useMutation({
		mutationFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");

			const chave = getValues("chaveNfe");
			return diagnosticarChaveNfeInbound({
				idempresa: empresa.id,
				chave,
				xml: xmlOpcional,
				consultarSefaz: true,
			});
		},
		onSuccess: (resultado) => {
			const partes = [
				`Ambiente: ${resultado.empresa.ambienteDescricao ?? "não configurado"}`,
				resultado.sefaz?.consultado
					? `DF-e [${resultado.sefaz.cStat ?? "?"}]: ${resultado.sefaz.xMotivo ?? "—"} (${resultado.sefaz.quantidadeDocumentos ?? 0} doc(s))`
					: `DF-e: ${resultado.sefaz?.xMotivo ?? "não consultado"}`,
			];

			if (!resultado.preConsulta.ok) {
				const erros = resultado.preConsulta.inconsistencias
					.filter((item) => item.severidade === "erro")
					.map((item) => item.mensagem)
					.join(" ");
				toast.warning(`Pré-consulta: ${erros || "inconsistências encontradas"}`);
			} else {
				toast.info(partes.join(" · "));
			}
		},
		onError: (error: unknown) => {
			const detalhe = extrairErroImportarChave(error);
			toast.error(detalhe.mensagem);
		},
	});

	async function handleSelecionarXml(arquivo: File | undefined) {
		if (!arquivo) {
			setXmlOpcional(undefined);
			setNomeArquivoXml(null);
			return;
		}

		const conteudo = await arquivo.text();
		setXmlOpcional(conteudo);
		setNomeArquivoXml(arquivo.name);
	}

	if (!empresa) {
		return (
			<p className="text-muted-foreground">
				Selecione uma empresa para importar a nota fiscal.
			</p>
		);
	}

	const notaAutorizadaNaSefaz =
		ultimoErro?.consultaSituacao?.cStat === "100";

	return (
		<form
			onSubmit={handleSubmit((dados) => importarPorChave(dados))}
			className="flex flex-col gap-6"
		>
			<FieldGroup>
				<h2 className="text-lg font-semibold">Chave de acesso NF-e</h2>
				<p className="text-sm text-muted-foreground">
					Informe a chave de 44 dígitos da NF-e de compra. O sistema consultará
					a SEFAZ com o certificado da empresa e criará um rascunho para revisão.
					Se você já recebeu o XML do fornecedor, anexe-o abaixo para validar
					CNPJ e ambiente antes da consulta — ou use a aba{" "}
					<Link
						href="/nota-fiscal-compra/importar?tab=xml"
						className="text-primary underline-offset-4 hover:underline"
					>
						Importar XML
					</Link>
					.
				</p>

				<Field>
					<FieldLabel htmlFor="chaveNfe">Chave NF-e</FieldLabel>
					<Input
						id="chaveNfe"
						inputMode="numeric"
						autoComplete="off"
						placeholder="00000000000000000000000000000000000000000000"
						maxLength={54}
						{...register("chaveNfe")}
						aria-invalid={Boolean(formState.errors.chaveNfe)}
					/>
					{formState.errors.chaveNfe ? (
						<FieldError>{formState.errors.chaveNfe.message}</FieldError>
					) : null}
				</Field>

				<Field>
					<FieldLabel htmlFor="xml-validacao">
						XML do fornecedor (opcional, para validação)
					</FieldLabel>
					<div className="flex flex-wrap items-center gap-3">
						<input
							ref={inputXmlRef}
							id="xml-validacao"
							type="file"
							accept=".xml,application/xml,text/xml"
							className="hidden"
							onChange={(evento) => {
								void handleSelecionarXml(evento.target.files?.[0]);
							}}
						/>
						<Button
							type="button"
							variant="outline"
							onClick={() => inputXmlRef.current?.click()}
						>
							<IconUpload className="size-4" />
							Selecionar XML
						</Button>
						<Button
							type="button"
							variant="outline"
							disabled={diagnosticando || isPending}
							onClick={() => diagnosticarChave()}
						>
							<IconSearch className="size-4" />
							{diagnosticando ? "Diagnosticando..." : "Diagnosticar chave"}
						</Button>
						{nomeArquivoXml ? (
							<span className="text-sm text-muted-foreground">{nomeArquivoXml}</span>
						) : (
							<span className="text-sm text-muted-foreground">
								Compara destinatário e ambiente antes de consultar a SEFAZ
							</span>
						)}
					</div>
				</Field>
			</FieldGroup>

			{ultimoErro && mensagemIndicaErroDistribuicaoDfe(ultimoErro.mensagem) ? (
				<div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
					{notaAutorizadaNaSefaz ? (
						<p className="font-medium text-green-800 dark:text-green-200">
							A nota existe e está autorizada na SEFAZ (situação 100)
						</p>
					) : (
						<p className="font-medium text-amber-900 dark:text-amber-100">
							A SEFAZ não disponibilizou o XML desta NF-e na Distribuição DF-e
						</p>
					)}
					<p className="mt-2 text-muted-foreground">{ultimoErro.mensagem}</p>
					{ultimoErro.consultaSituacao?.xMotivo ? (
						<p className="mt-2 text-muted-foreground text-xs">
							Consulta de situação: [{ultimoErro.consultaSituacao.cStat}]{" "}
							{ultimoErro.consultaSituacao.xMotivo}
						</p>
					) : null}
					<p className="mt-3">
						Se você já possui o arquivo do fornecedor,{" "}
						<Link
							href="/nota-fiscal-compra/importar?tab=xml"
							className="font-medium text-primary underline-offset-4 hover:underline"
						>
							importe pelo XML
						</Link>{" "}
						— não depende da Distribuição DF-e.
					</p>
				</div>
			) : null}

			<FieldGroup>
				<h2 className="text-lg font-semibold">Complementos (opcional)</h2>
				<div className="grid gap-4 md:grid-cols-2">
					<CampoPlanoContasDespesa
						id="idplanocontas-chave"
						value={idplanocontas}
						onChange={(value) => setValue("idplanocontas", value)}
					/>
					<CampoCondicaoPagamentoCompra
						id="idcondicaopagto-chave"
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
				<Button type="submit" disabled={isPending}>
					<IconKey className="size-4" />
					{isPending ? "Consultando SEFAZ..." : "Buscar e importar"}
				</Button>
			</div>
		</form>
	);
}
