"use client";

import { useQuery } from "@tanstack/react-query";
import { Combobox } from "@/components/ui/combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useEmpresa } from "@/hooks/use-empresa";
import { ESCOPO_CONDICAO_PAGAMENTO } from "@/schemas/condicao-pagamento.schema";
import { condicaoPagamentoService } from "@/services/condicao-pagamento.service";
import { localEstoqueService } from "@/services/local-estoque.service";
import { planoContasService } from "@/services/plano-contas.service";
import { tipoDocumentoFinanceiroService } from "@/services/tipo-documento-financeiro.service";

const TIPO_CONTA_RECEITA = 1;

function formatarPlanoContasLabel(codigo: string | null, nome: string | null) {
	const nivel = codigo ? (codigo.match(/\./g) || []).length : 0;
	const prefix = "\u00A0\u00A0".repeat(nivel);
	const texto = `${codigo ? `${codigo} - ` : ""}${nome ?? ""}`.trim();
	return `${prefix}${texto}`;
}

function formatarCondicaoPagamentoLabel(
	codigo: string | null,
	descricao: string | null,
) {
	if (codigo && descricao) return `${codigo} - ${descricao}`;
	return descricao ?? codigo ?? "Sem descrição";
}

export type CamposIntegracaoNfVendaProps = {
	idtipodocumento?: string;
	idcondicaopagto?: string;
	idplanocontas?: string;
	idlocalestoque?: string;
	gerarFinanceiro: boolean;
	gerarEstoque: boolean;
	desabilitado?: boolean;
	mostrarFlagsIntegracao?: boolean;
	variante?: "nf-venda" | "pedido";
	onIdtipodocumentoChange: (value: string) => void;
	onIdcondicaopagtoChange: (value: string) => void;
	onIdplanocontasChange: (value: string) => void;
	onIdlocalestoqueChange: (value: string) => void;
	onGerarFinanceiroChange: (value: boolean) => void;
	onGerarEstoqueChange: (value: boolean) => void;
	onFormaPagamentoNfeSugerida?: (codigo: string) => void;
};

