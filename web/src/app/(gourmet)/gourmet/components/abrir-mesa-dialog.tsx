"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useEmpresa } from "@/hooks/use-empresa";
import { STATUS_MESA } from "@/lib/gourmet-utils";
import {
	type AbrirMesaFormData,
	abrirMesaSchema,
} from "@/schemas/conta-mesa.schema";
import { contaMesaService } from "@/services/conta-mesa.service";

interface AbrirMesaDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mesasAbertas: number[];
}

export function AbrirMesaDialog({
	open,
	onOpenChange,
	mesasAbertas,
}: AbrirMesaDialogProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { user } = useAuth();
	const { localStorageEmpresa: empresa } = useEmpresa();

	const form = useForm<AbrirMesaFormData>({
		resolver: zodResolver(abrirMesaSchema),
		defaultValues: {
			numeromesa: undefined,
			numeropessoas: 1,
			observacao: "",
		},
	});

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = form;

	useEffect(() => {
		if (!open) return;
		reset({
			numeromesa: undefined,
			numeropessoas: 1,
			observacao: "",
		});
	}, [open, reset]);

	const { mutate, isPending } = useMutation({
		mutationFn: async (dados: AbrirMesaFormData) => {
			if (!empresa?.id || !user?.id) {
				throw new Error("Empresa ou usuário não encontrado");
			}

			if (mesasAbertas.includes(dados.numeromesa)) {
				throw new Error(`Mesa ${dados.numeromesa} já está aberta`);
			}

			return contaMesaService.criar({
				idempresa: empresa.id,
				idusuario: user.id,
				numeromesa: dados.numeromesa,
				status: STATUS_MESA.ABERTO,
				numeropessoas:
					dados.numeropessoas !== undefined && !Number.isNaN(dados.numeropessoas)
						? dados.numeropessoas
						: 1,
				observacao: dados.observacao || undefined,
				idgarcom: user.id,
			});
		},
		onSuccess: (conta) => {
			queryClient.invalidateQueries({ queryKey: ["contas-mesa"] });
			toast.success(`Mesa ${conta.numeromesa} aberta com sucesso!`);
			reset();
			onOpenChange(false);
			router.push(`/gourmet/conta/${conta.id}`);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao abrir mesa");
		},
	});

	const onSubmit = handleSubmit((dados) => {
		const payload: AbrirMesaFormData = {
			...dados,
			numeropessoas:
				dados.numeropessoas !== undefined && !Number.isNaN(dados.numeropessoas)
					? dados.numeropessoas
					: 1,
		};
		mutate(payload);
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Abrir nova mesa</DialogTitle>
					<DialogDescription>
						Informe o número da mesa para iniciar uma comanda.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={onSubmit}>
					<FieldGroup className="gap-4 py-2">
						<Field>
							<FieldLabel htmlFor="numeromesa">Número da mesa</FieldLabel>
							<Input
								id="numeromesa"
								type="number"
								min={1}
								placeholder="Ex: 5"
								{...register("numeromesa", { valueAsNumber: true })}
							/>
							<FieldError>{errors.numeromesa?.message}</FieldError>
						</Field>
						<Field>
							<FieldLabel htmlFor="numeropessoas">
								Número de pessoas
							</FieldLabel>
							<Input
								id="numeropessoas"
								type="number"
								min={1}
								defaultValue={1}
								{...register("numeropessoas", { valueAsNumber: true })}
							/>
							<FieldError>{errors.numeropessoas?.message}</FieldError>
						</Field>
						<Field>
							<FieldLabel htmlFor="observacao">Observação (opcional)</FieldLabel>
							<Textarea
								id="observacao"
								placeholder="Observações da mesa"
								{...register("observacao")}
							/>
						</Field>
					</FieldGroup>
					<DialogFooter className="mt-4">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={isPending || !empresa}>
							{isPending ? "Abrindo..." : "Abrir mesa"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
