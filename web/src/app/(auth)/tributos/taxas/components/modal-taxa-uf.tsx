"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Field,
	FieldError,
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
import {
	type TaxaUfFormData,
	taxaUfFormSchema,
} from "@/schemas/taxauf.schema";
import {
	type TaxaUf,
	taxaUfService,
} from "@/services/taxauf.service";
import { UFS_BRASIL } from "@/util/ufs-brasil";

type ModalTaxaUfProps = {
	aberto: boolean;
	idempresa: string;
	registro?: TaxaUf | null;
	onFechar: () => void;
	onSucesso: () => void;
};

const VALORES_PADRAO: TaxaUfFormData = {
	codigo: "",
	descricao: "",
	baseicms: null,
	baseicmsfe: null,
	baseicmsst: null,
	baseiss: null,
	iss: null,
	pordif: null,
	bcporuf: "N",
	inativo: 0,
	...Object.fromEntries(
		UFS_BRASIL.map((uf) => [`uf_${uf.toLowerCase()}`, null]),
	),
};

function textoOuNulo(valor?: string | null): string | null {
	const texto = valor?.trim();
	return texto ? texto : null;
}

function mapRegistroParaForm(registro: TaxaUf): TaxaUfFormData {
	const form: TaxaUfFormData = {
		codigo: registro.codigo ?? "",
		descricao: registro.descricao ?? "",
		baseicms: registro.baseicms,
		baseicmsfe: registro.baseicmsfe,
		baseicmsst: registro.baseicmsst,
		baseiss: registro.baseiss,
		iss: registro.iss,
		pordif: registro.pordif,
		bcporuf: registro.bcporuf === "S" ? "S" : "N",
		inativo: registro.inativo ?? 0,
	};

	for (const uf of UFS_BRASIL) {
		const chave = `uf_${uf.toLowerCase()}` as keyof TaxaUfFormData;
		form[chave] = (registro[chave as keyof TaxaUf] as string | null) ?? null;
	}

	return form;
}

function mapFormParaPayload(dados: TaxaUfFormData, idempresa: string) {
	const payload: Record<string, string | number | null> = {
		idempresa,
		codigo: dados.codigo.trim().toUpperCase(),
		descricao: dados.descricao.trim(),
		baseicms: textoOuNulo(dados.baseicms),
		baseicmsfe: textoOuNulo(dados.baseicmsfe),
		baseicmsst: textoOuNulo(dados.baseicmsst),
		baseiss: textoOuNulo(dados.baseiss),
		iss: textoOuNulo(dados.iss),
		pordif: textoOuNulo(dados.pordif),
		bcporuf: dados.bcporuf ?? "N",
		inativo: dados.inativo ?? 0,
	};

	for (const uf of UFS_BRASIL) {
		const chave = `uf_${uf.toLowerCase()}`;
		payload[chave] = textoOuNulo(dados[chave as keyof TaxaUfFormData] as string);
	}

	return payload;
}

