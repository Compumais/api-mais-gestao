"use client";

import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
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
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { hojeBrasiliaIsoDate } from "@/lib/date";
import type { ContaCorrenteListItem } from "@/services/contas-correntes.service";
import type { Financeiro } from "@/services/financeiro.service";
import type { MetodoPagamentoBaixa } from "@/services/financeiro-lancamento.service";
import type { TipoDocumentoFinanceiro } from "@/services/tipo-documento-financeiro.service";

export type DadosConfirmacaoBaixa = {
	dataBaixa: string;
	dataPagamento: string;
	valor: string;
	juros: string;
	multa: string;
	desconto: string;
	historico: string;
	pagamentos: MetodoPagamentoBaixa[];
	meioLote?: string;
	contaLote?: string;
};

type LinhaPagamento = {
	id: string;
	metodo: string;
	conta: string;
	valor: string;
};

type ModalBaixaFinanceiroProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	titulos: Financeiro[];
	contas: ContaCorrenteListItem[];
	meiosPagamento: TipoDocumentoFinanceiro[];
	onConfirm: (dados: DadosConfirmacaoBaixa) => void;
	isPending?: boolean;
};

function formatarMoeda(valor: number) {
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(valor);
}

function parseMoedaInput(valor: string) {
	const normalizado = valor.replace(",", ".").replace(/[^\d.-]/g, "");
	const numero = Number.parseFloat(normalizado);
	return Number.isFinite(numero) ? numero : 0;
}

function arredondar(valor: number) {
	return Math.round(valor * 100) / 100;
}

function novaLinha(valor = "", conta = "", metodo = ""): LinhaPagamento {
	return {
		id: crypto.randomUUID(),
		metodo,
		conta,
		valor,
	};
}

