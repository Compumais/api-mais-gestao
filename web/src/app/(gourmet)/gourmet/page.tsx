"use client";

import { IconPlus, IconShoppingCart } from "@tabler/icons-react";
import { useQueries, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCaixaPdv } from "@/hooks/use-caixa-pdv";
import { useAuth } from "@/hooks/use-auth";
import { useEmpresa } from "@/hooks/use-empresa";
import { isGarcom } from "@/lib/perfis";
import { calcularTotalContaMesaItens, STATUS_MESA } from "@/lib/gourmet-utils";
import { contaMesaService } from "@/services/conta-mesa.service";
import { contaMesaItemService } from "@/services/conta-mesa-item.service";
import { AbrirMesaDialog } from "./components/abrir-mesa-dialog";
import { MesaCard } from "./components/mesa-card";
import { PdvHeader } from "./components/pdv-header";

export default function GourmetHubPage() {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const { user } = useAuth();
	const { estaAberto } = useCaixaPdv();
	const isGarcomUser = isGarcom(user);
	const [dialogAberto, setDialogAberto] = useState(false);

	const guardCaixa = () => {
		if (!estaAberto) {
			toast.error("Abra o caixa antes de realizar vendas");
			return false;
		}
		return true;
	};

	const handleNovaMesa = () => {
		if (!guardCaixa()) return;
		setDialogAberto(true);
	};

	const { data: contasData, isLoading: isLoadingContas } = useQuery({
		queryKey: ["contas-mesa", empresa?.id, { status: STATUS_MESA.ABERTO }],
		queryFn: () =>
			contaMesaService.listar({
				idempresa: empresa!.id,
				status: STATUS_MESA.ABERTO,
				limit: 100,
			}),
		enabled: !!empresa?.id,
	});

	const contasAbertas = contasData?.data ?? [];

	const itensQueries = useQueries({
		queries: contasAbertas.map((conta) => ({
			queryKey: ["conta-mesa-itens", conta.id],
			queryFn: () =>
				contaMesaItemService.listar({ idcontamesa: conta.id, limit: 100 }),
			enabled: !!conta.id,
		})),
	});

	const mesasComTotais = useMemo(() => {
		return contasAbertas.map((conta, index) => {
			const itens = itensQueries[index]?.data?.data ?? [];
			return {
				conta,
				totalParcial: calcularTotalContaMesaItens(itens),
				qtdItens: itens.length,
			};
		});
	}, [contasAbertas, itensQueries]);

	const mesasAbertasNumeros = contasAbertas.map((c) => c.numeromesa);
	const isLoadingItens = itensQueries.some((q) => q.isLoading);

	if (!empresa) {
		return (
			<>
				<PdvHeader
					titulo="PDV Gourmet — Mesas"
					voltarHref={isGarcomUser ? undefined : "/dashboard"}
					voltarLabel="Voltar ao sistema"
				/>
				<div className="flex flex-1 items-center justify-center p-8">
					<p className="text-muted-foreground">
						Selecione uma empresa para acessar o PDV Gourmet.
					</p>
				</div>
			</>
		);
	}

	return (
		<>
			<PdvHeader
				titulo="PDV Gourmet — Mesas"
				voltarHref={isGarcomUser ? undefined : "/dashboard"}
				voltarLabel="Voltar ao sistema"
			/>
			<div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-6">
				<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 className="text-2xl font-bold">Mesas abertas</h2>
						<p className="text-sm text-muted-foreground">
							{contasAbertas.length}{" "}
							{contasAbertas.length === 1 ? "mesa aberta" : "mesas abertas"}
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<Button onClick={handleNovaMesa} disabled={!estaAberto}>
							<IconPlus className="size-4" />
							Nova mesa
						</Button>
						<Button variant="secondary" asChild disabled={!estaAberto}>
							<Link
								href={estaAberto ? "/gourmet/venda-rapida" : "#"}
								onClick={(e) => {
									if (!estaAberto) {
										e.preventDefault();
										guardCaixa();
									}
								}}
							>
								<IconShoppingCart className="size-4" />
								Venda rápida
							</Link>
						</Button>
					</div>
				</div>

				{(isLoadingContas || isLoadingItens) && (
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
						{Array.from({ length: 4 }).map((_, i) => (
							<Skeleton key={i.toString()} className="h-40 rounded-xl" />
						))}
					</div>
				)}

				{!isLoadingContas && !isLoadingItens && mesasComTotais.length === 0 && (
					<div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-12 text-center">
						<p className="text-lg font-medium">Nenhuma mesa aberta</p>
						<p className="max-w-sm text-sm text-muted-foreground">
							Abra uma nova mesa para iniciar uma comanda ou use a venda rápida
							para atendimento no balcão.
						</p>
						<div className="flex gap-2">
							<Button onClick={handleNovaMesa} disabled={!estaAberto}>
								<IconPlus className="size-4" />
								Abrir mesa
							</Button>
							<Button variant="secondary" asChild disabled={!estaAberto}>
								<Link
									href={estaAberto ? "/gourmet/venda-rapida" : "#"}
									onClick={(e) => {
										if (!estaAberto) {
											e.preventDefault();
											guardCaixa();
										}
									}}
								>
									Venda rápida
								</Link>
							</Button>
						</div>
					</div>
				)}

				{!isLoadingContas && !isLoadingItens && mesasComTotais.length > 0 && (
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
						{mesasComTotais.map(({ conta, totalParcial, qtdItens }) => (
							<MesaCard
								key={conta.id}
								conta={conta}
								totalParcial={totalParcial}
								qtdItens={qtdItens}
							/>
						))}
					</div>
				)}

				<AbrirMesaDialog
					open={dialogAberto}
					onOpenChange={setDialogAberto}
					mesasAbertas={mesasAbertasNumeros}
				/>
			</div>
		</>
	);
}
