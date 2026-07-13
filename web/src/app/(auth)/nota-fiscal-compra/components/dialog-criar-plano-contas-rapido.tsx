"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useEmpresa } from "@/hooks/use-empresa";
import { planoContasService } from "@/services/plano-contas.service";

const TIPO_CONTA_DESPESA = 2;

type DialogCriarPlanoContasRapidoProps = {
	aberto: boolean;
	onAbertoChange: (aberto: boolean) => void;
	onCriado: (id: string) => void;
};

export function DialogCriarPlanoContasRapido({
	aberto,
	onAbertoChange,
	onCriado,
}: DialogCriarPlanoContasRapidoProps) {
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const [nome, setNome] = useState("");

	const { mutate: criar, isPending } = useMutation({
		mutationFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			if (!nome.trim()) throw new Error("Informe o nome da conta");
			return planoContasService.criar({
				idempresa: empresa.id,
				nome: nome.trim(),
				tipomovimento: "S",
				inativo: 0,
				tipoconta: TIPO_CONTA_DESPESA,
			});
		},
		onSuccess: (plano) => {
			void queryClient.invalidateQueries({ queryKey: ["plano-contas"] });
			toast.success("Plano de contas cadastrado");
			onCriado(plano.id);
			onAbertoChange(false);
			setNome("");
		},
		onError: (erro) => {
			toast.error(
				erro instanceof Error ? erro.message : "Erro ao criar plano de contas",
			);
		},
	});

	return (
		<Dialog open={aberto} onOpenChange={onAbertoChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Novo plano de contas (despesa)</DialogTitle>
				</DialogHeader>
				<div className="grid gap-4 py-2">
					<Field>
						<FieldLabel htmlFor="plano-rapido-nome">Nome</FieldLabel>
						<Input
							id="plano-rapido-nome"
							value={nome}
							onChange={(e) => setNome(e.target.value)}
							maxLength={200}
							placeholder="Ex.: Compras de mercadorias"
						/>
					</Field>
					<p className="text-xs text-muted-foreground">
						Será criada uma conta de despesa (saída) ativa.
					</p>
				</div>
				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onAbertoChange(false)}
					>
						Cancelar
					</Button>
					<Button
						type="button"
						disabled={isPending || !nome.trim()}
						onClick={() => criar()}
					>
						{isPending ? "Salvando..." : "Cadastrar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
