"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lotesService } from "@/services/lotes.service";

type LotesProdutoEstoqueProps = {
	idempresa: string;
	codigoproduto?: string | null;
};

function formatarQuantidade(valor: string | null | undefined) {
	const n = Number.parseFloat(valor ?? "0");
	if (Number.isNaN(n)) return "0";
	return n.toLocaleString("pt-BR", { maximumFractionDigits: 6 });
}

export function LotesProdutoEstoque({
	idempresa,
	codigoproduto,
}: LotesProdutoEstoqueProps) {
	const queryClient = useQueryClient();
	const [numero, setNumero] = useState("");
	const [quantidadeAjuste, setQuantidadeAjuste] = useState("");
	const [datavalidade, setDatavalidade] = useState("");
	const [datafabricacao, setDatafabricacao] = useState("");

	const queryKey = ["estoque-lotes", idempresa, codigoproduto];

	const { data, isLoading } = useQuery({
		queryKey,
		queryFn: () =>
			lotesService.listar({
				idempresa,
				codigoproduto: codigoproduto ?? undefined,
			}),
		enabled: !!idempresa && !!codigoproduto,
	});

	const criar = useMutation({
		mutationFn: () => {
			if (!data?.idproduto) {
				throw new Error("Produto não encontrado para o ajuste de lote.");
			}
			return lotesService.criar({
				idempresa,
				idproduto: data.idproduto,
				numero: numero.trim(),
				datafabricacao: datafabricacao || null,
				datavalidade: datavalidade || null,
				quantidadeAjuste: Number.parseFloat(quantidadeAjuste.replace(",", ".")),
			});
		},
		onSuccess: async () => {
			toast.success("Lote ajustado");
			setNumero("");
			setQuantidadeAjuste("");
			setDatavalidade("");
			setDatafabricacao("");
			await queryClient.invalidateQueries({ queryKey });
		},
		onError: (error: Error) => {
			toast.error(error.message || "Falha ao ajustar lote");
		},
	});

	if (isLoading) {
		return <p className="text-sm text-muted-foreground">Carregando lotes...</p>;
	}

	if (!data) {
		return null;
	}

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between gap-2">
				<h3 className="text-sm font-semibold">Lotes</h3>
				{data.saldoOrfao > 0 ? (
					<Badge variant="outline">
						Saldo sem lote: {formatarQuantidade(String(data.saldoOrfao))}
					</Badge>
				) : null}
			</div>

			{data.lotes.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					Nenhum lote cadastrado. Use o ajuste abaixo para regularizar saldo
					órfão.
				</p>
			) : (
				<div className="space-y-2">
					{data.lotes.map((lote) => (
						<div key={lote.id} className="rounded border p-3 text-sm">
							<div className="flex items-center justify-between gap-2">
								<span className="font-medium">{lote.numero}</span>
								{lote.vencido ? (
									<Badge variant="destructive">Vencido</Badge>
								) : null}
							</div>
							<p className="text-muted-foreground mt-1">
								Saldo {formatarQuantidade(lote.quantidade)} · Fiscal{" "}
								{formatarQuantidade(lote.quantidadefiscal)}
							</p>
							{lote.datavalidade ? (
								<p className="text-muted-foreground">
									Validade {lote.datavalidade}
								</p>
							) : null}
						</div>
					))}
				</div>
			)}

			<div className="space-y-2 rounded-lg border p-3">
				<p className="text-sm font-medium">Ajuste de lote</p>
				<div className="grid grid-cols-2 gap-2">
					<div className="space-y-1">
						<Label htmlFor="lote-numero">Número</Label>
						<Input
							id="lote-numero"
							value={numero}
							maxLength={20}
							onChange={(e) => setNumero(e.target.value)}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="lote-qtd">Quantidade</Label>
						<Input
							id="lote-qtd"
							value={quantidadeAjuste}
							onChange={(e) => setQuantidadeAjuste(e.target.value)}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="lote-fab">Fabricação</Label>
						<Input
							id="lote-fab"
							type="date"
							value={datafabricacao}
							onChange={(e) => setDatafabricacao(e.target.value)}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="lote-val">Validade</Label>
						<Input
							id="lote-val"
							type="date"
							value={datavalidade}
							onChange={(e) => setDatavalidade(e.target.value)}
						/>
					</div>
				</div>
				<Button
					type="button"
					size="sm"
					disabled={
						!numero.trim() ||
						!(Number.parseFloat(quantidadeAjuste.replace(",", ".")) > 0) ||
						criar.isPending
					}
					onClick={() => criar.mutate()}
				>
					Entrar quantidade no lote
				</Button>
			</div>
		</div>
	);
}
