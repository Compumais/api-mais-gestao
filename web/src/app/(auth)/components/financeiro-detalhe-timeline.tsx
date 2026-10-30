"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatDataCivilBrasilia } from "@/lib/date";
import {
	type FinanceiroLancamento,
	financeiroLancamentoService,
} from "@/services/financeiro-lancamento.service";
import {
	ehTituloPagoSemRastreio,
	ehTituloParcial,
	type Financeiro,
} from "@/services/financeiro.service";

type EventoTimeline = {
	id: string;
	data: string | null;
	titulo: string;
	detalhes: string[];
	tom: "neutro" | "entrada" | "saida" | "sucesso" | "alerta";
	lancamentoIdEstorno?: string;
};

function formatarMoeda(valor: string | number | null | undefined) {
	const num =
		typeof valor === "number"
			? valor
			: Number.parseFloat(String(valor ?? "0").replace(",", ".")) || 0;
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(num);
}

function parseValor(valor: string | null | undefined) {
	return Number.parseFloat(String(valor ?? "0").replace(",", ".")) || 0;
}

type PagamentoPersistido = {
	valor?: string | number | null;
	metodo?: string | null;
	conta?: string | null;
};

function extrairPagamentosObservacao(
	observacao: string | null | undefined,
): PagamentoPersistido[] {
	if (!observacao?.trim().startsWith("{")) return [];
	try {
		const parsed = JSON.parse(observacao) as {
			pagamentos?: PagamentoPersistido[];
		};
		return Array.isArray(parsed.pagamentos) ? parsed.pagamentos : [];
	} catch {
		return [];
	}
}

function ordenarLancamentos(lancamentos: FinanceiroLancamento[]) {
	return [...lancamentos].sort((a, b) => {
		const ta =
			a.currenttimemillis ??
			Date.parse(a.pagamento ?? a.baixa ?? "") ??
			0;
		const tb =
			b.currenttimemillis ??
			Date.parse(b.pagamento ?? b.baixa ?? "") ??
			0;
		return ta - tb;
	});
}

function montarEventosTimeline(
	financeiro: Financeiro,
	lancamentos: FinanceiroLancamento[],
): EventoTimeline[] {
	const eventos: EventoTimeline[] = [];
	const documento = financeiro.documento?.trim() || "sem número";
	const valorOriginal = parseValor(financeiro.valor);

	eventos.push({
		id: "geracao",
		data: financeiro.emissao ?? financeiro.registro,
		titulo: `Documento ${documento} gerado`,
		detalhes: [
			`Valor ${formatarMoeda(financeiro.valor)}`,
			financeiro.emitente ? `Nome: ${financeiro.emitente}` : "",
			financeiro.parcela
				? `Parcela ${financeiro.parcela}${
						financeiro.totalparcelas && financeiro.totalparcelas > 1
							? `/${financeiro.totalparcelas}`
							: ""
					}`
				: "",
		].filter(Boolean),
		tom: "neutro",
	});

	const ordenados = ordenarLancamentos(lancamentos);
	let saldoRestante = valorOriginal;

	for (const lancamento of ordenados) {
		const valorBaixa = parseValor(
			lancamento.valorbaixa ?? lancamento.valor,
		);
		const juros = parseValor(lancamento.juros);
		const multa = parseValor(lancamento.multa);
		const desconto = parseValor(lancamento.desconto);
		const abatimento = Math.max(
			0,
			Math.round((valorBaixa - juros - multa + desconto) * 100) / 100,
		);
		const data =
			lancamento.pagamento ?? lancamento.baixa ?? lancamento.datahoracancelado;
		const pagamentosPersistidos = extrairPagamentosObservacao(
			lancamento.observacao,
		);
		const linhasMeio =
			pagamentosPersistidos.length > 0
				? pagamentosPersistidos.map((pagamento) => {
						const metodo = pagamento.metodo?.trim() || "Meio";
						return `${metodo}: ${formatarMoeda(pagamento.valor)}`;
					})
				: lancamento.historico?.trim() &&
					  !lancamento.historico.toLowerCase().startsWith("baixa de título")
					? [lancamento.historico.trim()]
					: [];

		saldoRestante = Math.max(
			0,
			Math.round((saldoRestante - abatimento) * 100) / 100,
		);
		const quitou = saldoRestante <= 0.009;
		const tipoBaixa = quitou ? "Pagamento total" : "Baixa parcial";

		const detalhesBaixa = [
			lancamento.usuario ? `Usuário: ${lancamento.usuario}` : "",
			`Valor total: ${formatarMoeda(valorBaixa)}`,
			...linhasMeio.map((linha) => `Meio: ${linha}`),
			juros > 0 ? `Juros: ${formatarMoeda(juros)}` : "",
			multa > 0 ? `Multa: ${formatarMoeda(multa)}` : "",
			desconto > 0 ? `Desconto: ${formatarMoeda(desconto)}` : "",
		].filter(Boolean);

		if (lancamento.cancelado === 1) {
			eventos.push({
				id: `baixa-${lancamento.id}`,
				data,
				titulo: `${tipoBaixa} (estornada)`,
				detalhes: detalhesBaixa,
				tom: "alerta",
			});
			eventos.push({
				id: `estorno-${lancamento.id}`,
				data: lancamento.datahoracancelado ?? data,
				titulo: "Estorno da baixa",
				detalhes: [
					`Valor estornado: ${formatarMoeda(valorBaixa)}`,
					lancamento.usuario ? `Usuário original: ${lancamento.usuario}` : "",
				].filter(Boolean),
				tom: "alerta",
			});
			saldoRestante = Math.round((saldoRestante + abatimento) * 100) / 100;
		} else {
			eventos.push({
				id: `baixa-${lancamento.id}`,
				data,
				titulo: tipoBaixa,
				detalhes: detalhesBaixa,
				tom: quitou ? "sucesso" : "entrada",
				lancamentoIdEstorno: lancamento.id,
			});
		}
	}

	const saldoAtual = parseValor(financeiro.saldo);
	const quitado =
		(financeiro.status === "P" ||
			financeiro.status === "Q" ||
			financeiro.status === "B") &&
		saldoAtual <= 0.009;

	if (quitado && !ehTituloPagoSemRastreio(financeiro)) {
		eventos.push({
			id: "quitado",
			data: financeiro.baixa ?? financeiro.pagamento,
			titulo: "Documento quitado",
			detalhes: [`Saldo ${formatarMoeda(0)}`],
			tom: "sucesso",
		});
	} else if (ehTituloPagoSemRastreio(financeiro)) {
		eventos.push({
			id: "pago-legado",
			data: financeiro.baixa ?? financeiro.pagamento,
			titulo: "Marcado como pago (sem rastreio)",
			detalhes: [
				"Baixa antiga sem lançamento financeiro. Reprocesse com Dar baixa se precisar de histórico.",
			],
			tom: "alerta",
		});
	} else if (ehTituloParcial(financeiro)) {
		eventos.push({
			id: "em-aberto-parcial",
			data: null,
			titulo: "Em aberto (parcial)",
			detalhes: [`Saldo restante ${formatarMoeda(financeiro.saldo)}`],
			tom: "neutro",
		});
	}

	return eventos;
}

