"use client";

import { IconFilter, IconX } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export type FiltrosFinanceiroState = {
	emitente: string;
	emissaoInicio: string;
	emissaoFim: string;
	vencimentoInicio: string;
	vencimentoFim: string;
	status: string;
};

export const filtrosFinanceiroVazios: FiltrosFinanceiroState = {
	emitente: "",
	emissaoInicio: "",
	emissaoFim: "",
	vencimentoInicio: "",
	vencimentoFim: "",
	status: "",
};

export function filtrosFinanceiroAtivos(
	filtros: FiltrosFinanceiroState,
): boolean {
	return !!(
		filtros.emitente ||
		filtros.emissaoInicio ||
		filtros.emissaoFim ||
		filtros.vencimentoInicio ||
		filtros.vencimentoFim ||
		filtros.status
	);
}

type FiltrosFinanceiroListaProps = {
	filtros: FiltrosFinanceiroState;
	onChange: (filtros: FiltrosFinanceiroState) => void;
	onAplicar: () => void;
	onLimpar: () => void;
	comFiltrosAtivos: boolean;
};

export function FiltrosFinanceiroLista({
	filtros,
	onChange,
	onAplicar,
	onLimpar,
	comFiltrosAtivos,
}: FiltrosFinanceiroListaProps) {
	const atualizar = (parcial: Partial<FiltrosFinanceiroState>) => {
		onChange({ ...filtros, ...parcial });
	};

	return (
		<div className="mx-4 rounded-lg border bg-card p-4">
			<div className="mb-3 flex items-center gap-2">
				<span className="text-sm font-medium">Filtros</span>
				{comFiltrosAtivos && (
					<Badge variant="secondary" className="gap-1">
						<IconFilter className="size-3" />
						Ativos
					</Badge>
				)}
			</div>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				<Field>
					<FieldLabel>Nome cliente</FieldLabel>
					<FieldGroup>
						<Input
							placeholder="Buscar por nome"
							value={filtros.emitente}
							onChange={(e) => atualizar({ emitente: e.target.value })}
						/>
					</FieldGroup>
				</Field>

				<Field>
					<FieldLabel>Emissão (início)</FieldLabel>
					<FieldGroup>
						<Input
							type="date"
							value={filtros.emissaoInicio}
							onChange={(e) => atualizar({ emissaoInicio: e.target.value })}
						/>
					</FieldGroup>
				</Field>

				<Field>
					<FieldLabel>Emissão (fim)</FieldLabel>
					<FieldGroup>
						<Input
							type="date"
							value={filtros.emissaoFim}
							onChange={(e) => atualizar({ emissaoFim: e.target.value })}
						/>
					</FieldGroup>
				</Field>

				<Field>
					<FieldLabel>Vencimento (início)</FieldLabel>
					<FieldGroup>
						<Input
							type="date"
							value={filtros.vencimentoInicio}
							onChange={(e) =>
								atualizar({ vencimentoInicio: e.target.value })
							}
						/>
					</FieldGroup>
				</Field>

				<Field>
					<FieldLabel>Vencimento (fim)</FieldLabel>
					<FieldGroup>
						<Input
							type="date"
							value={filtros.vencimentoFim}
							onChange={(e) => atualizar({ vencimentoFim: e.target.value })}
						/>
					</FieldGroup>
				</Field>

				<Field>
					<FieldLabel>Status</FieldLabel>
					<FieldGroup>
						<Select
							value={filtros.status || "todos"}
							onValueChange={(v) =>
								atualizar({ status: v === "todos" ? "" : v })
							}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Todos" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="todos">Todos</SelectItem>
								<SelectItem value="A">Aberto</SelectItem>
								<SelectItem value="P">Pago</SelectItem>
								<SelectItem value="C">Cancelado</SelectItem>
								<SelectItem value="V">Vencido</SelectItem>
							</SelectContent>
						</Select>
					</FieldGroup>
				</Field>

				<div className="flex items-end gap-2">
					<Button onClick={onAplicar} className="flex-1">
						<IconFilter className="size-4" />
						Filtrar
					</Button>
				</div>

				<div className="flex items-end gap-2">
					{comFiltrosAtivos && (
						<Button
							className="flex-1"
							variant="outline"
							onClick={onLimpar}
							aria-label="Limpar filtros"
						>

							<IconX className="size-4" />
							Limpar
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}