export function ModalTaxaUf({
	aberto,
	idempresa,
	registro,
	onFechar,
	onSucesso,
}: ModalTaxaUfProps) {
	const isEdicao = !!registro;

	const form = useForm<TaxaUfFormData>({
		resolver: zodResolver(taxaUfFormSchema),
		defaultValues: VALORES_PADRAO,
	});

	const { register, handleSubmit, reset, setValue, watch, formState } = form;

	useEffect(() => {
		if (!aberto) return;
		reset(registro ? mapRegistroParaForm(registro) : VALORES_PADRAO);
	}, [aberto, registro, reset]);

	const salvarMutation = useMutation({
		mutationFn: async (dados: TaxaUfFormData) => {
			const payload = mapFormParaPayload(dados, idempresa);

			if (isEdicao && registro) {
				return taxaUfService.atualizar(registro.id, idempresa, payload);
			}

			return taxaUfService.criar(payload as Parameters<typeof taxaUfService.criar>[0]);
		},
		onSuccess: () => {
			reset(VALORES_PADRAO);
			onSucesso();
			onFechar();
		},
	});

	const onSubmit = (dados: TaxaUfFormData) => {
		salvarMutation.mutate(dados);
	};

	return (
		<Dialog open={aberto} onOpenChange={(open) => !open && onFechar()}>
			<DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEdicao ? "Editar taxa" : "Nova taxa"}
					</DialogTitle>
					<p className="text-muted-foreground text-sm">
						Configure alíquotas de ICMS por UF para uso no ECF/PDV e vínculo com
						produtos.
					</p>
				</DialogHeader>

				<form onSubmit={handleSubmit(onSubmit)}>
					<FieldGroup>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<Field data-invalid={!!formState.errors.codigo}>
								<FieldLabel htmlFor="codigo">Código *</FieldLabel>
								<Input
									id="codigo"
									maxLength={4}
									placeholder="Ex.: X01"
									{...register("codigo")}
								/>
								<FieldError
									errors={
										formState.errors.codigo ? [formState.errors.codigo] : []
									}
								/>
							</Field>

							<Field className="md:col-span-2" data-invalid={!!formState.errors.descricao}>
								<FieldLabel htmlFor="descricao">Descrição *</FieldLabel>
								<Input
									id="descricao"
									placeholder="Ex.: Venda à vista"
									{...register("descricao")}
								/>
								<FieldError
									errors={
										formState.errors.descricao
											? [formState.errors.descricao]
											: []
									}
								/>
							</Field>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<Field>
								<FieldLabel htmlFor="baseicms">Base ICMS (%)</FieldLabel>
								<Input id="baseicms" {...register("baseicms")} />
							</Field>
							<Field>
								<FieldLabel htmlFor="baseicmsfe">Base ICMS FE (%)</FieldLabel>
								<Input id="baseicmsfe" {...register("baseicmsfe")} />
							</Field>
							<Field>
								<FieldLabel htmlFor="baseicmsst">Base ICMS ST (%)</FieldLabel>
								<Input id="baseicmsst" {...register("baseicmsst")} />
							</Field>
							<Field>
								<FieldLabel htmlFor="baseiss">Base ISS (%)</FieldLabel>
								<Input id="baseiss" {...register("baseiss")} />
							</Field>
							<Field>
								<FieldLabel htmlFor="iss">ISS (%)</FieldLabel>
								<Input id="iss" {...register("iss")} />
							</Field>
							<Field>
								<FieldLabel htmlFor="pordif">% Diferencial</FieldLabel>
								<Input id="pordif" {...register("pordif")} />
							</Field>
							<Field>
								<FieldLabel htmlFor="bcporuf">BC por UF</FieldLabel>
								<Select
									value={watch("bcporuf") ?? "N"}
									onValueChange={(valor) =>
										setValue("bcporuf", valor as "S" | "N", {
											shouldValidate: true,
										})
									}
								>
									<SelectTrigger id="bcporuf" className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="N">Não</SelectItem>
										<SelectItem value="S">Sim</SelectItem>
									</SelectContent>
								</Select>
							</Field>
						</div>

						<div className="space-y-2">
							<h3 className="text-sm font-semibold">Alíquota ICMS por UF (%)</h3>
							<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
								{UFS_BRASIL.map((uf) => {
									const campo = `uf_${uf.toLowerCase()}` as const;
									return (
										<Field key={uf}>
											<FieldLabel htmlFor={campo}>{uf}</FieldLabel>
											<Input id={campo} {...register(campo)} />
										</Field>
									);
								})}
							</div>
						</div>
					</FieldGroup>

					<DialogFooter className="mt-4">
						<Button type="button" variant="outline" onClick={onFechar}>
							Cancelar
						</Button>
						<Button type="submit" disabled={salvarMutation.isPending}>
							{salvarMutation.isPending ? "Salvando..." : "Salvar"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
