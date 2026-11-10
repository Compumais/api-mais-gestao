"use client";

import { useEffect, useMemo, useState } from "react";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	calcularTotaisFiscaisEmissaoNfe,
	type ItemTributacaoEmissaoNfe,
	type ModoDescontoTotalNfe,
	resolverDescontoTotalNfe,
} from "@/util/calcular-totais-fiscais-emissao-nfe";
import { distribuirDescontosEmissaoNfe } from "@/util/distribuir-descontos-emissao-nfe";

const formatarMoeda = (valor: number) =>
	new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
		valor,
	);

function parsePercentual(texto: string): number {
	const normalizado = texto.trim().replace("%", "").replace(",", ".");
	if (!normalizado) return 0;
	const numero = Number(normalizado);
	return Number.isFinite(numero) ? numero : 0;
}

function formatarPercentual(valor: number): string {
	if (!Number.isFinite(valor) || valor <= 0) return "";
	return String(Math.round(valor * 100) / 100).replace(".", ",");
}

type CampoDescontoTotalNfeProps = {
	desconto: number;
	onDescontoChange: (valor: number) => void;
	crt?: number;
	itens: ItemTributacaoEmissaoNfe[];
	frete?: number;
	seguro?: number;
	outrasDespesas?: number;
	erro?: string;
	descontoItens?: number;
	descontoTotal?: number;
	disabled?: boolean;
	rotuloDocumento?: "NF-e" | "pedido";
};

export function CampoDescontoTotalNfe({
	desconto,
	onDescontoChange,
	crt = 1,
	itens,
	frete = 0,
	seguro = 0,
	outrasDespesas = 0,
	erro,
	descontoItens = 0,
	descontoTotal = 0,
	disabled = false,
	rotuloDocumento = "NF-e",
}: CampoDescontoTotalNfeProps) {
	const [modo, setModo] = useState<ModoDescontoTotalNfe>("desconto");
	const [percentualTexto, setPercentualTexto] = useState("");
	const [valorTotal, setValorTotal] = useState(0);

	const referencia = useMemo(() => {
		const semGlobal = distribuirDescontosEmissaoNfe(itens, 0);
		const baseProdutos =
			Math.round(
				semGlobal.linhas.reduce(
					(acc, linha) => acc + linha.bruto - linha.descontoExplicito,
					0,
				) * 100,
			) / 100;
		const totalSemDescontoGlobal = calcularTotaisFiscaisEmissaoNfe(crt, itens, {
			frete,
			seguro,
			outrasDespesas,
			desconto: 0,
		}).totalNota;
		return { baseProdutos, totalSemDescontoGlobal };
	}, [crt, itens, frete, seguro, outrasDespesas]);

	useEffect(() => {
		if (modo === "desconto") return;
		// Enquanto o rascunho ainda não recolocou os itens, a base fica zerada.
		// Não apagar um desconto que já estava na nota.
		if (referencia.baseProdutos <= 0 && (desconto ?? 0) > 0) return;
		const calculado = resolverDescontoTotalNfe({
			modo,
			informado:
				modo === "percentual" ? parsePercentual(percentualTexto) : valorTotal,
			totalSemDescontoGlobal: referencia.totalSemDescontoGlobal,
			baseProdutos: referencia.baseProdutos,
		});
		if (Math.abs(calculado - (desconto ?? 0)) > 0.009) {
			onDescontoChange(calculado);
		}
	}, [
		modo,
		percentualTexto,
		valorTotal,
		referencia,
		desconto,
		onDescontoChange,
	]);

	function alterarModo(proximo: ModoDescontoTotalNfe) {
		if (proximo === "percentual") {
			const percentual =
				referencia.baseProdutos > 0
					? (Math.max(0, desconto) / referencia.baseProdutos) * 100
					: 0;
			setPercentualTexto(formatarPercentual(percentual));
		}
		if (proximo === "total") {
			setValorTotal(
				Math.round(
					Math.max(
						0,
						referencia.totalSemDescontoGlobal - Math.max(0, desconto),
					) * 100,
				) / 100,
			);
		}
		setModo(proximo);
	}

	const percentualInformado = parsePercentual(percentualTexto);
	const totalResultante =
		Math.round(
			(referencia.totalSemDescontoGlobal - Math.max(0, desconto)) * 100,
		) / 100;

	const nomeDoc = rotuloDocumento === "pedido" ? "do pedido" : "da nota";
	const nomeDocTotal =
		rotuloDocumento === "pedido" ? "Total do pedido" : "Total da NF-e";

	let complemento = "O valor é abatido do total e rateado entre os itens.";
	if (modo === "percentual") {
		complemento =
			referencia.baseProdutos > 0
				? `${formatarPercentual(Math.min(100, percentualInformado)) || "0"}% sobre ${formatarMoeda(referencia.baseProdutos)} em produtos. Desconto: ${formatarMoeda(desconto)}.`
				: "Inclua produtos para calcular a porcentagem.";
	} else if (modo === "total") {
		complemento =
			valorTotal > referencia.totalSemDescontoGlobal + 0.009
				? `O valor informado é maior que o total ${nomeDoc}. Nenhum desconto será aplicado.`
				: `Desconto calculado: ${formatarMoeda(desconto)}. ${nomeDocTotal}: ${formatarMoeda(totalResultante)}.`;
	}

	return (
		<Field className="sm:col-span-2">
			<FieldLabel>Desconto no total</FieldLabel>
			<div className="grid gap-2 sm:grid-cols-[200px_minmax(0,180px)]">
				<Select
					value={modo}
					onValueChange={(valor) => alterarModo(valor as ModoDescontoTotalNfe)}
					disabled={disabled}
				>
					<SelectTrigger aria-label="Forma do desconto">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="desconto">Valor do desconto</SelectItem>
						<SelectItem value="total">Valor total</SelectItem>
						<SelectItem value="percentual">Porcentagem</SelectItem>
					</SelectContent>
				</Select>
				{modo === "percentual" ? (
					<Input
						inputMode="decimal"
						placeholder="Ex.: 10"
						aria-label="Porcentagem de desconto"
						value={percentualTexto}
						disabled={disabled}
						onChange={(evento) => setPercentualTexto(evento.target.value)}
					/>
				) : (
					<MoneyInput
						aria-label={
							modo === "total" ? `Valor total ${nomeDoc}` : "Valor do desconto"
						}
						value={String(modo === "total" ? valorTotal : (desconto ?? 0))}
						disabled={disabled}
						onChange={(valor) => {
							const numero = valor ? Number.parseFloat(valor) : 0;
							const normalizado = Number.isFinite(numero) ? numero : 0;
							if (modo === "total") {
								setValorTotal(normalizado);
								return;
							}
							onDescontoChange(normalizado);
						}}
					/>
				)}
			</div>
			<p className="text-xs text-muted-foreground">{complemento}</p>
			{descontoItens > 0 && (
				<p className="text-xs text-muted-foreground">
					Itens: {formatarMoeda(descontoItens)}
					{" · "}
					Total: {formatarMoeda(descontoTotal)}
				</p>
			)}
			{erro && <p className="text-xs text-destructive">{erro}</p>}
		</Field>
	);
}
