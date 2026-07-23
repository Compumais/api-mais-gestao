"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Field, FieldLabel } from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useEmpresa } from "@/hooks/use-empresa";
import { condicaoPagamentoService } from "@/services/condicao-pagamento.service";
import { planoContasService } from "@/services/plano-contas.service";
import { tipoDocumentoFinanceiroService } from "@/services/tipo-documento-financeiro.service";
import { DialogCriarFormaPagamentoRapido } from "./dialog-criar-forma-pagamento-rapido";
import { DialogCriarPlanoContasRapido } from "./dialog-criar-plano-contas-rapido";

const TIPO_CONTA_DESPESA = 2;

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

type CampoPlanoContasDespesaProps = {
	value?: string;
	onChange: (value: string) => void;
	id?: string;
};

export function CampoPlanoContasDespesa({
	value,
	onChange,
	id = "idplanocontas",
}: CampoPlanoContasDespesaProps) {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const [dialogAberto, setDialogAberto] = useState(false);

	const { data, isLoading, refetch } = useQuery({
		queryKey: ["plano-contas", "despesas", empresa?.id],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return planoContasService.listar({
				idempresa: empresa.id,
				page: 1,
				limit: 100,
				listarTudo: true,
				tipomovimento: "S",
			});
		},
		enabled: !!empresa,
	});

	const planosDespesa =
		data?.data.filter(
			(plano) =>
				plano.inativo !== 1 &&
				(plano.tipoconta === TIPO_CONTA_DESPESA || plano.tipoconta === null),
		) ?? [];

	return (
		<>
			<Field>
				<div className="mb-2 flex items-center justify-between gap-2">
					<FieldLabel htmlFor={id}>Plano de contas (despesa)</FieldLabel>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-8 gap-1 px-2"
						onClick={() => setDialogAberto(true)}
						disabled={!empresa}
					>
						<Plus className="size-3.5" aria-hidden="true" />
						Cadastrar
					</Button>
				</div>
				<Combobox
					options={planosDespesa.map((plano) => ({
						value: plano.id,
						label: formatarPlanoContasLabel(plano.codigo, plano.nome),
					}))}
					value={value ?? ""}
					onChange={onChange}
					placeholder={
						isLoading ? "Carregando planos..." : "Selecione o plano de contas"
					}
					searchPlaceholder="Buscar plano de contas..."
					emptyMessage="Nenhum plano de contas de despesa encontrado."
					disabled={isLoading || !empresa}
				/>
			</Field>
			<DialogCriarPlanoContasRapido
				aberto={dialogAberto}
				onAbertoChange={setDialogAberto}
				onCriado={(idCriado) => {
					void refetch();
					onChange(idCriado);
				}}
			/>
		</>
	);
}

type CampoCondicaoPagamentoCompraProps = {
	value?: string;
	onChange: (value: string) => void;
	id?: string;
};

export function CampoCondicaoPagamentoCompra({
	value,
	onChange,
	id = "idcondicaopagto",
}: CampoCondicaoPagamentoCompraProps) {
	const { localStorageEmpresa: empresa } = useEmpresa();

	const { data, isLoading } = useQuery({
		queryKey: ["condicoes-pagamento", "compras", empresa?.id],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return condicaoPagamentoService.listar({
				idempresa: empresa.id,
				page: 1,
				limit: 100,
				inativo: 0,
			});
		},
		enabled: !!empresa,
	});

	const condicoesCompra =
		data?.data.filter(
			(condicao) =>
				condicao.inativo !== 1 &&
				(condicao.escopo === null ||
					condicao.escopo === 0 ||
					condicao.escopo === 2),
		) ?? [];

	return (
		<Field>
			<FieldLabel htmlFor={id}>Condição de pagamento</FieldLabel>
			<Select
				value={value || "none"}
				onValueChange={(selected) =>
					onChange(selected === "none" ? "" : selected)
				}
				disabled={isLoading || !empresa}
			>
				<SelectTrigger id={id}>
					<SelectValue
						placeholder={
							isLoading
								? "Carregando condições..."
								: "Selecione a condição de pagamento"
						}
					/>
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="none">Sem condição de pagamento</SelectItem>
					{condicoesCompra.map((condicao) => (
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
		</Field>
	);
}

type CampoFormaPagamentoCompraProps = {
	value?: string;
	onChange: (value: string) => void;
	id?: string;
};

export function CampoFormaPagamentoCompra({
	value,
	onChange,
	id = "idtipodocumento",
}: CampoFormaPagamentoCompraProps) {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const [dialogAberto, setDialogAberto] = useState(false);

	const { data: formas = [], isLoading, refetch } = useQuery({
		queryKey: ["tipos-documento-financeiro", empresa?.id, "compra"],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return tipoDocumentoFinanceiroService.listarTodos({
				idempresa: empresa.id,
				inativo: 0,
			});
		},
		enabled: !!empresa,
	});

	return (
		<>
			<Field>
				<div className="mb-2 flex items-center justify-between gap-2">
					<FieldLabel htmlFor={id}>Forma de pagamento</FieldLabel>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-8 gap-1 px-2"
						onClick={() => setDialogAberto(true)}
						disabled={!empresa}
					>
						<Plus className="size-3.5" aria-hidden="true" />
						Cadastrar
					</Button>
				</div>
				<Select
					value={value || "none"}
					onValueChange={(selected) =>
						onChange(selected === "none" ? "" : selected)
					}
					disabled={isLoading || !empresa}
				>
					<SelectTrigger id={id}>
						<SelectValue
							placeholder={
								isLoading
									? "Carregando formas..."
									: "Selecione a forma de pagamento"
							}
						/>
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="none">Sem forma de pagamento</SelectItem>
						{formas.map((forma) => (
							<SelectItem key={forma.id} value={forma.id}>
								{forma.descricao}
								{forma.formapagamentonfe
									? ` (${forma.formapagamentonfe})`
									: ""}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</Field>
			<DialogCriarFormaPagamentoRapido
				aberto={dialogAberto}
				onAbertoChange={setDialogAberto}
				onCriado={(idCriado) => {
					void refetch();
					onChange(idCriado);
				}}
			/>
		</>
	);
}
