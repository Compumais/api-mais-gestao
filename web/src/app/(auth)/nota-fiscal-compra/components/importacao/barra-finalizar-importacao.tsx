"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
	type FinalizarRascunhoFormData,
	finalizarRascunhoSchema,
} from "@/schemas/nota-fiscal.schema";
import {
	notaFiscalService,
	type BuscarRascunhoImportacaoResponse,
} from "@/services/nota-fiscal.service";
import { listarItensSemPrecoVenda } from "@/util/preco-venda-importacao-nf";
import {
	CampoCondicaoPagamentoCompra,
	CampoFormaPagamentoCompra,
	CampoPlanoContasDespesa,
} from "../campos-financeiros-nf-compra";
import { contarPendenciasItens } from "./grid-itens-importacao";
import { ModalPrecoVendaImportacao } from "./modal-preco-venda-importacao";

type BarraFinalizarImportacaoProps = {
	idempresa: string;
	idRascunho: string;
	dados: BuscarRascunhoImportacaoResponse;
};

export function BarraFinalizarImportacao({
	idempresa,
	idRascunho,
	dados,
}: BarraFinalizarImportacaoProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const pendencias = contarPendenciasItens(dados.itens);
	const itensSemPrecoVenda = useMemo(
		() => listarItensSemPrecoVenda(dados.itens),
		[dados.itens],
	);
	const [modalPrecoVendaAberto, setModalPrecoVendaAberto] = useState(false);
	const [formDataPendente, setFormDataPendente] =
		useState<FinalizarRascunhoFormData | null>(null);

	const form = useForm<FinalizarRascunhoFormData>({
		resolver: zodResolver(finalizarRascunhoSchema),
		defaultValues: {
			gerarCustos: true,
			gerarFinanceiro: !!dados.nota.idcondicaopagto,
			idcondicaopagto: dados.nota.idcondicaopagto ?? undefined,
			idplanocontas: dados.nota.idplanocontas ?? undefined,
			idtipodocumento: dados.nota.idtipodocumento ?? undefined,
		},
	});

	const { watch, setValue, handleSubmit } = form;
	const gerarCustos = watch("gerarCustos");
	const gerarFinanceiro = watch("gerarFinanceiro");
	const idplanocontas = watch("idplanocontas");
	const idcondicaopagto = watch("idcondicaopagto");
	const idtipodocumento = watch("idtipodocumento");

	const { mutate: salvarCabecalho } = useMutation({
		mutationFn: () =>
			notaFiscalService.atualizarRascunhoImportacao(idRascunho, {
				idempresa,
				idplanocontas: idplanocontas ?? null,
				idcondicaopagto: idcondicaopagto ?? null,
				idtipodocumento: idtipodocumento ?? null,
			}),
	});

	const { mutate: finalizar, isPending } = useMutation({
		mutationFn: (formData: FinalizarRascunhoFormData) =>
			notaFiscalService.finalizarRascunhoImportacao(idRascunho, {
				idempresa,
				gerarCustos: formData.gerarCustos,
				gerarFinanceiro: formData.gerarFinanceiro,
			}),
		onSuccess: () => {
			toast.success("Nota fiscal confirmada com sucesso");
			queryClient.invalidateQueries({ queryKey: ["notas-fiscais-compra"] });
			queryClient.invalidateQueries({ queryKey: ["rascunhos-importacao-nf"] });
			router.push("/nota-fiscal-compra");
		},
		onError: (error: Error) => toast.error(error.message),
	});

	const executarFinalizacao = (formData: FinalizarRascunhoFormData) => {
		salvarCabecalho(undefined, {
			onSuccess: () => finalizar(formData),
		});
	};

	const onFinalizar = handleSubmit((formData) => {
		if (pendencias.length > 0) {
			toast.error("Existem pendências nos itens", {
				description: pendencias.slice(0, 3).join("\n"),
			});
			return;
		}

		if (formData.gerarFinanceiro && !idcondicaopagto) {
			toast.error("Informe a condição de pagamento para gerar financeiro");
			return;
		}

		if (itensSemPrecoVenda.length > 0) {
			setFormDataPendente(formData);
			setModalPrecoVendaAberto(true);
			return;
		}

		executarFinalizacao(formData);
	});

	const { mutate: excluir, isPending: excluindo } = useMutation({
		mutationFn: () =>
			notaFiscalService.excluirRascunhoImportacao(idRascunho, idempresa),
		onSuccess: () => {
			toast.success("Rascunho descartado");
			router.push("/nota-fiscal-compra");
		},
		onError: (error: Error) => toast.error(error.message),
	});

	return (
		<>
			<ModalPrecoVendaImportacao
				idempresa={idempresa}
				idRascunho={idRascunho}
				itens={itensSemPrecoVenda}
				aberto={modalPrecoVendaAberto}
				onAbertoChange={setModalPrecoVendaAberto}
				onConfirmado={() => {
					if (formDataPendente) {
						executarFinalizacao(formDataPendente);
						setFormDataPendente(null);
					}
				}}
			/>
			<section className="rounded-lg border bg-card p-4">
				<h2 className="mb-4 text-lg font-semibold">Financeiro e finalização</h2>

				<div className="mb-4 grid gap-4 md:grid-cols-2">
					<CampoPlanoContasDespesa
						id="idplanocontas-rascunho"
						value={idplanocontas}
						onChange={(value) => {
							setValue("idplanocontas", value);
							void notaFiscalService.atualizarRascunhoImportacao(idRascunho, {
								idempresa,
								idplanocontas: value || null,
							});
						}}
					/>
					<CampoFormaPagamentoCompra
						id="idtipodocumento-rascunho"
						value={idtipodocumento}
						onChange={(value) => {
							setValue("idtipodocumento", value);
							void notaFiscalService.atualizarRascunhoImportacao(idRascunho, {
								idempresa,
								idtipodocumento: value || null,
							});
						}}
					/>
					<CampoCondicaoPagamentoCompra
						id="idcondicaopagto-rascunho"
						value={idcondicaopagto}
						onChange={(value) => setValue("idcondicaopagto", value)}
					/>
				</div>

				<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:gap-6">
					<div className="flex items-center gap-2">
						<Checkbox
							id="gerarCustos-rascunho"
							checked={gerarCustos}
							onCheckedChange={(checked) =>
								setValue("gerarCustos", checked === true)
							}
						/>
						<Label htmlFor="gerarCustos-rascunho">
							Registrar custos dos produtos
						</Label>
					</div>
					<div className="flex items-center gap-2">
						<Checkbox
							id="gerarFinanceiro-rascunho"
							checked={gerarFinanceiro}
							onCheckedChange={(checked) =>
								setValue("gerarFinanceiro", checked === true)
							}
						/>
						<Label htmlFor="gerarFinanceiro-rascunho">
							Gerar contas a pagar automaticamente
						</Label>
					</div>
				</div>

				{pendencias.length > 0 ? (
					<p className="mb-4 text-sm text-destructive">
						{pendencias.length} pendência(s) nos itens. Resolva antes de
						finalizar.
					</p>
				) : itensSemPrecoVenda.length > 0 ? (
					<p className="mb-4 text-sm text-amber-700 dark:text-amber-400">
						{itensSemPrecoVenda.length} produto(s) sem preço de venda. Ao
						finalizar, você poderá informar os valores ou aplicar uma margem.
					</p>
				) : (
					<p className="mb-4 text-sm text-green-700 dark:text-green-400">
						Todos os itens estão prontos para finalização.
					</p>
				)}

				<div className="flex flex-wrap justify-end gap-3">
					<Button
						type="button"
						variant="outline"
						disabled={excluindo}
						onClick={() => excluir()}
					>
						Descartar rascunho
					</Button>
					<Button
						type="button"
						disabled={isPending || pendencias.length > 0}
						onClick={onFinalizar}
					>
						{isPending ? "Finalizando..." : "Finalizar importação"}
					</Button>
				</div>
			</section>
		</>
	);
}
