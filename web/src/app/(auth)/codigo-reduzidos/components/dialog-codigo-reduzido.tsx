"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type VincularCodigoReduzidoFormData,
	vincularCodigoReduzidoSchema,
} from "@/schemas/codigo-reduzido.schema";
import {
	type ContaContabil,
	contaContabilService,
} from "@/services/conta-contabil.service";

type DialogCodigoReduzidoProps = {
	aberto: boolean;
	conta: ContaContabil | null;
	onAbertoChange: (aberto: boolean) => void;
	onSalvo: () => void;
};

export function DialogCodigoReduzido({
	aberto,
	conta,
	onAbertoChange,
	onSalvo,
}: DialogCodigoReduzidoProps) {
	const { localStorageEmpresa } = useEmpresa();
	const modoEdicao = !!conta;
	const empresaId = localStorageEmpresa?.id;

	const form = useForm<VincularCodigoReduzidoFormData>({
		resolver: zodResolver(vincularCodigoReduzidoSchema),
		defaultValues: {
			idcontacontabil: conta?.id ?? "",
			codigoreduzido: conta?.codigoreduzido ?? "",
		},
	});

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		reset,
		formState: { errors },
	} = form;

	const idContaSelecionada = watch("idcontacontabil");

	useEffect(() => {
		if (!aberto) return;
		reset({
			idcontacontabil: conta?.id ?? "",
			codigoreduzido: conta?.codigoreduzido ?? "",
		});
	}, [aberto, conta, reset]);

	const { data: contasSemCodigo } = useQuery({
		queryKey: ["conta-contabil", "sem-codigo", empresaId],
		queryFn: () => {
			if (!empresaId) throw new Error("Empresa não selecionada");
			return contaContabilService.listar({
				idempresa: empresaId,
				situacaoCodigo: "sem",
				limit: 100,
				page: 1,
			});
		},
		enabled: aberto && !modoEdicao && !!empresaId,
	});

	const { data: proximoCodigo, isFetching: carregandoProximo } = useQuery({
		queryKey: ["conta-contabil", "proximo-codigo-reduzido", empresaId],
		queryFn: () => {
			if (!empresaId) throw new Error("Empresa não selecionada");
			return contaContabilService.buscarProximoCodigoReduzido(empresaId);
		},
		enabled: aberto && !!empresaId,
	});

	const { mutate: salvar, isPending } = useMutation({
		mutationFn: (dados: VincularCodigoReduzidoFormData) =>
			contaContabilService.atualizar(dados.idcontacontabil, {
				codigoreduzido: dados.codigoreduzido.trim(),
			}),
		onSuccess: () => {
			toast.success(
				modoEdicao
					? "Código reduzido atualizado"
					: "Código reduzido vinculado à conta",
			);
			onSalvo();
			onAbertoChange(false);
		},
		onError: (erro) => {
			toast.error(
				erro instanceof Error ? erro.message : "Erro ao salvar código reduzido",
			);
		},
	});

	const opcoesContas = (contasSemCodigo?.data ?? []).map((item) => ({
		value: item.id,
		label: item.codigoextenso
			? `${item.codigoextenso} — ${item.descricao}`
			: item.descricao,
	}));

	return (
		<Dialog open={aberto} onOpenChange={onAbertoChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{modoEdicao ? "Editar código reduzido" : "Vincular código reduzido"}
					</DialogTitle>
					<DialogDescription>
						O código reduzido identifica a conta na integração contábil. Ele
						precisa ser único na empresa.
					</DialogDescription>
				</DialogHeader>
				<form
					className="grid gap-4 py-2"
					onSubmit={handleSubmit((dados) => salvar(dados))}
				>
					<Field data-invalid={!!errors.idcontacontabil}>
						<FieldLabel htmlFor="codigo-reduzido-conta">
							Conta contábil
						</FieldLabel>
						{modoEdicao ? (
							<Input
								id="codigo-reduzido-conta"
								value={
									conta.codigoextenso
										? `${conta.codigoextenso} — ${conta.descricao}`
										: conta.descricao
								}
								readOnly
							/>
						) : (
							<Combobox
								options={opcoesContas}
								value={idContaSelecionada}
								onChange={(value) =>
									setValue("idcontacontabil", value, { shouldValidate: true })
								}
								placeholder="Selecione a conta sem código"
								searchPlaceholder="Buscar conta..."
								emptyMessage="Nenhuma conta sem código reduzido"
							/>
						)}
						<FieldError
							errors={errors.idcontacontabil ? [errors.idcontacontabil] : []}
						/>
					</Field>
					<Field data-invalid={!!errors.codigoreduzido}>
						<FieldLabel htmlFor="codigo-reduzido">Código reduzido</FieldLabel>
						<div className="flex gap-2">
							<Input
								id="codigo-reduzido"
								maxLength={20}
								placeholder="Ex: 101"
								aria-invalid={!!errors.codigoreduzido}
								{...register("codigoreduzido")}
							/>
							<Button
								type="button"
								variant="outline"
								disabled={carregandoProximo || !proximoCodigo?.codigo}
								onClick={() => {
									if (!proximoCodigo?.codigo) return;
									setValue("codigoreduzido", proximoCodigo.codigo, {
										shouldValidate: true,
									});
								}}
							>
								Próximo livre
							</Button>
						</div>
						<FieldError
							errors={errors.codigoreduzido ? [errors.codigoreduzido] : []}
						/>
						{proximoCodigo?.codigo ? (
							<p className="text-xs text-muted-foreground">
								Próximo código livre sugerido: {proximoCodigo.codigo}
							</p>
						) : null}
					</Field>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onAbertoChange(false)}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={isPending}>
							{isPending ? "Salvando..." : "Salvar"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
