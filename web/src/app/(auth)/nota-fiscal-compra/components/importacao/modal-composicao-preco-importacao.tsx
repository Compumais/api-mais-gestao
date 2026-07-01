"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Percent } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
import {
	type DadosImportacaoItem,
	type NotaFiscalItemImportacao,
	notaFiscalService,
} from "@/services/nota-fiscal.service";
import {
	calcularComposicaoPreco,
	formatarNumeroComposicao,
	parseNumeroComposicao,
	produtoTemSubstituicaoTributaria,
} from "@/util/calcular-composicao-preco";

type ModalComposicaoPrecoImportacaoProps = {
	idempresa: string;
	idRascunho: string;
	item: NotaFiscalItemImportacao;
	aberto: boolean;
	onAbertoChange: (aberto: boolean) => void;
};

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

function montarEstadoInicial(dados: DadosImportacaoItem) {
	const trib = dados.tributacao;
	const rateio = dados.rateio ?? {};
	const freteSeguroDespesas =
		parseNumeroComposicao(rateio.frete) +
		parseNumeroComposicao(rateio.seguro) +
		parseNumeroComposicao(rateio.outras);

	return {
		basePreco: "precounitarioEstoque" as const,
		rebaixa: "0",
		desconto: rateio.desconto ?? "0",
		icmsDesonerado: "0",
		freteSeguroDespesas: freteSeguroDespesas.toFixed(2),
		freteConhecimento: "0",
		vendor: "0",
		icmsst: trib.icmsst ?? "0",
		fcpst: trib.fcpst ?? "0",
		baseIpi: "0",
		percentualIpi: "0",
		percentualCustoAdicional: "0",
		percentualDiferencialIcms: trib.percentualdifericms ?? "0",
		lancamentosSpedDebito: "0",
		percentualIcmsCredito: trib.percentualicms ?? "0",
		percentualReducaoIcms: "0",
		percentualDiferido: "0",
		pisCofinsConhecimento: "0",
		lancamentosSpedCredito: "0",
		margemMinimo: "0",
		margemMaximo: "0",
		percentualIcmsSaida: trib.percentualicms ?? "0",
		percentualReducaoIcmsSaida: "0",
		percentualCustoVariavel: "0",
		percentualOutrasDespesas: "0",
		percentualOutrosImpostos: "0",
		percentualComissao: "0",
		percentualNovoLucro: "0",
	};
}

function formatarMoeda(valor: string | number | null | undefined): string {
	const numero = parseNumeroComposicao(valor);
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(numero);
}

export function ModalComposicaoPrecoImportacao({
	idempresa,
	idRascunho,
	item,
	aberto,
	onAbertoChange,
}: ModalComposicaoPrecoImportacaoProps) {
	const queryClient = useQueryClient();
	const dados = item.dadosimportacao;

	const [estado, setEstado] = useState(() =>
		dados
			? montarEstadoInicial(dados)
			: montarEstadoInicial({} as DadosImportacaoItem),
	);

	useEffect(() => {
		if (aberto && dados) {
			setEstado(montarEstadoInicial(dados));
		}
	}, [aberto, dados, item.id]);

	const temST = dados
		? produtoTemSubstituicaoTributaria(dados.tributacao)
		: false;

	const precoBase = useMemo(() => {
		if (!dados) return 0;
		if (estado.basePreco === "precounitarioEstoque") {
			return parseNumeroComposicao(dados.precounitarioEstoque);
		}
		return parseNumeroComposicao(dados.precounitarioXml);
	}, [dados, estado.basePreco]);

	const precoVendaAtual = parseNumeroComposicao(dados?.precoVenda);

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
				valorIpi: parseNumeroComposicao(dados?.tributacao.ipi),
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
				precoVendaAtual,
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
		[dados?.tributacao.ipi, estado, precoBase, precoVendaAtual, temST],
	);

	const atualizarCampo = useCallback(
		<K extends keyof ReturnType<typeof montarEstadoInicial>>(
			campo: K,
			valor: ReturnType<typeof montarEstadoInicial>[K],
		) => {
			setEstado((atual) => ({ ...atual, [campo]: valor }));
		},
		[],
	);

	const { mutate: aplicarPreco, isPending } = useMutation({
		mutationFn: () =>
			notaFiscalService.atualizarItemRascunhoImportacao(idRascunho, item.id, {
				idempresa,
				precoVenda: resultados.novoPreco.toFixed(2),
				tributacao: {
					...dados?.tributacao,
					percentualdifericms: estado.percentualDiferencialIcms,
				},
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["rascunho-importacao-nf", idRascunho],
			});
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
				toast.info("Em breve");
			}
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [aberto, handleAplicarPreco]);

	if (!dados) {
		return null;
	}

	const nomeProduto =
		dados.produtoEncontrado?.nome ??
		dados.descricaoFornecedor ??
		item.descricao ??
		"Produto";

	const quantidade =
		dados.quantidadeEstoque ?? dados.quantidadeXml ?? item.quantidade;
	const fator = dados.fatorConversao ?? "1";
	const totalItem = item.total;

	return (
		<Dialog open={aberto} onOpenChange={onAbertoChange}>
			<DialogContent className="flex max-h-[95vh] max-w-6xl flex-col gap-0 overflow-hidden p-0">
				<DialogHeader className="space-y-2 border-b px-6 py-4">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div className="space-y-1">
							<DialogTitle className="text-lg">{nomeProduto}</DialogTitle>
							<div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
								<span>Qtd: {quantidade}</span>
								<span>Fator: {fator}</span>
								<span>Total: {formatarMoeda(totalItem)}</span>
							</div>
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
						<CampoLeitura
							label="Origem do custo"
							valor="Nota fiscal de compra"
						/>
						<CampoLeitura label="Última composição" valor="—" />
						<CampoLeitura label="Última compra" valor="—" />
						<CampoLeitura
							label="Custo última compra"
							valor={formatarMoeda(dados.precounitarioEstoque)}
						/>
						<CampoLeitura label="Custo médio" valor="—" />
						<CampoLeitura
							label="Preço de venda atual"
							valor={formatarMoeda(dados.precoVenda)}
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
									<Select
										value={estado.basePreco}
										onValueChange={(valor) =>
											atualizarCampo(
												"basePreco",
												valor as "precounitarioEstoque",
											)
										}
									>
										<SelectTrigger className="h-8 w-full truncate px-2 text-left text-xs">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="precounitarioEstoque">
												Preço estoque (
												{formatarMoeda(dados.precounitarioEstoque)})
											</SelectItem>
											<SelectItem value="precounitarioXml">
												Preço XML ({formatarMoeda(dados.precounitarioXml)})
											</SelectItem>
										</SelectContent>
									</Select>
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
									onChange={(valor) => atualizarCampo("icmsDesonerado", valor)}
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
							disabled={isPending}
							onClick={() => toast.info("Em breve")}
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
	);
}