const tomClasses: Record<EventoTimeline["tom"], string> = {
	neutro: "border-border bg-background",
	entrada: "border-border bg-background",
	saida: "border-border bg-background",
	sucesso: "border-emerald-500/40 bg-emerald-500/5",
	alerta: "border-amber-500/40 bg-amber-500/5",
};

const pontoClasses: Record<EventoTimeline["tom"], string> = {
	neutro: "bg-muted-foreground",
	entrada: "bg-primary",
	saida: "bg-primary",
	sucesso: "bg-emerald-600",
	alerta: "bg-amber-600",
};

type FinanceiroDetalheTimelineProps = {
	financeiro: Financeiro;
};

export function FinanceiroDetalheTimeline({
	financeiro,
}: FinanceiroDetalheTimelineProps) {
	const queryClient = useQueryClient();

	const { data, isLoading } = useQuery({
		queryKey: ["financeiro-lancamentos", financeiro.id],
		queryFn: () =>
			financeiroLancamentoService.listar({
				idfinanceiro: financeiro.id,
				page: 1,
				limit: 100,
			}),
	});

	const estornarMutation = useMutation({
		mutationFn: (id: string) => financeiroLancamentoService.estornar(id),
		onSuccess: () => {
			toast.success("Baixa estornada com sucesso");
			void queryClient.invalidateQueries({
				queryKey: ["financeiro-lancamentos", financeiro.id],
			});
			void queryClient.invalidateQueries({
				queryKey: ["financeiro", financeiro.id],
			});
			void queryClient.invalidateQueries({ queryKey: ["financeiro"] });
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao estornar baixa");
		},
	});

	const lancamentos = data?.data ?? [];
	const eventos = montarEventosTimeline(financeiro, lancamentos);

	return (
		<section className="rounded-lg border bg-card p-6">
			<div className="mb-4">
				<h2 className="text-base font-semibold">Linha do tempo</h2>
				<p className="text-sm text-muted-foreground">
					Geração do título, baixas, meios de pagamento e quitação.
				</p>
			</div>

			{isLoading ? (
				<p className="text-sm text-muted-foreground">Carregando histórico...</p>
			) : (
				<ol className="relative ms-3 space-y-0 border-s border-border">
					{eventos.map((evento, index) => (
						<li key={evento.id} className="relative pb-6 ps-6 last:pb-0">
							<span
								className={`absolute -start-[5px] top-1.5 size-2.5 rounded-full ring-4 ring-card ${pontoClasses[evento.tom]}`}
							/>
							{index < eventos.length - 1 && (
								<span className="sr-only">próximo evento</span>
							)}
							<div
								className={`rounded-md border p-3 ${tomClasses[evento.tom]}`}
							>
								<div className="flex flex-wrap items-start justify-between gap-2">
									<div>
										<p className="text-sm font-medium">{evento.titulo}</p>
										<p className="text-xs text-muted-foreground">
											{formatDataCivilBrasilia(evento.data)}
										</p>
									</div>
									{evento.lancamentoIdEstorno && (
										<Button
											type="button"
											variant="outline"
											size="sm"
											disabled={estornarMutation.isPending}
											onClick={() =>
												estornarMutation.mutate(evento.lancamentoIdEstorno as string)
											}
										>
											Estornar
										</Button>
									)}
								</div>
								{evento.detalhes.length > 0 && (
									<ul className="mt-2 space-y-0.5">
										{evento.detalhes.map((detalhe) => (
											<li
												key={`${evento.id}-${detalhe}`}
												className="text-xs text-muted-foreground"
											>
												{detalhe}
											</li>
										))}
									</ul>
								)}
							</div>
						</li>
					))}
				</ol>
			)}
		</section>
	);
}
