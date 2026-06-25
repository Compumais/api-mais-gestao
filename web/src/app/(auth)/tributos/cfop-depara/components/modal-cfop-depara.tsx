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
	type CfopDeParaFormData,
	cfopDeParaFormSchema,
} from "@/schemas/cfop-depara.schema";
import {
	type CfopDePara,
	cfopDeParaService,
} from "@/services/cfop-depara.service";
import { CampoCfopProduto } from "@/app/(auth)/produtos/components/campo-cfop-produto";

type ModalCfopDeParaProps = {
	aberto: boolean;
	idempresa: string;
	id?: string;
	registro?: CfopDePara | null;
	onFechar: () => void;
	onSucesso: () => void;
};

export function ModalCfopDePara({
	aberto,
	idempresa,
	id,
	registro,
	onFechar,
	onSucesso,
}: ModalCfopDeParaProps) {
	const isEdicao = !!id;

	const form = useForm<CfopDeParaFormData>({
		resolver: zodResolver(cfopDeParaFormSchema),
		defaultValues: {
			idcfopentrada: "",
			idcfopsaida: "",
			uf: null,
		},
	});

	const { setValue, watch, register, handleSubmit, reset, formState } = form;
	const idcfopentrada = watch("idcfopentrada");
	const idcfopsaida = watch("idcfopsaida");

	useEffect(() => {
		if (!aberto) return;

		if (registro) {
			reset({
				idcfopentrada: registro.idcfopentrada ?? "",
				idcfopsaida: registro.idcfopsaida ?? "",
				uf: registro.uf ?? null,
			});
			return;
		}

		reset({
			idcfopentrada: "",
			idcfopsaida: "",
			uf: null,
		});
	}, [aberto, registro, reset]);

	const salvarMutation = useMutation({
		mutationFn: async (dados: CfopDeParaFormData) => {
			const uf = dados.uf?.trim().toUpperCase();
			const payload = {
				idempresa,
				idcfopentrada: dados.idcfopentrada,
				idcfopsaida: dados.idcfopsaida,
				uf: uf || null,
			};

			if (isEdicao && id) {
				return cfopDeParaService.atualizar(id, payload);
			}

			return cfopDeParaService.criar(payload);
		},
		onSuccess: () => {
			reset();
			onSucesso();
			onFechar();
		},
	});

	const onSubmit = (dados: CfopDeParaFormData) => {
		salvarMutation.mutate(dados);
	};

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			reset();
			onFechar();
		}
	};

	return (
		<Dialog open={aberto} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{isEdicao ? "Editar mapeamento CFOP" : "Novo mapeamento CFOP"}
					</DialogTitle>
					<p className="text-muted-foreground text-sm">
						Informe o CFOP que aparece na NF de compra e o CFOP de saída que o
						produto deve receber nas vendas futuras.
					</p>
				</DialogHeader>

				<form onSubmit={handleSubmit(onSubmit)}>
					<FieldGroup>
						<CampoCfopProduto
							id="idcfopentrada"
							label="CFOP da NF de compra (entrada) *"
							value={idcfopentrada}
							tipomovimento="E"
							onChange={(valor) =>
								setValue("idcfopentrada", valor, { shouldValidate: true })
							}
							erro={formState.errors.idcfopentrada?.message}
						/>

						<CampoCfopProduto
							id="idcfopsaida"
							label="CFOP de saída do produto *"
							value={idcfopsaida}
							tipomovimento="S"
							onChange={(valor) =>
								setValue("idcfopsaida", valor, { shouldValidate: true })
							}
							erro={formState.errors.idcfopsaida?.message}
						/>

						<Field data-invalid={!!formState.errors.uf}>
							<FieldLabel htmlFor="uf">UF (opcional)</FieldLabel>
							<Input
								id="uf"
								placeholder="Ex.: SP"
								maxLength={2}
								{...register("uf")}
							/>
							<p className="text-sm text-muted-foreground">
								Informe apenas se a regra for específica para um estado.
							</p>
							<FieldError
								errors={formState.errors.uf ? [formState.errors.uf] : []}
							/>
						</Field>
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
