"use client";

import { useEffect, useMemo, useState } from "react";
import { PagamentoPdvDialog } from "@/components/pdv/pagamento-pdv-dialog";
import {
	calcularTotalFatiaSelecionada,
	filtrarItensPendentesContaMesa,
	parseValor,
	type ConfirmacaoVendaPdvResult,
} from "@/lib/gourmet-utils";
import type { FecharContaFormData } from "@/schemas/fechar-conta.schema";
import type { ContaMesaItem } from "@/services/conta-mesa-item.service";
import type { ContaMesa } from "@/services/conta-mesa.service";

interface FecharContaMesaDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	conta?: ContaMesa | null;
	itens: ContaMesaItem[];
	empresaNome: string;
	contexto?: string;
	onConfirmarFatia: (
		idsItens: string[],
		itensFatia: ContaMesaItem[],
		pagamento: FecharContaFormData,
	) => Promise<ConfirmacaoVendaPdvResult | void>;
	onVendaConcluida?: () => void;
	isPending?: boolean;
}

export function FecharContaMesaDialog({
	open,
	onOpenChange,
	conta,
	itens,
	empresaNome,
	contexto,
	onConfirmarFatia,
	onVendaConcluida,
	isPending,
}: FecharContaMesaDialogProps) {
	const [idsSelecionados, setIdsSelecionados] = useState<string[]>([]);
	const [desconto, setDesconto] = useState("");
	const [taxaServico, setTaxaServico] = useState("");
	const [couvert, setCouvert] = useState("");

	useEffect(() => {
		if (!open) {
			setIdsSelecionados([]);
			setDesconto("");
			setTaxaServico("");
			setCouvert("");
			return;
		}

		if (conta) {
			setDesconto(conta.desconto ?? "");
			setTaxaServico(conta.valortaxaservico ?? "");
			setCouvert(conta.valorcouverartistico ?? "");
		}
	}, [open, conta?.desconto, conta?.valortaxaservico, conta?.valorcouverartistico]);

	const itensPendentes = useMemo(
		() => filtrarItensPendentesContaMesa(itens),
		[itens],
	);

	const subtotalFatia = useMemo(
		() =>
			calcularTotalFatiaSelecionada(itensPendentes, idsSelecionados, {
				desconto: parseValor(desconto),
				taxaServico: parseValor(taxaServico),
				couvert: parseValor(couvert),
			}),
		[idsSelecionados, desconto, taxaServico, couvert, itensPendentes],
	);

	const itensCupom = useMemo(
		() =>
			itens
				.filter((item) => idsSelecionados.includes(item.id))
				.map((item) => ({
					nome: item.nomeproduto,
					quantidade: item.quantidade,
					precounitario: item.precounitario,
				})),
		[itens, idsSelecionados],
	);

	const toggleItem = (id: string) => {
		setIdsSelecionados((atual) =>
			atual.includes(id) ? atual.filter((itemId) => itemId !== id) : [...atual, id],
		);
	};

	const selecionarTodosPendentes = () => {
		setIdsSelecionados(itensPendentes.map((item) => item.id));
	};

	const handleConfirmarVenda = async (pagamento: FecharContaFormData) => {
		const itensFatia = itens.filter((item) => idsSelecionados.includes(item.id));
		return onConfirmarFatia(idsSelecionados, itensFatia, pagamento);
	};

	return (
		<PagamentoPdvDialog
			open={open}
			onOpenChange={onOpenChange}
			subtotal={subtotalFatia}
			itens={itensCupom}
			empresaNome={empresaNome}
			contexto={contexto}
			titulo="Fechar conta"
			onConfirmarVenda={handleConfirmarVenda}
			onVendaConcluida={onVendaConcluida}
			isPending={isPending}
			modoFatiaItens
			itensContaMesa={itens}
			idsItensSelecionados={idsSelecionados}
			onToggleItemConta={toggleItem}
			onSelecionarTodosPendentes={selecionarTodosPendentes}
			onFatiaParcialConcluida={() => setIdsSelecionados([])}
			ajustesExternos={{
				desconto,
				taxaServico,
				couvert,
				onDescontoChange: setDesconto,
				onTaxaServicoChange: setTaxaServico,
				onCouvertChange: setCouvert,
			}}
		/>
	);
}
