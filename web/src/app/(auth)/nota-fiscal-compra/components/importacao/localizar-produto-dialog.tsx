"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	notaFiscalService,
	type NotaFiscalItemImportacao,
} from "@/services/nota-fiscal.service";

type LocalizarProdutoDialogProps = {
	idempresa: string;
	idRascunho: string;
	item: NotaFiscalItemImportacao;
	aberto: boolean;
	onAbertoChange: (aberto: boolean) => void;
};

export function LocalizarProdutoDialog({
	idempresa,
	idRascunho,
	item,
	aberto,
	onAbertoChange,
}: LocalizarProdutoDialogProps) {
	const queryClient = useQueryClient();
	const eanXml = item.dadosimportacao?.eanXml ?? "";
	const [busca, setBusca] = useState("");
	const [resultado, setResultado] = useState<
		Awaited<ReturnType<typeof notaFiscalService.buscarProduto>> | null
	>(null);

	const { mutate: buscar, isPending: buscando } = useMutation({
		mutationFn: (params: { q?: string; ean?: string; codigo?: string }) =>
			notaFiscalService.buscarProduto({
				idempresa,
				...params,
			}),
		onSuccess: (data) => setResultado(data),
		onError: (error: Error) => toast.error(error.message),
	});

	useEffect(() => {
		if (!aberto) {
			setResultado(null);
			return;
		}

		setBusca(item.dadosimportacao?.descricaoFornecedor ?? item.descricao ?? "");

		if (!eanXml) return;

		let cancelado = false;

		notaFiscalService
			.buscarProduto({ idempresa, ean: eanXml })
			.then((data) => {
				if (!cancelado) setResultado(data);
			})
			.catch((error: Error) => {
				if (!cancelado) toast.error(error.message);
			});

		return () => {
			cancelado = true;
		};
	}, [aberto, eanXml, idempresa, item]);

	const { mutate: vincular, isPending: vinculando } = useMutation({
		mutationFn: (idproduto: string) =>
			notaFiscalService.atualizarItemRascunhoImportacao(idRascunho, item.id, {
				idempresa,
				statusVinculo: "vinculado",
				idproduto,
			}),
		onSuccess: () => {
			toast.success("Produto vinculado");
			queryClient.invalidateQueries({
				queryKey: ["rascunho-importacao-nf", idRascunho],
			});
			onAbertoChange(false);
		},
		onError: (error: Error) => toast.error(error.message),
	});

	const executarBusca = () => {
		const termo = busca.trim();
		const somenteDigitos = termo.replace(/\D/g, "");

		if (somenteDigitos.length >= 8) {
			buscar({ ean: somenteDigitos });
			return;
		}

		if (/^\d+$/.test(termo)) {
			buscar({ codigo: termo });
			return;
		}

		buscar({ q: termo });
	};

	return (
		<Dialog open={aberto} onOpenChange={onAbertoChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Localizar produto</DialogTitle>
				</DialogHeader>
				<p className="text-sm text-muted-foreground">
					{item.dadosimportacao?.descricaoFornecedor ?? item.descricao}
				</p>
				{eanXml ? (
					<p className="text-sm">
						EAN do XML: <span className="font-mono font-medium">{eanXml}</span>
					</p>
				) : null}
				<div className="flex gap-2">
					<Input
						value={busca}
						onChange={(e) => setBusca(e.target.value)}
						placeholder="Buscar por descrição, código ou EAN"
						aria-label="Buscar produto"
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								executarBusca();
							}
						}}
					/>
					<Button
						type="button"
						variant="outline"
						onClick={executarBusca}
						disabled={buscando}
					>
						Buscar
					</Button>
				</div>
				{resultado?.encontrado && resultado.produto ? (
					<div className="rounded-md border p-3 text-sm">
						<p className="font-medium">{resultado.produto.nome}</p>
						<p className="text-muted-foreground">
							Cód: {resultado.produto.codigo ?? "-"} | EAN:{" "}
							{resultado.produto.ean ?? "-"}
						</p>
						{eanXml &&
						resultado.produto.ean &&
						String(resultado.produto.ean) !== eanXml ? (
							<p className="text-amber-600 dark:text-amber-400 mt-1">
								Atenção: o EAN do estoque difere do EAN da nota.
							</p>
						) : null}
						<Button
							type="button"
							className="mt-2"
							size="sm"
							onClick={() => {
								if (resultado.produto) vincular(resultado.produto.id);
							}}
							disabled={vinculando}
						>
							Vincular este produto
						</Button>
					</div>
				) : resultado ? (
					<p className="text-sm text-muted-foreground">
						Nenhum produto encontrado com este EAN/código/descrição.
					</p>
				) : null}
				<DialogFooter>
					<Button type="button" variant="outline" onClick={() => onAbertoChange(false)}>
						Fechar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
