"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Percent } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ModalHistoricoComposicao } from "@/components/composicao-preco/modal-historico-composicao";
import type {
	BasePrecoComposicao,
	EstadoComposicaoPreco,
	ResumoComposicaoPreco,
} from "@/components/composicao-preco/tipos";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { custoProdutoService } from "@/services/custo-produto.service";
import {
	calcularComposicaoPreco,
	formatarNumeroComposicao,
	parseNumeroComposicao,
} from "@/util/calcular-composicao-preco";

type CampoPercentualProps = {
	id: string;
	label: string;
	value: string;
	onChange: (valor: string) => void;
	disabled?: boolean;
	readOnly?: boolean;
};

type CampoMoedaProps = {
	id: string;
	label: string;
	value: string;
	onChange?: (valor: string) => void;
	readOnly?: boolean;
};

const CAMPO_LINHA_GRID =
	"grid grid-cols-[minmax(0,1fr)_10rem] items-center gap-2";
const CAMPO_INPUT_CLASS = "h-8 w-full text-right tabular-nums";

function CampoPercentual({
	id,
	label,
	value,
	onChange,
	disabled,
	readOnly,
}: CampoPercentualProps) {
	return (
		<div className={CAMPO_LINHA_GRID}>
			<Label htmlFor={id} className="text-xs text-muted-foreground">
				{label}
			</Label>
			<div className="relative w-full">
				<Input
					id={id}
					type="text"
					inputMode="decimal"
					value={value}
					onChange={(event) => onChange?.(event.target.value)}
					disabled={disabled}
					readOnly={readOnly}
					className={`${CAMPO_INPUT_CLASS} pr-7`}
				/>
				<Percent className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
			</div>
		</div>
	);
}

function CampoMoeda({ id, label, value, onChange, readOnly }: CampoMoedaProps) {
	return (
		<div className={CAMPO_LINHA_GRID}>
			<Label htmlFor={id} className="text-xs text-muted-foreground">
				{label}
			</Label>
			{readOnly || !onChange ? (
				<Input
					id={id}
					readOnly
					value={formatarNumeroComposicao(parseNumeroComposicao(value))}
					className={CAMPO_INPUT_CLASS}
				/>
			) : (
				<MoneyInput
					id={id}
					value={value}
					onChange={onChange}
					className={CAMPO_INPUT_CLASS}
				/>
			)}
		</div>
	);
}

function CampoLeitura({ label, valor }: { label: string; valor: string }) {
	return (
		<div className="space-y-0.5">
			<p className="text-xs text-muted-foreground">{label}</p>
			<p className="text-sm font-medium tabular-nums">{valor}</p>
		</div>
	);
}

function formatarMoeda(valor: string | number | null | undefined): string {
	const numero = parseNumeroComposicao(valor);
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(numero);
}

function formatarDataHistorico(data: string | null | undefined): string {
	if (!data) return "—";
	return new Date(data).toLocaleDateString("pt-BR");
}

export type ModalComposicaoPrecoProps = {
	aberto: boolean;
	onAbertoChange: (aberto: boolean) => void;
	nomeProduto: string;
	idproduto?: string | null;
	origemCusto: string;
	basesPreco: BasePrecoComposicao[];
	precoVendaAtual: string | number | null | undefined;
	estadoInicial: EstadoComposicaoPreco;
	temST: boolean;
	valorIpi?: string | number | null;
	custoUltimaCompraFallback?: string | number | null;
	resumo?: ResumoComposicaoPreco;
	resetKey?: string;
	onAplicar: (
		novoPreco: string,
		estado: EstadoComposicaoPreco,
	) => Promise<void>;
};