export function CamposIntegracaoNfVenda({
	idtipodocumento,
	idcondicaopagto,
	idplanocontas,
	idlocalestoque,
	gerarFinanceiro,
	gerarEstoque,
	desabilitado = false,
	mostrarFlagsIntegracao = true,
	variante = "nf-venda",
	onIdtipodocumentoChange,
	onIdcondicaopagtoChange,
	onIdplanocontasChange,
	onIdlocalestoqueChange,
	onGerarFinanceiroChange,
	onGerarEstoqueChange,
	onFormaPagamentoNfeSugerida,
}: CamposIntegracaoNfVendaProps) {
	const { localStorageEmpresa: empresa } = useEmpresa();

	const { data: tiposDocumento, isLoading: carregandoTipos } = useQuery({
		queryKey: ["tipos-documento-financeiro", empresa?.id],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return tipoDocumentoFinanceiroService.listarTodos({
				idempresa: empresa.id,
				inativo: 0,
			});
		},
		enabled: !!empresa,
		staleTime: 0,
	});

	const { data: condicoesPagamento, isLoading: carregandoCondicoes } = useQuery({
		queryKey: ["condicoes-pagamento", variante, empresa?.id],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return condicaoPagamentoService.listarTodos({
				idempresa: empresa.id,
				inativo: 0,
			});
		},
		enabled: !!empresa,
		staleTime: 0,
	});

	const { data: planosContas, isLoading: carregandoPlanos } = useQuery({
		queryKey: ["plano-contas", "receitas", empresa?.id],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return planoContasService.listar({
				idempresa: empresa.id,
				page: 1,
				limit: 100,
				listarTudo: true,
				tipomovimento: "E",
			});
		},
		enabled: !!empresa,
	});

	const { data: locaisEstoque, isLoading: carregandoLocais } = useQuery({
		queryKey: ["locais-estoque", empresa?.id],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return localEstoqueService.listar({
				idempresa: empresa.id,
				page: 1,
				limit: 100,
			});
		},
		enabled: !!empresa,
	});

	const tiposAtivos = tiposDocumento?.filter((tipo) => tipo.inativo !== 1) ?? [];

	const tipoSelecionado = tiposAtivos.find((tipo) => tipo.id === idtipodocumento);
	const exigeCondicaoPagamento = tipoSelecionado?.aprazo === 1;

	const condicoesVenda =
		condicoesPagamento?.filter((condicao) => {
			if (condicao.inativo === 1) return false;
			if (variante === "pedido") return true;
			return (
				condicao.escopo === null ||
				condicao.escopo === ESCOPO_CONDICAO_PAGAMENTO.COMPRA_E_VENDA ||
				condicao.escopo === ESCOPO_CONDICAO_PAGAMENTO.VENDAS
			);
		}) ?? [];

	const rotuloCondicao =
		variante === "pedido" ? "Meio de pagamento" : "Condição de pagamento";
	const rotuloFormaErp =
		variante === "pedido"
			? "Forma de recebimento (NF-e / financeiro)"
			: "Meio de pagamento (ERP)";

	const planosReceita =
		planosContas?.data.filter(
			(plano) =>
				plano.inativo !== 1 &&
				(plano.tipoconta === TIPO_CONTA_RECEITA || plano.tipoconta === null),
		) ?? [];

	const locaisAtivos =
		locaisEstoque?.data.filter((local) => local.inativo !== 1) ?? [];

	function handleTipoDocumentoChange(value: string) {
		onIdtipodocumentoChange(value);

		const tipo = tiposAtivos.find((item) => item.id === value);
		if (tipo?.formapagamentonfe?.trim()) {
			onFormaPagamentoNfeSugerida?.(tipo.formapagamentonfe.trim());
		}
		if (tipo?.idplanocontas) {
			onIdplanocontasChange(tipo.idplanocontas);
		}
	}

	const campoFormaErp = (
		<Field>
			<FieldLabel htmlFor="idtipodocumento">{rotuloFormaErp}</FieldLabel>
			<Select
				value={idtipodocumento || "none"}
				onValueChange={(selected) =>
					handleTipoDocumentoChange(selected === "none" ? "" : selected)
				}
				disabled={
					desabilitado || carregandoTipos || !empresa || !gerarFinanceiro
				}
			>
				<SelectTrigger id="idtipodocumento">
					<SelectValue
						placeholder={
							carregandoTipos
								? "Carregando formas..."
								: variante === "pedido"
									? "Selecione a forma de recebimento"
									: "Selecione o meio de pagamento"
						}
					/>
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="none">
						{variante === "pedido"
							? "Selecione a forma de recebimento"
							: "Selecione o meio de pagamento"}
					</SelectItem>
					{tiposAtivos.map((tipo) => (
						<SelectItem key={tipo.id} value={tipo.id}>
							{tipo.descricao}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{variante === "pedido" && tiposAtivos.length === 0 && !carregandoTipos && (
				<p className="text-xs text-muted-foreground">
					Cadastre em Meios de pagamento → Formas ERP (NF-e).
				</p>
			)}
		</Field>
	);

	const campoCondicaoPagamento = (
		<Field>
			<FieldLabel htmlFor="idcondicaopagto">
				{rotuloCondicao}
				{exigeCondicaoPagamento ? " *" : ""}
			</FieldLabel>
			<Select
				value={idcondicaopagto || "none"}
				onValueChange={(selected) =>
					onIdcondicaopagtoChange(selected === "none" ? "" : selected)
				}
				disabled={
					desabilitado ||
					carregandoCondicoes ||
					!empresa ||
					!gerarFinanceiro
				}
			>
				<SelectTrigger id="idcondicaopagto">
					<SelectValue
						placeholder={
							carregandoCondicoes
								? "Carregando meios de pagamento..."
								: variante === "pedido"
									? "Selecione o meio de pagamento"
									: "Selecione a condição de pagamento"
						}
					/>
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="none">
						{variante === "pedido"
							? "Selecione o meio de pagamento"
							: "Sem condição de pagamento"}
					</SelectItem>
					{condicoesVenda.map((condicao) => (
						<SelectItem key={condicao.id} value={condicao.id}>
							{formatarCondicaoPagamentoLabel(
								condicao.codigo,
								condicao.descricao,
							)}
							{condicao.parcelas && condicao.parcelas > 1
								? ` (${condicao.parcelas}x)`
								: ""}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{variante === "pedido" &&
				condicoesVenda.length === 0 &&
				!carregandoCondicoes && (
					<p className="text-xs text-muted-foreground">
						Cadastre em Meios de pagamento → Condições de pagamento.
					</p>
				)}
		</Field>
	);

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
			{variante === "pedido" ? (
				<>
					{campoCondicaoPagamento}
					{campoFormaErp}
				</>
			) : (
				<>
					{campoFormaErp}
					{campoCondicaoPagamento}
				</>
			)}

			<Field>
				<FieldLabel htmlFor="idplanocontas">Plano de contas (receita)</FieldLabel>
				<Combobox
					options={planosReceita.map((plano) => ({
						value: plano.id,
						label: formatarPlanoContasLabel(plano.codigo, plano.nome),
					}))}
					value={idplanocontas ?? ""}
					onChange={onIdplanocontasChange}
					placeholder={
						carregandoPlanos
							? "Carregando planos..."
							: "Selecione o plano de contas"
					}
					searchPlaceholder="Buscar plano de contas..."
					emptyMessage="Nenhum plano de contas de receita encontrado."
					disabled={desabilitado || carregandoPlanos || !empresa || !gerarFinanceiro}
				/>
			</Field>

			<Field>
				<FieldLabel htmlFor="idlocalestoque">Local de estoque</FieldLabel>
				<Select
					value={idlocalestoque || "none"}
					onValueChange={(selected) =>
						onIdlocalestoqueChange(selected === "none" ? "" : selected)
					}
					disabled={desabilitado || carregandoLocais || !empresa || !gerarEstoque}
				>
					<SelectTrigger id="idlocalestoque">
						<SelectValue
							placeholder={
								carregandoLocais
									? "Carregando locais..."
									: "Padrão da empresa"
							}
						/>
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="none">Padrão da empresa</SelectItem>
						{locaisAtivos.map((local) => (
							<SelectItem key={local.id} value={local.id}>
								{local.codigo ? `${local.codigo} - ` : ""}
								{local.descricao ?? "Sem descrição"}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</Field>

			<div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row sm:gap-6">
				{mostrarFlagsIntegracao && (
					<>
						<div className="flex items-center gap-2">
							<Checkbox
								id="gerarEstoque-nfe"
								checked={gerarEstoque}
								onCheckedChange={(checked) =>
									onGerarEstoqueChange(checked === true)
								}
								disabled={desabilitado}
							/>
							<Label htmlFor="gerarEstoque-nfe">
								Baixar estoque automaticamente
							</Label>
						</div>
						<div className="flex items-center gap-2">
							<Checkbox
								id="gerarFinanceiro-nfe"
								checked={gerarFinanceiro}
								onCheckedChange={(checked) =>
									onGerarFinanceiroChange(checked === true)
								}
								disabled={desabilitado}
							/>
							<Label htmlFor="gerarFinanceiro-nfe">
								Gerar financeiro (contas a receber ou caixa)
							</Label>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
