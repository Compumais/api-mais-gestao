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

interface AbrirMesaGarcomDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mesasAbertas: number[];
}

export function AbrirMesaGarcomDialog({
	open,
	onOpenChange,
	mesasAbertas,
}: AbrirMesaGarcomDialogProps) {
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
				throw new Error(`Mesa/comanda ${dados.numeromesa} já está aberta`);
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
			toast.success(`Mesa/comanda ${conta.numeromesa} aberta!`);
			reset();
			onOpenChange(false);
			router.push(`/garcom/comanda/${conta.id}`);
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
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Nova mesa / comanda</DialogTitle>
					<DialogDescription>
						Informe o número para iniciar o pedido.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={onSubmit}>
					<FieldGroup className="gap-4 py-2">
						<Field>
							<FieldLabel htmlFor="garcom-numeromesa">
								Número da mesa / comanda
							</FieldLabel>
							<Input
								id="garcom-numeromesa"
								type="number"
								min={1}
								inputMode="numeric"
								placeholder="Ex: 5"
								className="text-lg"
								{...register("numeromesa", { valueAsNumber: true })}
							/>
							<FieldError>{errors.numeromesa?.message}</FieldError>
						</Field>
						<Field>
							<FieldLabel htmlFor="garcom-numeropessoas">
								Número de pessoas
							</FieldLabel>
							<Input
								id="garcom-numeropessoas"
								type="number"
								min={1}
								inputMode="numeric"
								defaultValue={1}
								{...register("numeropessoas", { valueAsNumber: true })}
							/>
							<FieldError>{errors.numeropessoas?.message}</FieldError>
						</Field>
						<Field>
							<FieldLabel htmlFor="garcom-observacao">
								Observação (opcional)
							</FieldLabel>
							<Textarea
								id="garcom-observacao"
								placeholder="Observações"
								{...register("observacao")}
							/>
						</Field>
					</FieldGroup>
					<DialogFooter className="mt-4 gap-2 sm:gap-0">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={isPending || !empresa} size="lg">
							{isPending ? "Abrindo..." : "Abrir"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
