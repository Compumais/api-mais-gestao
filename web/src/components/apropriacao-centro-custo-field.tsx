"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
	Field,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useEmpresa } from "@/hooks/use-empresa";
import type { ApropriacaoCentroCustoFormData } from "@/schemas/centro-custo.schema";
import {
	type CentroCusto,
	centroCustoService,
} from "@/services/centro-custo.service";
import { criterioRateioService } from "@/services/criterio-rateio.service";

export type ApropriacaoCentroCustoFieldValue = ApropriacaoCentroCustoFormData;

interface ApropriacaoCentroCustoFieldProps {
	valorTotal: number;
	value: ApropriacaoCentroCustoFieldValue;
	onChange: (value: ApropriacaoCentroCustoFieldValue) => void;
	disabled?: boolean;
}

function rotuloCentro(c: CentroCusto) {
	const codigo = c.codigoreduzido || c.codigoextenso;
	return codigo ? `${codigo} - ${c.nome}` : c.nome;
}

export function ApropriacaoCentroCustoField({
	valorTotal,
	value,
	onChange,
	disabled,
}: ApropriacaoCentroCustoFieldProps) {
	const { localStorageEmpresa: empresa } = useEmpresa();

	const { data: centrosData } = useQuery({
		queryKey: ["centros-custo", "lista", empresa?.id],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return centroCustoService.listar({
				idempresa: empresa.id,
				formato: "lista",
				limit: 500,
				page: 1,
				inativo: 0,
			});
		},
		enabled: !!empresa,
	});

	const { data: criteriosData } = useQuery({
		queryKey: ["criterios-rateio", empresa?.id],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return criterioRateioService.listar({ idempresa: empresa.id, ativo: 1 });
		},
		enabled: !!empresa && value.modo === "rateio_criterio",
	});

	const opcoesCentro = useMemo(
		() =>
			((centrosData?.data ?? []) as CentroCusto[])
				.filter((c) => c.inativo !== 1)
				.map((c) => ({
					value: c.id,
					label: rotuloCentro(c),
				})),
		[centrosData],
	);

	const setModo = (modo: ApropriacaoCentroCustoFieldValue["modo"]) => {
		if (modo === "unico") {
			onChange({
				modo,
				idcriteriorateio: null,
				linhas: value.linhas.slice(0, 1).length
					? value.linhas.slice(0, 1)
					: [{ idcentrocusto: "", valor: valorTotal > 0 ? valorTotal : undefined }],
			});
			return;
		}
		if (modo === "rateio_criterio") {
			onChange({
				modo,
				idcriteriorateio: value.idcriteriorateio ?? null,
				linhas: [],
			});
			return;
		}
		onChange({
			modo,
			idcriteriorateio: null,
			linhas:
				value.linhas.length > 0
					? value.linhas
					: [
							{ idcentrocusto: "", percentual: 50 },
							{ idcentrocusto: "", percentual: 50 },
						],
		});
	};

	const atualizarLinha = (
		index: number,
		patch: Partial<ApropriacaoCentroCustoFieldValue["linhas"][number]>,
	) => {
		const linhas = value.linhas.map((linha, i) =>
			i === index ? { ...linha, ...patch } : linha,
		);
		onChange({ ...value, linhas });
	};

	const adicionarLinha = () => {
		onChange({
			...value,
			linhas: [...value.linhas, { idcentrocusto: "", percentual: null }],
		});
	};

	const removerLinha = (index: number) => {
		onChange({
			...value,
			linhas: value.linhas.filter((_, i) => i !== index),
		});
	};

	return (
		<div className="space-y-4 rounded-lg border bg-card p-4">
			<div>
				<h2 className="text-lg font-semibold">Centro de custos</h2>
				<p className="text-sm text-muted-foreground">
					Classifique o valor do título entre centros de custo.
				</p>
			</div>

			<FieldGroup>
				<Field>
					<FieldLabel>Forma de apropriação</FieldLabel>
					<Select
						value={value.modo}
						onValueChange={(v) =>
							setModo(v as ApropriacaoCentroCustoFieldValue["modo"])
						}
						disabled={disabled}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="unico">Centro único</SelectItem>
							<SelectItem value="rateio_manual">Rateio manual</SelectItem>
							<SelectItem value="rateio_criterio">
								Rateio por critério
							</SelectItem>
						</SelectContent>
					</Select>
				</Field>

				{value.modo === "rateio_criterio" ? (
					<Field>
						<FieldLabel>Critério de rateio</FieldLabel>
						<Select
							value={value.idcriteriorateio ?? ""}
							onValueChange={(v) =>
								onChange({ ...value, idcriteriorateio: v || null })
							}
							disabled={disabled}
						>
							<SelectTrigger>
								<SelectValue placeholder="Selecione o critério" />
							</SelectTrigger>
							<SelectContent>
								{(criteriosData?.data ?? []).map((c) => (
									<SelectItem key={c.id} value={c.id}>
										{c.nome}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>
				) : (
					<div className="space-y-3">
						{value.linhas.map((linha, index) => (
							<div
								key={`linha-${index}`}
								className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_140px_140px_auto] items-end"
							>
								<Field>
									<FieldLabel>Centro de custo</FieldLabel>
									<Combobox
										options={opcoesCentro}
										value={linha.idcentrocusto}
										onChange={(v) =>
											atualizarLinha(index, { idcentrocusto: v })
										}
										placeholder="Selecione..."
										disabled={disabled}
									/>
								</Field>
								{value.modo === "rateio_manual" ? (
									<>
										<Field>
											<FieldLabel>Percentual</FieldLabel>
											<Input
												type="number"
												min={0}
												max={100}
												step="0.01"
												value={linha.percentual ?? ""}
												onChange={(e) =>
													atualizarLinha(index, {
														percentual: e.target.value
															? Number(e.target.value)
															: null,
														valor: undefined,
													})
												}
												disabled={disabled}
											/>
										</Field>
										<Field>
											<FieldLabel>Valor</FieldLabel>
											<Input
												type="number"
												min={0}
												step="0.01"
												value={linha.valor ?? ""}
												onChange={(e) =>
													atualizarLinha(index, {
														valor: e.target.value
															? Number(e.target.value)
															: undefined,
														percentual: null,
													})
												}
												disabled={disabled}
											/>
										</Field>
									</>
								) : (
									<Field className="md:col-span-2">
										<FieldLabel>Valor</FieldLabel>
										<Input
											type="number"
											min={0}
											step="0.01"
											value={linha.valor ?? valorTotal ?? ""}
											onChange={(e) =>
												atualizarLinha(index, {
													valor: e.target.value
														? Number(e.target.value)
														: undefined,
												})
											}
											disabled={disabled}
										/>
									</Field>
								)}
								{value.modo === "rateio_manual" && value.linhas.length > 1 ? (
									<Button
										type="button"
										variant="ghost"
										size="icon"
										onClick={() => removerLinha(index)}
										disabled={disabled}
										aria-label="Remover linha"
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								) : (
									<div />
								)}
							</div>
						))}
						{value.modo === "rateio_manual" && (
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="gap-2"
								onClick={adicionarLinha}
								disabled={disabled}
							>
								<Plus className="h-4 w-4" />
								Adicionar linha
							</Button>
						)}
					</div>
				)}
			</FieldGroup>
		</div>
	);
}

export function mapApropriacaoParaApi(
	value: ApropriacaoCentroCustoFieldValue,
	valorTotal: number,
): {
	apropriacoesCentroCusto?: Array<{
		idcentrocusto: string;
		valor?: number;
		percentual?: number | null;
	}>;
	idcriteriorateio?: string | null;
} {
	if (value.modo === "rateio_criterio") {
		return { idcriteriorateio: value.idcriteriorateio ?? null };
	}

	const linhas = value.linhas
		.filter((l) => l.idcentrocusto)
		.map((l) => {
			if (value.modo === "unico") {
				return {
					idcentrocusto: l.idcentrocusto,
					valor: valorTotal,
				};
			}
			return {
				idcentrocusto: l.idcentrocusto,
				valor: l.valor,
				percentual: l.percentual ?? null,
			};
		});

	return { apropriacoesCentroCusto: linhas };
}
