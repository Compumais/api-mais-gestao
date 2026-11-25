"use client";

import { IconFilter, IconX } from "@tabler/icons-react";
import { type FormEvent, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { CampoFiltroRelatorio } from "../relatorios-produtos.config";

export type ValoresFiltrosRelatorio = Partial<
	Record<CampoFiltroRelatorio, string>
>;

interface Props {
	campos: CampoFiltroRelatorio[];
	valores: ValoresFiltrosRelatorio;
	opcoesPendencia?: Array<{ value: string; label: string }>;
	onAplicar: (valores: ValoresFiltrosRelatorio) => void;
	onLimpar: () => void;
}

const rotulos: Record<CampoFiltroRelatorio, string> = {
	q: "Produto",
	dataInicio: "Data inicial",
	dataFim: "Data final",
	situacao: "Situação",
	grupo: "Grupo",
	fornecedor: "Fornecedor",
	pendencia: "Pendência",
	diasSemMovimento: "Dias sem movimento",
	margemMin: "Margem mínima (%)",
	margemMax: "Margem máxima (%)",
	origem: "Origem",
	tipoEstoque: "Tipo de estoque",
};

const placeholders: Partial<Record<CampoFiltroRelatorio, string>> = {
	q: "Nome, código ou EAN",
	grupo: "Nome ou código do grupo",
	fornecedor: "Nome ou documento",
};

function classesGridFiltros(totalCampos: number): string {
	if (totalCampos <= 2) return "grid gap-3 grid-cols-1 sm:grid-cols-2";
	if (totalCampos === 3) return "grid gap-3 grid-cols-1 md:grid-cols-3";
	if (totalCampos === 4) {
		return "grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
	}
	if (totalCampos === 5) {
		return "grid gap-3 grid-cols-1 sm:grid-cols-6 lg:grid-cols-5";
	}
	return "grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
}

function classesItemFiltro(totalCampos: number, indice: number): string {
	if (totalCampos === 5) {
		return indice < 3
			? "space-y-1.5 sm:col-span-2 lg:col-span-1"
			: "space-y-1.5 sm:col-span-3 lg:col-span-1";
	}
	return "space-y-1.5";
}

export function FiltrosRelatorioProduto({
	campos,
	valores,
	opcoesPendencia = [],
	onAplicar,
	onLimpar,
}: Props) {
	const idBase = useId();
	const [rascunho, setRascunho] = useState<ValoresFiltrosRelatorio>(valores);

	const alterar = (campo: CampoFiltroRelatorio, valor: string) => {
		setRascunho((atual) => ({ ...atual, [campo]: valor }));
	};

	const aplicar = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		onAplicar(rascunho);
	};

	return (
		<form
			onSubmit={aplicar}
			className="rounded-lg border bg-card p-4"
			aria-label="Filtros do relatório"
		>
			<div className={classesGridFiltros(campos.length)}>
				{campos.map((campo, indice) => {
					const id = `${idBase}-${campo}`;
					const itemClassName = classesItemFiltro(campos.length, indice);
					if (campo === "situacao") {
						return (
							<div key={campo} className={itemClassName}>
								<Label htmlFor={id}>{rotulos[campo]}</Label>
								<Select
									value={rascunho[campo] || "todos"}
									onValueChange={(valor) =>
										alterar(campo, valor === "todos" ? "" : valor)
									}
								>
									<SelectTrigger id={id} className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="todos">Todas</SelectItem>
										<SelectItem value="ativo">Ativos</SelectItem>
										<SelectItem value="inativo">Inativos</SelectItem>
									</SelectContent>
								</Select>
							</div>
						);
					}
					if (campo === "pendencia") {
						return (
							<div key={campo} className={itemClassName}>
								<Label htmlFor={id}>{rotulos[campo]}</Label>
								<Select
									value={rascunho[campo] || "todos"}
									onValueChange={(valor) =>
										alterar(campo, valor === "todos" ? "" : valor)
									}
								>
									<SelectTrigger id={id} className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="todos">Todas</SelectItem>
										{opcoesPendencia.map((opcao) => (
											<SelectItem key={opcao.value} value={opcao.value}>
												{opcao.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						);
					}
					if (campo === "origem") {
						return (
							<div key={campo} className={itemClassName}>
								<Label htmlFor={id}>{rotulos[campo]}</Label>
								<Select
									value={rascunho[campo] || "todos"}
									onValueChange={(valor) =>
										alterar(campo, valor === "todos" ? "" : valor)
									}
								>
									<SelectTrigger id={id} className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="todos">Todas</SelectItem>
										<SelectItem value="pdv">PDV</SelectItem>
										<SelectItem value="nota_fiscal">Nota fiscal</SelectItem>
										<SelectItem value="acerto">Acerto</SelectItem>
										<SelectItem value="producao">Produção/outros</SelectItem>
									</SelectContent>
								</Select>
							</div>
						);
					}
					if (campo === "tipoEstoque") {
						return (
							<div key={campo} className={itemClassName}>
								<Label htmlFor={id}>{rotulos[campo]}</Label>
								<Select
									value={rascunho[campo] || "todos"}
									onValueChange={(valor) =>
										alterar(campo, valor === "todos" ? "" : valor)
									}
								>
									<SelectTrigger id={id} className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="todos">Todos</SelectItem>
										<SelectItem value="operacional">Operacional</SelectItem>
										<SelectItem value="fiscal">Fiscal</SelectItem>
										<SelectItem value="ambos">Ambos</SelectItem>
									</SelectContent>
								</Select>
							</div>
						);
					}
					const numerico = [
						"diasSemMovimento",
						"margemMin",
						"margemMax",
					].includes(campo);
					const data = campo === "dataInicio" || campo === "dataFim";
					return (
						<div key={campo} className={itemClassName}>
							<Label htmlFor={id}>{rotulos[campo]}</Label>
							<Input
								id={id}
								type={data ? "date" : numerico ? "number" : "text"}
								min={campo === "diasSemMovimento" ? 0 : undefined}
								step={numerico ? "any" : undefined}
								value={rascunho[campo] ?? ""}
								placeholder={placeholders[campo]}
								onChange={(event) => alterar(campo, event.target.value)}
							/>
						</div>
					);
				})}
			</div>
			<div className="mt-4 flex flex-wrap gap-2">
				<Button type="submit">
					<IconFilter className="size-4" aria-hidden="true" />
					Aplicar filtros
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={() => {
						setRascunho({});
						onLimpar();
					}}
				>
					<IconX className="size-4" aria-hidden="true" />
					Limpar
				</Button>
			</div>
		</form>
	);
}
