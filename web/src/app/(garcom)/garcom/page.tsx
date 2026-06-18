"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { IconPlus } from "@tabler/icons-react";
import { AbrirMesaGarcomDialog } from "./components/abrir-mesa-garcom-dialog";
import { GarcomHeader } from "./components/garcom-header";
import { MesaCardGarcom } from "./components/mesa-card-garcom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmpresa } from "@/hooks/use-empresa";
import { useAuth } from "@/hooks/use-auth";
import { isGarcom } from "@/lib/perfis";
import { calcularTotalContaMesaItens, STATUS_MESA } from "@/lib/gourmet-utils";
import { contaMesaItemService } from "@/services/conta-mesa-item.service";
import { contaMesaService } from "@/services/conta-mesa.service";

export default function GarcomPage() {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const { user } = useAuth();
	const isGarcomUser = isGarcom(user);
	const [dialogAberto, setDialogAberto] = useState(false);

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
				<GarcomHeader titulo="Garçom" />
				<div className="flex flex-1 items-center justify-center p-8">
					<p className="text-center text-muted-foreground">
						Selecione uma empresa para acessar o garçom.
					</p>
				</div>
			</>
		);
	}

	return (
		<>
			<GarcomHeader
				titulo="Garçom"
				voltarHref={isGarcomUser ? undefined : "/dashboard"}
				voltarLabel="Sistema"
			/>

			<div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
				<div className="mb-4">
					<h2 className="text-xl font-bold">Mesas e comandas</h2>
					<p className="text-sm text-muted-foreground">
						{contasAbertas.length}{" "}
						{contasAbertas.length === 1 ? "aberta" : "abertas"}
					</p>
				</div>

				{(isLoadingContas || isLoadingItens) && (
					<div className="grid grid-cols-2 gap-3">
						{Array.from({ length: 4 }).map((_, i) => (
							<Skeleton key={i.toString()} className="h-32 rounded-xl" />
						))}
					</div>
				)}

				{!isLoadingContas && !isLoadingItens && mesasComTotais.length === 0 && (
					<div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-8 text-center">
						<p className="text-lg font-medium">Nenhuma mesa aberta</p>
						<p className="max-w-xs text-sm text-muted-foreground">
							Abra uma mesa ou comanda para começar a lançar pedidos.
						</p>
						<Button size="lg" onClick={() => setDialogAberto(true)}>
							<IconPlus className="size-5" />
							Nova mesa / comanda
						</Button>
					</div>
				)}

				{!isLoadingContas && !isLoadingItens && mesasComTotais.length > 0 && (
					<div className="grid grid-cols-2 gap-3 pb-20">
						{mesasComTotais.map(({ conta, totalParcial, qtdItens }) => (
							<MesaCardGarcom
								key={conta.id}
								conta={conta}
								totalParcial={totalParcial}
								qtdItens={qtdItens}
							/>
						))}
					</div>
				)}
			</div>

			<div className="fixed right-4 bottom-4 left-4 z-40 sm:left-auto sm:w-auto">
				<Button
					size="lg"
					className="h-14 w-full shadow-lg sm:w-auto sm:min-w-[200px]"
					onClick={() => setDialogAberto(true)}
				>
					<IconPlus className="size-5" />
					Nova mesa / comanda
				</Button>
			</div>

			<AbrirMesaGarcomDialog
				open={dialogAberto}
				onOpenChange={setDialogAberto}
				mesasAbertas={mesasAbertasNumeros}
			/>
		</>
	);
}