export function ModalBaixaFinanceiro({
	open,
	onOpenChange,
	titulos,
	contas,
	meiosPagamento,
	onConfirm,
	isPending = false,
}: ModalBaixaFinanceiroProps) {
	const modoLote = titulos.length > 1;
	const tituloUnico = titulos.length === 1 ? titulos[0] : null;

	const saldoAberto = useMemo(() => {
		if (tituloUnico) {
			return Number.parseFloat(tituloUnico.saldo || "0") || 0;
		}
		return titulos.reduce(
			(acc, titulo) => acc + (Number.parseFloat(titulo.saldo || "0") || 0),
			0,
		);
	}, [tituloUnico, titulos]);

	const [dataBaixa, setDataBaixa] = useState(hojeBrasiliaIsoDate);
	const [dataPagamento, setDataPagamento] = useState(hojeBrasiliaIsoDate);
	const [juros, setJuros] = useState("0");
	const [multa, setMulta] = useState("0");
	const [desconto, setDesconto] = useState("0");
	const [historico, setHistorico] = useState("");
	const [linhas, setLinhas] = useState<LinhaPagamento[]>([novaLinha()]);
	const [meioLote, setMeioLote] = useState("");
	const [contaLote, setContaLote] = useState("");

	useEffect(() => {
		if (!open) return;
		const hoje = hojeBrasiliaIsoDate();
		setDataBaixa(hoje);
		setDataPagamento(hoje);
		setJuros("0");
		setMulta("0");
		setDesconto("0");
		setHistorico("");
		setMeioLote("");
		setContaLote("");
		setLinhas([
			novaLinha(
				saldoAberto.toFixed(2),
				contas[0]?.id ?? "",
				meiosPagamento[0]?.id ?? "",
			),
		]);
		// Reset só ao abrir / mudar saldo do título; contas/meios preenchem default na abertura.
		// eslint-disable-next-line react-hooks/exhaustive-deps -- evita reset ao refetch das listas
	}, [open, saldoAberto]);

	const somaLinhas = useMemo(
		() => arredondar(linhas.reduce((acc, linha) => acc + parseMoedaInput(linha.valor), 0)),
		[linhas],
	);

	const restanteParaSaldo = arredondar(saldoAberto - somaLinhas);

	const adicionarLinha = () => {
		const contaPadrao = contas[0]?.id ?? "";
		const meioPadrao = meiosPagamento[0]?.id ?? "";
		const restante = Math.max(0, restanteParaSaldo);
		setLinhas((prev) => [
			...prev,
			novaLinha(restante > 0 ? restante.toFixed(2) : "", contaPadrao, meioPadrao),
		]);
	};

	const podeConfirmar = Boolean(
		dataBaixa &&
			dataPagamento &&
			titulos.length > 0 &&
			(modoLote
				? meioLote && contaLote
				: somaLinhas > 0 &&
					somaLinhas <= saldoAberto + 0.009 &&
					linhas.every(
						(l) => l.metodo && l.conta && parseMoedaInput(l.valor) > 0,
					)),
	);

	const handleConfirm = () => {
		if (!podeConfirmar) return;

		if (modoLote) {
			const meioDescricao =
				meiosPagamento.find((m) => m.id === meioLote)?.descricao ?? meioLote;
			onConfirm({
				dataBaixa,
				dataPagamento,
				valor: saldoAberto.toFixed(2),
				juros: "0",
				multa: "0",
				desconto: "0",
				historico,
				pagamentos: [],
				meioLote: meioDescricao,
				contaLote,
			});
			return;
		}

		onConfirm({
			dataBaixa,
			dataPagamento,
			valor: somaLinhas.toFixed(2),
			juros: parseMoedaInput(juros).toFixed(2),
			multa: parseMoedaInput(multa).toFixed(2),
			desconto: parseMoedaInput(desconto).toFixed(2),
			historico,
			pagamentos: linhas.map((linha) => ({
				valor: parseMoedaInput(linha.valor).toFixed(2),
				metodo:
					meiosPagamento.find((m) => m.id === linha.metodo)?.descricao ??
					linha.metodo,
				conta: linha.conta,
			})),
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>Dar baixa</DialogTitle>
					<DialogDescription>
						{modoLote
							? `Quitação total de ${titulos.length} títulos (mesmo meio e conta). Saldo total: ${formatarMoeda(saldoAberto)}.`
							: `Use um ou mais meios de pagamento. O valor da baixa é a soma das linhas. Saldo: ${formatarMoeda(saldoAberto)}.`}
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 py-2">
					<div className="grid grid-cols-2 gap-3">
						<div className="grid gap-2">
							<Label htmlFor="data-pagamento">Data pagamento</Label>
							<Input
								id="data-pagamento"
								type="date"
								value={dataPagamento}
								onChange={(e) => setDataPagamento(e.target.value)}
								disabled={isPending}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="data-baixa">Data baixa</Label>
							<Input
								id="data-baixa"
								type="date"
								value={dataBaixa}
								onChange={(e) => setDataBaixa(e.target.value)}
								disabled={isPending}
							/>
						</div>
					</div>

					{modoLote ? (
						<>
							<div className="grid gap-2">
								<Label>Meio de pagamento</Label>
								<Select
									value={meioLote}
									onValueChange={setMeioLote}
									disabled={isPending}
								>
									<SelectTrigger>
										<SelectValue placeholder="Selecione" />
									</SelectTrigger>
									<SelectContent>
										{meiosPagamento.map((meio) => (
											<SelectItem key={meio.id} value={meio.id}>
												{meio.descricao}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="grid gap-2">
								<Label>Conta corrente</Label>
								<Select
									value={contaLote}
									onValueChange={setContaLote}
									disabled={isPending}
								>
									<SelectTrigger>
										<SelectValue placeholder="Selecione" />
									</SelectTrigger>
									<SelectContent>
										{contas.map((conta) => (
											<SelectItem key={conta.id} value={conta.id}>
												{conta.descricao || conta.agencia || conta.id}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</>
					) : (
						<>
							<div className="grid grid-cols-2 gap-3">
								<div className="grid gap-2">
									<Label>Valor da baixa (soma)</Label>
									<Input value={formatarMoeda(somaLinhas)} disabled />
								</div>
								<div className="grid gap-2">
									<Label>Saldo em aberto</Label>
									<Input value={formatarMoeda(saldoAberto)} disabled />
								</div>
							</div>
							<div className="grid grid-cols-3 gap-3">
								<div className="grid gap-2">
									<Label htmlFor="juros-baixa">Juros</Label>
									<Input
										id="juros-baixa"
										value={juros}
										onChange={(e) => setJuros(e.target.value)}
										disabled={isPending}
									/>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="multa-baixa">Multa</Label>
									<Input
										id="multa-baixa"
										value={multa}
										onChange={(e) => setMulta(e.target.value)}
										disabled={isPending}
									/>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="desconto-baixa">Desconto</Label>
									<Input
										id="desconto-baixa"
										value={desconto}
										onChange={(e) => setDesconto(e.target.value)}
										disabled={isPending}
									/>
								</div>
							</div>

							<div className="space-y-3">
								<div className="flex items-center justify-between gap-2">
									<div>
										<Label>Meios de pagamento</Label>
										<p className="text-xs text-muted-foreground">
											Ex.: R$ 50 PIX + R$ 50 cartão no mesmo lançamento.
										</p>
									</div>
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={isPending}
										onClick={adicionarLinha}
									>
										<IconPlus className="size-4 mr-1" />
										Adicionar meio
									</Button>
								</div>
								{linhas.map((linha, index) => (
									<div
										key={linha.id}
										className="grid grid-cols-[1fr_1fr_100px_auto] gap-2 items-end rounded-md border p-2"
									>
										<div className="grid gap-1">
											<Label className="text-xs">Meio {index + 1}</Label>
											<Select
												value={linha.metodo}
												onValueChange={(metodo) =>
													setLinhas((prev) =>
														prev.map((l) =>
															l.id === linha.id ? { ...l, metodo } : l,
														),
													)
												}
												disabled={isPending}
											>
												<SelectTrigger>
													<SelectValue placeholder="Meio" />
												</SelectTrigger>
												<SelectContent>
													{meiosPagamento.map((meio) => (
														<SelectItem key={meio.id} value={meio.id}>
															{meio.descricao}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<div className="grid gap-1">
											<Label className="text-xs">Conta</Label>
											<Select
												value={linha.conta}
												onValueChange={(conta) =>
													setLinhas((prev) =>
														prev.map((l) =>
															l.id === linha.id ? { ...l, conta } : l,
														),
													)
												}
												disabled={isPending}
											>
												<SelectTrigger>
													<SelectValue placeholder="Conta" />
												</SelectTrigger>
												<SelectContent>
													{contas.map((conta) => (
														<SelectItem key={conta.id} value={conta.id}>
															{conta.descricao || conta.agencia || conta.id}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<div className="grid gap-1">
											<Label className="text-xs">Valor</Label>
											<Input
												value={linha.valor}
												onChange={(e) =>
													setLinhas((prev) =>
														prev.map((l) =>
															l.id === linha.id
																? { ...l, valor: e.target.value }
																: l,
														),
													)
												}
												disabled={isPending}
											/>
										</div>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											disabled={isPending || linhas.length <= 1}
											onClick={() =>
												setLinhas((prev) =>
													prev.filter((l) => l.id !== linha.id),
												)
											}
										>
											<IconTrash className="size-4" />
										</Button>
									</div>
								))}
								{restanteParaSaldo < -0.009 && (
									<p className="text-xs text-destructive">
										Soma dos meios ({formatarMoeda(somaLinhas)}) excede o saldo
										({formatarMoeda(saldoAberto)}).
									</p>
								)}
								{restanteParaSaldo > 0.009 && (
									<p className="text-xs text-muted-foreground">
										Restante do saldo: {formatarMoeda(restanteParaSaldo)} (baixa
										parcial).
									</p>
								)}
							</div>
						</>
					)}

					<div className="grid gap-2">
						<Label htmlFor="historico-baixa">Histórico</Label>
						<Textarea
							id="historico-baixa"
							value={historico}
							onChange={(e) => setHistorico(e.target.value)}
							disabled={isPending}
							rows={2}
							placeholder="Opcional — se vazio, usa o resumo dos meios"
						/>
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isPending}
					>
						Cancelar
					</Button>
					<Button
						onClick={handleConfirm}
						disabled={!podeConfirmar || isPending}
					>
						{isPending ? "Processando..." : "Confirmar baixa"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
