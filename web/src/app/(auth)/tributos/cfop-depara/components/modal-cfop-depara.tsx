"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
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
import { cfopDeParaService } from "@/services/cfop-depara.service";
import { CampoCfopProduto } from "@/app/(auth)/produtos/components/campo-cfop-produto";

type ModalCfopDeParaProps = {
	aberto: boolean;
	idempresa: string;
	onFechar: () => void;
	onSucesso: () => void;
};

export function ModalCfopDePara({
	aberto,
	idempresa,
	onFechar,
	onSucesso,
}: ModalCfopDeParaProps) {
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

	const criarMutation = useMutation({
		mutationFn: async (dados: CfopDeParaFormData) => {
			const uf = dados.uf?.trim().toUpperCase();
			return cfopDeParaService.criar({
				idempresa,
				idcfopentrada: dados.idcfopentrada,
				idcfopsaida: dados.idcfopsaida,
				uf: uf || null,
			});
		},
		onSuccess: () => {
			reset();
			onSucesso();
			onFechar();
		},
	});

	const onSubmit = (dados: CfopDeParaFormData) => {
		criarMutation.mutate(dados);
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
					<DialogTitle>Novo CFOP de-para</DialogTitle>
				</DialogHeader>

				<form onSubmit={handleSubmit(onSubmit)}>
					<FieldGroup>
						<CampoCfopProduto
							id="idcfopentrada"
							label="CFOP de entrada *"
							value={idcfopentrada}
							tipomovimento="E"
							onChange={(valor) =>
								setValue("idcfopentrada", valor, { shouldValidate: true })
							}
							erro={formState.errors.idcfopentrada?.message}
						/>

						<CampoCfopProduto
							id="idcfopsaida"
							label="CFOP de saída *"
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
						<Button type="submit" disabled={criarMutation.isPending}>
							{criarMutation.isPending ? "Salvando..." : "Salvar"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