export function ModalComposicaoPreco({
	aberto,
	onAbertoChange,
	nomeProduto,
	idproduto,
	origemCusto,
	basesPreco,
	precoVendaAtual,
	estadoInicial,
	temST,
	valorIpi,
	custoUltimaCompraFallback,
	resumo,
	resetKey,
	onAplicar,
}: ModalComposicaoPrecoProps) {
	const [estado, setEstado] = useState<EstadoComposicaoPreco>(estadoInicial);
	const [historicoAberto, setHistoricoAberto] = useState(false);
	const estadoInicialRef = useRef(estadoInicial);
	estadoInicialRef.current = estadoInicial;

	const { data: ultimaComposicaoData } = useQuery({
		queryKey: ["ultima-composicao-produto", idproduto],
		queryFn: () =>
			custoProdutoService.listarHistoricoComposicao({
				idproduto: idproduto ?? "",
				page: 1,
				limit: 1,
			}),
		enabled: aberto && !!idproduto,
	});

	const ultimaComposicao = ultimaComposicaoData?.data[0];

	useEffect(() => {
		if (aberto) {
			setEstado(estadoInicialRef.current);
		}
	}, [aberto, resetKey]);

	const precoBase = useMemo(() => {
		const base =
			basesPreco.find((item) => item.id === estado.basePrecoId) ??
			basesPreco[0];
		return parseNumeroComposicao(base?.valor);
	}, [basesPreco, estado.basePrecoId]);

	const precoVendaAtualNumero = parseNumeroComposicao(precoVendaAtual);

	const resultados = useMemo(
		() =>
			calcularComposicaoPreco({
				precoBase,
				temST,
				rebaixa: parseNumeroComposicao(estado.rebaixa),
				desconto: parseNumeroComposicao(estado.desconto),
				icmsDesonerado: parseNumeroComposicao(estado.icmsDesonerado),
				freteSeguroDespesas: parseNumeroComposicao(estado.freteSeguroDespesas),
				freteConhecimento: parseNumeroComposicao(estado.freteConhecimento),
				vendor: parseNumeroComposicao(estado.vendor),
				icmsst: parseNumeroComposicao(estado.icmsst),
				fcpst: parseNumeroComposicao(estado.fcpst),
				baseIpi: parseNumeroComposicao(estado.baseIpi),
				percentualIpi: parseNumeroComposicao(estado.percentualIpi),
				valorIpi: parseNumeroComposicao(valorIpi),
				percentualCustoAdicional: parseNumeroComposicao(
					estado.percentualCustoAdicional,
				),
				percentualDiferencialIcms: parseNumeroComposicao(
					estado.percentualDiferencialIcms,
				),
				lancamentosSpedDebito: parseNumeroComposicao(
					estado.lancamentosSpedDebito,
				),
				percentualIcmsCredito: parseNumeroComposicao(
					estado.percentualIcmsCredito,
				),
				percentualReducaoIcms: parseNumeroComposicao(
					estado.percentualReducaoIcms,
				),
				percentualDiferido: parseNumeroComposicao(estado.percentualDiferido),
				pisCofinsConhecimento: parseNumeroComposicao(
					estado.pisCofinsConhecimento,
				),
				lancamentosSpedCredito: parseNumeroComposicao(
					estado.lancamentosSpedCredito,
				),
				margemMinimo: parseNumeroComposicao(estado.margemMinimo),
				margemMaximo: parseNumeroComposicao(estado.margemMaximo),
				precoVendaAtual: precoVendaAtualNumero,
				percentualIcmsSaida: parseNumeroComposicao(estado.percentualIcmsSaida),
				percentualReducaoIcmsSaida: parseNumeroComposicao(
					estado.percentualReducaoIcmsSaida,
				),
				percentualCustoVariavel: parseNumeroComposicao(
					estado.percentualCustoVariavel,
				),
				percentualOutrasDespesas: parseNumeroComposicao(
					estado.percentualOutrasDespesas,
				),
				percentualOutrosImpostos: parseNumeroComposicao(
					estado.percentualOutrosImpostos,
				),
				percentualComissao: parseNumeroComposicao(estado.percentualComissao),
				percentualNovoLucro: parseNumeroComposicao(estado.percentualNovoLucro),
			}),
		[estado, precoBase, precoVendaAtualNumero, temST, valorIpi],
	);

	const atualizarCampo = useCallback(
		<K extends keyof EstadoComposicaoPreco>(
			campo: K,
			valor: EstadoComposicaoPreco[K],
		) => {
			setEstado((atual) => ({ ...atual, [campo]: valor }));
		},
		[],
	);

	const { mutate: aplicarPreco, isPending } = useMutation({
		mutationFn: () => onAplicar(resultados.novoPreco.toFixed(2), estado),
		onSuccess: () => {
			toast.success("Preço aplicado com sucesso");
			onAbertoChange(false);
		},
		onError: (error: Error) => toast.error(error.message),
	});

	const handleAplicarPreco = useCallback(() => {
		if (resultados.novoPreco <= 0) {
			toast.error("O novo preço calculado deve ser maior que zero");
			return;
		}
		aplicarPreco();
	}, [aplicarPreco, resultados.novoPreco]);

	const handleAbrirHistorico = useCallback(() => {
		if (!idproduto) {
			toast.error("Vincule um produto para consultar o histórico");
			return;
		}
		setHistoricoAberto(true);
	}, [idproduto]);

	useEffect(() => {
		if (!aberto) return;

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "F10") {
				event.preventDefault();
				handleAplicarPreco();
			}
			if (event.key === "F6") {
				event.preventDefault();
				toast.info("Em breve");
			}
			if (event.key === "F3") {
				event.preventDefault();
				handleAbrirHistorico();
			}
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [aberto, handleAbrirHistorico, handleAplicarPreco]);

	const baseSelecionadaId =
		basesPreco.some((base) => base.id === estado.basePrecoId) &&
		estado.basePrecoId
			? estado.basePrecoId
			: (basesPreco[0]?.id ?? "");

	return (
		<>
			<Dialog open={aberto} onOpenChange={onAbertoChange}>
				<DialogContent className="flex max-h-[95vh] max-w-6xl flex-col gap-0 overflow-hidden p-0">
					<DialogHeader className="space-y-2 border-b px-6 py-4">
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div className="space-y-1">
								<DialogTitle className="text-lg">{nomeProduto}</DialogTitle>
								{resumo ? (
									<div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
										{resumo.quantidade != null ? (
											<span>Qtd: {resumo.quantidade}</span>
										) : null}
										{resumo.fator != null ? (
											<span>Fator: {resumo.fator}</span>
										) : null}
										{resumo.totalItem != null ? (
											<span>Total: {formatarMoeda(resumo.totalItem)}</span>
										) : null}
									</div>
								) : null}
							</div>
							{temST ? (
								<Badge variant="secondary">Substituição tributária</Badge>
							) : null}
						</div>
					</DialogHeader>

					<div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
						{resultados.margemForaIntervalo ? (
							<Alert variant="destructive">
								<AlertDescription>
									{resultados.margemForaIntervalo === "acima"
										? "Margem acima do máximo!"
										: "Margem abaixo do mínimo!"}
								</AlertDescription>
							</Alert>
						) : null}

						<section className="grid gap-3 rounded-lg border bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-3">
							<CampoLeitura label="Origem do custo" valor={origemCusto} />
							<CampoLeitura
								label="Última composição"
								valor={formatarDataHistorico(ultimaComposicao?.datahora)}
							/>
							<CampoLeitura
								label="Última compra"
								valor={formatarDataHistorico(
									ultimaComposicao?.datahoraemissao ??
										(ultimaComposicao?.origem === 0
											? ultimaComposicao?.datahora
											: null),
								)}
							/>
							<CampoLeitura
								label="Custo última compra"
								valor={formatarMoeda(
									ultimaComposicao?.precocompra ?? custoUltimaCompraFallback,
								)}
							/>
							<CampoLeitura
								label="Custo médio"
								valor={formatarMoeda(ultimaComposicao?.customedio)}
							/>
							<CampoLeitura
								label="Preço de venda atual"
								valor={formatarMoeda(precoVendaAtual)}
							/>
						</section>

						<div className="grid gap-4 lg:grid-cols-2">
							<section className="space-y-3 rounded-lg border p-4">
								<h3 className="text-sm font-semibold">Custo</h3>
								<div className="space-y-2">
									<div className={CAMPO_LINHA_GRID}>
										<Label className="text-xs text-muted-foreground">
											Preço de compra
										</Label>
										{basesPreco.length > 1 ? (
											<Select
												value={baseSelecionadaId}
												onValueChange={(valor) =>
													atualizarCampo("basePrecoId", valor)
												}
											>
												<SelectTrigger className="h-8 w-full truncate px-2 text-left text-xs">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{basesPreco.map((base) => (
														<SelectItem key={base.id} value={base.id}>
															{base.label} ({formatarMoeda(base.valor)})
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										) : (
											<Input
												readOnly
												value={formatarMoeda(basesPreco[0]?.valor)}
												className={CAMPO_INPUT_CLASS}
											/>
										)}
									</div>

									<CampoMoeda
										id="rebaixa"
										label="Rebaixa"
										value={estado.rebaixa}
										onChange={(valor) => atualizarCampo("rebaixa", valor)}
									/>
									<CampoMoeda
										id="desconto"
										label="Desconto"
										value={estado.desconto}
										onChange={(valor) => atualizarCampo("desconto", valor)}
									/>
									<CampoMoeda
										id="icmsDesonerado"
										label="ICMS desonerado"
										value={estado.icmsDesonerado}
										onChange={(valor) =>
											atualizarCampo("icmsDesonerado", valor)
										}
									/>
									<CampoMoeda
										id="freteSeguroDespesas"
										label="Frete + seguro + outras despesas"
										value={estado.freteSeguroDespesas}
										onChange={(valor) =>
											atualizarCampo("freteSeguroDespesas", valor)
										}
									/>
									<CampoMoeda
										id="freteConhecimento"
										label="Frete de conhecimento"
										value={estado.freteConhecimento}
										onChange={(valor) =>
											atualizarCampo("freteConhecimento", valor)
										}
									/>
									<CampoMoeda
										id="vendor"
										label="Vendor"
										value={estado.vendor}
										onChange={(valor) => atualizarCampo("vendor", valor)}
									/>
									<CampoMoeda
										id="icmsst"
										label="ICMS ST"
										value={estado.icmsst}
										onChange={(valor) => atualizarCampo("icmsst", valor)}
									/>
									<CampoMoeda
										id="fcpst"
										label="FCP ST"
										value={estado.fcpst}
										onChange={(valor) => atualizarCampo("fcpst", valor)}
									/>
									<CampoMoeda
										id="baseIpi"
										label="Base IPI"
										value={estado.baseIpi}
										onChange={(valor) => atualizarCampo("baseIpi", valor)}
									/>
									<CampoPercentual
										id="percentualIpi"
										label="IPI %"
										value={estado.percentualIpi}
										onChange={(valor) => atualizarCampo("percentualIpi", valor)}
									/>
									<CampoPercentual
										id="percentualCustoAdicional"
										label="% Custo adicional"
										value={estado.percentualCustoAdicional}
										onChange={(valor) =>
											atualizarCampo("percentualCustoAdicional", valor)
										}
									/>
									<CampoPercentual
										id="percentualDiferencialIcms"
										label="% Diferencial ICMS"
										value={estado.percentualDiferencialIcms}
										onChange={(valor) =>
											atualizarCampo("percentualDiferencialIcms", valor)
										}
										disabled={temST}
									/>
									<CampoMoeda
										id="lancamentosSpedDebito"
										label="Lançamentos SPED Débito"
										value={estado.lancamentosSpedDebito}
										onChange={(valor) =>
											atualizarCampo("lancamentosSpedDebito", valor)
										}
									/>

									<Separator />

									<CampoMoeda
										id="custoAquisicao"
										label="Custo de aquisição"
										value={resultados.custoAquisicao.toFixed(2)}
										readOnly
									/>

									<CampoPercentual
										id="percentualIcmsCredito"
										label="% ICMS + FCP"
										value={estado.percentualIcmsCredito}
										onChange={(valor) =>
											atualizarCampo("percentualIcmsCredito", valor)
										}
									/>
									<CampoPercentual
										id="percentualReducaoIcms"
										label="% Redução"
										value={estado.percentualReducaoIcms}
										onChange={(valor) =>
											atualizarCampo("percentualReducaoIcms", valor)
										}
									/>
									<CampoPercentual
										id="percentualDiferido"
										label="% Diferido"
										value={estado.percentualDiferido}
										onChange={(valor) =>
											atualizarCampo("percentualDiferido", valor)
										}
									/>
									<CampoMoeda
										id="pisCofinsConhecimento"
										label="ICMS/PIS/COFINS de conhecimento"
										value={estado.pisCofinsConhecimento}
										onChange={(valor) =>
											atualizarCampo("pisCofinsConhecimento", valor)
										}
									/>
									<CampoMoeda
										id="lancamentosSpedCredito"
										label="Lançamentos SPED Crédito"
										value={estado.lancamentosSpedCredito}
										onChange={(valor) =>
											atualizarCampo("lancamentosSpedCredito", valor)
										}
									/>

									<Separator />

									<CampoMoeda
										id="custoCompra"
										label="Custo da compra"
										value={resultados.custoCompra.toFixed(2)}
										readOnly
									/>
								</div>
							</section>

							<section className="space-y-3 rounded-lg border p-4">
								<h3 className="text-sm font-semibold">Preço</h3>
								<div className="space-y-2">
									<CampoPercentual
										id="margemMinimo"
										label="% Margem mínimo"
										value={estado.margemMinimo}
										onChange={(valor) => atualizarCampo("margemMinimo", valor)}
									/>
									<CampoPercentual
										id="margemMaximo"
										label="% Margem máximo"
										value={estado.margemMaximo}
										onChange={(valor) => atualizarCampo("margemMaximo", valor)}
									/>
									<CampoPercentual
										id="margemAtual"
										label="% Margem atual"
										value={formatarNumeroComposicao(resultados.margemAtual)}
										onChange={() => {}}
										readOnly
									/>
									<CampoPercentual
										id="percentualIcmsSaida"
										label="% ICMS de saída + FCP"
										value={estado.percentualIcmsSaida}
										onChange={(valor) =>
											atualizarCampo("percentualIcmsSaida", valor)
										}
									/>
									<CampoPercentual
										id="percentualReducaoIcmsSaida"
										label="% Redução ICMS"
										value={estado.percentualReducaoIcmsSaida}
										onChange={(valor) =>
											atualizarCampo("percentualReducaoIcmsSaida", valor)
										}
									/>
									<CampoPercentual
										id="percentualCustoVariavel"
										label="% Custo variável indireto"
										value={estado.percentualCustoVariavel}
										onChange={(valor) =>
											atualizarCampo("percentualCustoVariavel", valor)
										}
									/>
									<CampoPercentual
										id="percentualOutrasDespesas"
										label="% Outras despesas variáveis"
										value={estado.percentualOutrasDespesas}
										onChange={(valor) =>
											atualizarCampo("percentualOutrasDespesas", valor)
										}
									/>
									<CampoPercentual
										id="percentualOutrosImpostos"
										label="% Outros impostos"
										value={estado.percentualOutrosImpostos}
										onChange={(valor) =>
											atualizarCampo("percentualOutrosImpostos", valor)
										}
									/>
									<CampoPercentual
										id="percentualComissao"
										label="% Comissão"
										value={estado.percentualComissao}
										onChange={(valor) =>
											atualizarCampo("percentualComissao", valor)
										}
									/>

									<Separator />

									<CampoMoeda
										id="cmv"
										label="Custo da mercadoria vendida"
										value={resultados.cmv.toFixed(2)}
										readOnly
									/>
									<CampoPercentual
										id="percentualNovoLucro"
										label="Novo % Lucro"
										value={estado.percentualNovoLucro}
										onChange={(valor) =>
											atualizarCampo("percentualNovoLucro", valor)
										}
									/>
									<CampoMoeda
										id="novoPreco"
										label="Novo preço"
										value={resultados.novoPreco.toFixed(2)}
										readOnly
									/>
									<CampoMoeda
										id="pontoEquilibrio"
										label="Ponto de equilíbrio"
										value={resultados.pontoEquilibrio.toFixed(2)}
										readOnly
									/>
									<CampoPercentual
										id="percentualDesconto"
										label="% Desconto"
										value={formatarNumeroComposicao(
											resultados.percentualDesconto,
										)}
										onChange={() => {}}
										readOnly
									/>
									<CampoPercentual
										id="percentualMargemPrecoMinimo"
										label="% Margem p/ preço mínimo"
										value={formatarNumeroComposicao(
											resultados.percentualMargemPrecoMinimo,
										)}
										onChange={() => {}}
										readOnly
									/>
								</div>
							</section>
						</div>
					</div>

					<DialogFooter className="flex-col gap-2 border-t px-6 py-4 sm:flex-row sm:justify-between">
						<div className="flex flex-wrap gap-2">
							<Button
								type="button"
								variant="secondary"
								disabled={isPending}
								onClick={() => toast.info("Em breve")}
							>
								Precificar pautas (F6)
							</Button>
							<Button
								type="button"
								variant="secondary"
								disabled={isPending || !idproduto}
								title={
									!idproduto
										? "Vincule um produto para consultar o histórico"
										: undefined
								}
								onClick={handleAbrirHistorico}
							>
								Histórico do produto (F3)
							</Button>
						</div>
						<div className="flex flex-wrap gap-2">
							<Button
								type="button"
								variant="outline"
								disabled={isPending}
								onClick={() => onAbertoChange(false)}
							>
								Cancelar
							</Button>
							<Button
								type="button"
								disabled={isPending}
								onClick={handleAplicarPreco}
							>
								{isPending ? "Salvando..." : "Aplicar preço (F10)"}
							</Button>
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			{idproduto ? (
				<ModalHistoricoComposicao
					idproduto={idproduto}
					nomeProduto={nomeProduto}
					aberto={historicoAberto}
					onAbertoChange={setHistoricoAberto}
				/>
			) : null}
		</>
	);
}
