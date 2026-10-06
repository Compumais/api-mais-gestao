"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import {
	calcularResumoTurno,
	type ResumoTurnoCaixa,
} from "@/hooks/use-caixa-pdv";
import { formatDateTimeBrasilia } from "@/lib/date";
import {
	formatCurrency,
	parseValor,
	STATUS_CAIXA,
} from "@/lib/gourmet-utils";
import { nomeVisivelPessoa } from "@/lib/nome-visivel";
import type { FechamentoCaixa } from "@/services/fechamento-caixa.service";
import { fechamentoCaixaService } from "@/services/fechamento-caixa.service";

interface DialogFecharCaixaPdvProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	idempresa: string;
	turnoInicialId?: number | null;
}

function rotuloTurno(turno: FechamentoCaixa): string {
	const quando = turno.datacriacao ?? turno.datahora;
	const operador = nomeVisivelPessoa(turno.operadorNome) ?? "operador não identificado";
	const data = quando ? formatDateTimeBrasilia(quando) : "sem data";
	return `PDV ${turno.pdv ?? "—"} · ${data} · ${operador}`;
}

export function DialogFecharCaixaPdv({
	open,
	onOpenChange,
	idempresa,
	turnoInicialId,
}: DialogFecharCaixaPdvProps) {
	const { user } = useAuth();
	const queryClient = useQueryClient();
	const [turnoId, setTurnoId] = useState<number | null>(null);
	const [saldoinformado, setSaldoinformado] = useState("");
	const [observacao, setObservacao] = useState("");
	const [fechando, setFechando] = useState(false);

	const abertosQuery = useQuery({
		queryKey: ["fechamentos-caixa-abertos", idempresa],
		queryFn: () =>
			fechamentoCaixaService.listar({
				idempresa,
				status: STATUS_CAIXA.ABERTO,
				limit: 100,
			}),
		enabled: open && !!idempresa,
	});

	const abertos = abertosQuery.data?.data ?? [];
	const turno =
		abertos.find((item) => item.id === turnoId) ??
		(abertos.length === 1 ? abertos[0] : null);

	const resumoQuery = useQuery({
		queryKey: ["resumo-turno-caixa", idempresa, turno?.id],
		queryFn: () => {
			if (!turno || turno.pdv == null) {
				throw new Error("Turno sem número de PDV");
			}
			return calcularResumoTurno(turno, idempresa, turno.pdv);
		},
		enabled: open && !!turno && turno.pdv != null,
	});

	useEffect(() => {
		if (!open) {
			setTurnoId(null);
			setSaldoinformado("");
			setObservacao("");
			return;
		}
		if (turnoId != null) return;
		if (
			turnoInicialId != null &&
			abertos.some((item) => item.id === turnoInicialId)
		) {
			setTurnoId(turnoInicialId);
			return;
		}
		if (abertos.length === 1) {
			setTurnoId(abertos[0]?.id ?? null);
		}
	}, [open, abertos, turnoInicialId, turnoId]);

	const resumo: ResumoTurnoCaixa | null = resumoQuery.data ?? null;
	const saldoInformadoNum = parseValor(saldoinformado);
	const saldoCaixaFisico = resumo?.saldoCaixaFisico ?? 0;
	const diferenca = saldoInformadoNum - saldoCaixaFisico;
	const sobra = Math.max(0, diferenca);
	const falta = Math.max(0, -diferenca);

	const handleConfirmar = async () => {
		if (!turno || !resumo || !user?.id) {
			toast.error("Não foi possível identificar o turno ou o usuário");
			return;
		}

		setFechando(true);
		try {
			await fechamentoCaixaService.atualizar(turno.id, {
				status: STATUS_CAIXA.FECHADO,
				saldoapurado: resumo.saldoapurado.toFixed(2),
				saldoinformado: saldoInformadoNum.toFixed(2),
				saldoconferido: saldoInformadoNum.toFixed(2),
				sobra: sobra.toFixed(2),
				falta: falta.toFixed(2),
				idusuariofechamento: user.id,
				observacao: observacao.trim() ? observacao.trim() : null,
				datahora: new Date().toISOString(),
			});
			await queryClient.invalidateQueries({ queryKey: ["fechamentos-caixa"] });
			await queryClient.invalidateQueries({
				queryKey: ["fechamentos-caixa-abertos"],
			});
			await queryClient.invalidateQueries({ queryKey: ["caixa-pdv-aberto"] });
			toast.success("Caixa fechado com sucesso");
			onOpenChange(false);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Erro ao fechar o caixa",
			);
		} finally {
			setFechando(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Fechar caixa</DialogTitle>
					<DialogDescription>
						Fecha o turno aberto na retaguarda, o mesmo registro sincronizado
						pelo PDV. Informe a contagem física da gaveta.
					</DialogDescription>
				</DialogHeader>

				{abertosQuery.isLoading ? (
					<div className="space-y-2 py-4">
						{Array.from({ length: 4 }).map((_, i) => (
							<div
								key={i.toString()}
								className="h-8 animate-pulse rounded bg-muted"
							/>
						))}
					</div>
				) : abertosQuery.isError ? (
					<div className="flex flex-col items-center gap-3 py-4 text-center">
						<p className="text-sm text-destructive">
							{abertosQuery.error instanceof Error
								? abertosQuery.error.message
								: "Não foi possível carregar os caixas abertos."}
						</p>
						<Button
							variant="outline"
							size="sm"
							onClick={() => void abertosQuery.refetch()}
						>
							Tentar novamente
						</Button>
					</div>
				) : abertos.length === 0 ? (
					<p className="py-4 text-center text-sm text-muted-foreground">
						Nenhum caixa aberto no PDV.
					</p>
				) : (
					<div className="space-y-4">
						{abertos.length > 1 ? (
							<Field>
								<FieldLabel>Turno aberto</FieldLabel>
								<FieldGroup>
									<Select
										value={turno ? String(turno.id) : undefined}
										onValueChange={(valor) => {
											setTurnoId(Number(valor));
											setSaldoinformado("");
											setObservacao("");
										}}
									>
										<SelectTrigger>
											<SelectValue placeholder="Selecione o caixa" />
										</SelectTrigger>
										<SelectContent>
											{abertos.map((item) => (
												<SelectItem key={item.id} value={String(item.id)}>
													{rotuloTurno(item)}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</FieldGroup>
							</Field>
						) : turno ? (
							<p className="text-sm text-muted-foreground">{rotuloTurno(turno)}</p>
						) : null}

						{!turno ? (
							<p className="text-sm text-muted-foreground">
								Selecione o turno que será fechado.
							</p>
						) : resumoQuery.isLoading ? (
							<div className="space-y-2 py-2">
								{Array.from({ length: 3 }).map((_, i) => (
									<div
										key={i.toString()}
										className="h-8 animate-pulse rounded bg-muted"
									/>
								))}
							</div>
						) : resumoQuery.isError || !resumo ? (
							<div className="flex flex-col items-center gap-3 py-2 text-center">
								<p className="text-sm text-destructive">
									{resumoQuery.error instanceof Error
										? resumoQuery.error.message
										: "Não foi possível carregar o resumo do turno."}
								</p>
								<Button
									variant="outline"
									size="sm"
									onClick={() => void resumoQuery.refetch()}
								>
									Tentar novamente
								</Button>
							</div>
						) : (
							<>
								<div className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
									<div className="flex justify-between">
										<span className="text-muted-foreground">
											Suprimento inicial (dinheiro)
										</span>
										<span className="font-medium">
											{formatCurrency(resumo.suprimento.toFixed(2))}
										</span>
									</div>
									<div className="flex justify-between border-t pt-2">
										<span className="font-medium">Total vendido no turno</span>
										<span className="font-semibold">
											{formatCurrency(resumo.saldoapurado.toFixed(2))}
											<span className="ml-1 text-xs font-normal text-muted-foreground">
												({resumo.qtdVendas}{" "}
												{resumo.qtdVendas === 1 ? "venda" : "vendas"})
											</span>
										</span>
									</div>
									<div className="space-y-1 border-t pt-2 pl-2">
										<div className="flex justify-between">
											<span className="text-muted-foreground">
												Dinheiro (líquido)
											</span>
											<span>
												{formatCurrency(resumo.pagamentos.dinheiro.toFixed(2))}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-muted-foreground">Cartão</span>
											<span>
												{formatCurrency(resumo.pagamentos.cartao.toFixed(2))}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-muted-foreground">PIX</span>
											<span>
												{formatCurrency(resumo.pagamentos.pix.toFixed(2))}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-muted-foreground">Pré-pago</span>
											<span>
												{formatCurrency(resumo.pagamentos.prepago.toFixed(2))}
											</span>
										</div>
									</div>
									<div className="flex justify-between border-t pt-2">
										<span className="font-medium">
											Saldo em dinheiro (gaveta)
										</span>
										<span className="font-semibold text-primary">
											{formatCurrency(resumo.saldoCaixaFisico.toFixed(2))}
										</span>
									</div>
								</div>

								<Field>
									<FieldLabel>Saldo informado (contagem física)</FieldLabel>
									<FieldGroup>
										<MoneyInput
											value={saldoinformado}
											onChange={setSaldoinformado}
											placeholder="R$ 0,00"
											autoFocus
										/>
									</FieldGroup>
								</Field>

								{saldoinformado ? (
									<div className="space-y-1 rounded-lg border p-3 text-sm">
										<p className="text-xs text-muted-foreground">
											Conferência da gaveta (informado × esperado em dinheiro)
										</p>
										{diferenca === 0 ? (
											<p className="font-medium text-green-600">
												Caixa conferido — sem diferença
											</p>
										) : sobra > 0 ? (
											<p className="font-medium text-amber-600">
												Sobra: {formatCurrency(sobra.toFixed(2))}
											</p>
										) : (
											<p className="font-medium text-destructive">
												Falta: {formatCurrency(falta.toFixed(2))}
											</p>
										)}
									</div>
								) : null}

								<Field>
									<FieldLabel>Observação (opcional)</FieldLabel>
									<FieldGroup>
										<Textarea
											value={observacao}
											onChange={(e) => setObservacao(e.target.value)}
											placeholder="Observações sobre o fechamento..."
											rows={2}
										/>
									</FieldGroup>
								</Field>
							</>
						)}
					</div>
				)}

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={fechando}
					>
						Cancelar
					</Button>
					<Button
						onClick={() => void handleConfirmar()}
						disabled={
							fechando ||
							abertosQuery.isLoading ||
							!turno ||
							!resumo ||
							resumoQuery.isLoading
						}
					>
						{fechando ? "Fechando..." : "Confirmar fechamento"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
