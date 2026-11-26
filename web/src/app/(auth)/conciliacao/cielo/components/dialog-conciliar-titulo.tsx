"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/app/(auth)/components/financeiro-lista-colunas";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Financeiro } from "@/services/financeiro.service";
import { financeiroService } from "@/services/financeiro.service";

type DialogConciliarTituloProps = {
	aberto: boolean;
	onAbertoChange: (aberto: boolean) => void;
	idempresa: string;
	nsu?: string | null;
	autorizacao?: string | null;
	valorBruto?: string | null;
	idfinanceiroAtual?: string | null;
	onConfirmar: (idfinanceiro: string | null) => void;
	salvando?: boolean;
};

function rotuloTitulo(titulo: Financeiro) {
	const doc = titulo.documento || "s/ doc";
	const cliente = titulo.emitente || titulo.nomecliente || "";
	const valor = formatCurrency(titulo.saldo ?? titulo.valor);
	const emissao = titulo.emissao
		? titulo.emissao.slice(0, 10).split("-").reverse().join("/")
		: "";
	return {
		principal: `${doc}${cliente ? ` — ${cliente}` : ""}`,
		secundario: `${valor}${emissao ? ` · emissão ${emissao}` : ""}${
			titulo.historico ? ` · ${titulo.historico}` : ""
		}`,
	};
}

export function DialogConciliarTitulo({
	aberto,
	onAbertoChange,
	idempresa,
	nsu,
	autorizacao,
	valorBruto,
	idfinanceiroAtual,
	onConfirmar,
	salvando = false,
}: DialogConciliarTituloProps) {
	const [busca, setBusca] = useState("");
	const [buscaDebounced, setBuscaDebounced] = useState("");
	const [selecionado, setSelecionado] = useState<string | null>(
		idfinanceiroAtual ?? null,
	);

	useEffect(() => {
		if (!aberto) return;
		setSelecionado(idfinanceiroAtual ?? null);
		setBusca("");
		setBuscaDebounced("");
	}, [aberto, idfinanceiroAtual]);

	useEffect(() => {
		const timer = window.setTimeout(() => setBuscaDebounced(busca.trim()), 300);
		return () => window.clearTimeout(timer);
	}, [busca]);

	const { data, isFetching } = useQuery({
		queryKey: ["busca-titulos-cielo", idempresa, buscaDebounced],
		enabled: aberto && Boolean(idempresa),
		queryFn: () =>
			financeiroService.listar({
				idempresa,
				tipo: "R",
				status: "A",
				limit: 30,
				page: 1,
				...(buscaDebounced
					? { q: buscaDebounced }
					: { ordenarPor: "emissao", ordem: "desc" as const }),
			}),
	});

	const titulos = data?.data ?? [];

	return (
		<Dialog open={aberto} onOpenChange={onAbertoChange}>
			<DialogContent className="sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>Conciliar com conta a receber</DialogTitle>
					<DialogDescription>
						Busque pelo documento, cliente ou histórico e associe ao lançamento
						Cielo
						{nsu ? ` (NSU ${nsu}` : ""}
						{autorizacao ? ` / auth ${autorizacao}` : ""}
						{nsu || autorizacao ? ")" : ""}.
						{valorBruto ? ` Valor bruto ${formatCurrency(valorBruto)}.` : ""}
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-3">
					<Input
						value={busca}
						onChange={(e) => setBusca(e.target.value)}
						placeholder="Buscar documento a receber..."
						autoFocus
					/>

					<div className="max-h-72 overflow-y-auto rounded-md border">
						{isFetching && (
							<p className="p-3 text-sm text-muted-foreground">Buscando...</p>
						)}
						{!isFetching && titulos.length === 0 && (
							<p className="p-3 text-sm text-muted-foreground">
								Nenhum título aberto encontrado.
							</p>
						)}
						{titulos.map((titulo) => {
							const rotulo = rotuloTitulo(titulo);
							const ativo = selecionado === titulo.id;
							return (
								<button
									key={titulo.id}
									type="button"
									className={`flex w-full flex-col items-start gap-0.5 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted/60 ${
										ativo ? "bg-muted" : ""
									}`}
									onClick={() => setSelecionado(titulo.id)}
								>
									<span className="font-medium">{rotulo.principal}</span>
									<span className="text-xs text-muted-foreground line-clamp-2">
										{rotulo.secundario}
									</span>
								</button>
							);
						})}
					</div>
				</div>

				<DialogFooter className="gap-2 sm:justify-between">
					<Button
						type="button"
						variant="ghost"
						disabled={salvando || !idfinanceiroAtual}
						onClick={() => onConfirmar(null)}
					>
						Remover associação
					</Button>
					<div className="flex gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => onAbertoChange(false)}
							disabled={salvando}
						>
							Cancelar
						</Button>
						<Button
							type="button"
							disabled={salvando || !selecionado}
							onClick={() => selecionado && onConfirmar(selecionado)}
						>
							{salvando ? "Salvando..." : "Associar"}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
