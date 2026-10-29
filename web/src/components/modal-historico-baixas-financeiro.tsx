"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { formatDataCivilBrasilia } from "@/lib/date";
import { financeiroLancamentoService } from "@/services/financeiro-lancamento.service";

type ModalHistoricoBaixasFinanceiroProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	idfinanceiro: string | null;
};

function formatarMoeda(valor: string | null | undefined) {
	const num = Number.parseFloat(valor || "0") || 0;
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(num);
}

export function ModalHistoricoBaixasFinanceiro({
	open,
	onOpenChange,
	idfinanceiro,
}: ModalHistoricoBaixasFinanceiroProps) {
	const queryClient = useQueryClient();

	const { data, isLoading, isFetching } = useQuery({
		queryKey: ["financeiro-lancamentos", idfinanceiro],
		queryFn: () =>
			financeiroLancamentoService.listar({
				idfinanceiro: idfinanceiro as string,
				page: 1,
				limit: 50,
			}),
		enabled: open && !!idfinanceiro,
	});

	const lancamentos = data?.data ?? [];

	const handleEstornar = async (id: string) => {
		try {
			await financeiroLancamentoService.estornar(id);
			toast.success("Baixa estornada com sucesso");
			void queryClient.invalidateQueries({
				queryKey: ["financeiro-lancamentos", idfinanceiro],
			});
			void queryClient.invalidateQueries({ queryKey: ["financeiro"] });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Erro ao estornar baixa",
			);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Histórico de baixas</DialogTitle>
					<DialogDescription>
						Lançamentos de baixa deste título. Estorne para reabrir o saldo.
					</DialogDescription>
				</DialogHeader>
				<div className="max-h-[60vh] overflow-y-auto space-y-3 py-2">
					{isLoading || isFetching ? (
						<p className="text-sm text-muted-foreground">Carregando...</p>
					) : lancamentos.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							Nenhuma baixa registrada.
						</p>
					) : (
						lancamentos.map((lancamento) => {
							const cancelado = lancamento.cancelado === 1;
							return (
								<div
									key={lancamento.id}
									className="rounded-md border p-3 space-y-1"
								>
									<div className="flex items-start justify-between gap-2">
										<div>
											<p className="text-sm font-medium">
												{formatarMoeda(
													lancamento.valorbaixa ?? lancamento.valor,
												)}
											</p>
											<p className="text-xs text-muted-foreground">
												{formatDataCivilBrasilia(
													lancamento.pagamento ?? lancamento.baixa,
												)}
												{cancelado ? " · Estornado" : ""}
											</p>
										</div>
										{!cancelado && (
											<Button
												variant="outline"
												size="sm"
												onClick={() => void handleEstornar(lancamento.id)}
											>
												Estornar
											</Button>
										)}
									</div>
									{lancamento.historico && (
										<p className="text-xs text-muted-foreground">
											{lancamento.historico}
										</p>
									)}
								</div>
							);
						})
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
