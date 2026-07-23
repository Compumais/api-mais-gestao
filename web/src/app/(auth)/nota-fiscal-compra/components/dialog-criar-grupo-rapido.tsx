"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useEmpresa } from "@/hooks/use-empresa";
import { hierarquiasService } from "@/services/hierarquias.service";

const CLASSE_OPCOES = [
	{ value: "0", label: "Revenda" },
	{ value: "1", label: "Matéria-prima" },
	{ value: "2", label: "Mat. embalagem" },
	{ value: "3", label: "Consumo interno" },
] as const;

type DialogCriarGrupoRapidoProps = {
	aberto: boolean;
	onAbertoChange: (aberto: boolean) => void;
	onCriado: (id: string) => void;
};

export function DialogCriarGrupoRapido({
	aberto,
	onAbertoChange,
	onCriado,
}: DialogCriarGrupoRapidoProps) {
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const [nome, setNome] = useState("");
	const [codigo, setCodigo] = useState("");
	const [classe, setClasse] = useState("0");

	useEffect(() => {
		if (!aberto || !empresa) return;
		void hierarquiasService
			.buscarProximoCodigo(empresa.id)
			.then((res) => setCodigo(res.codigo))
			.catch(() => setCodigo(""));
	}, [aberto, empresa]);

	const { mutate: criar, isPending } = useMutation({
		mutationFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			if (!nome.trim()) throw new Error("Informe o nome do grupo");
			return hierarquiasService.criar({
				idempresa: empresa.id,
				nome: nome.trim(),
				codigo: codigo.trim() || null,
				classe: Number.parseInt(classe, 10),
			});
		},
		onSuccess: (grupo) => {
			void queryClient.invalidateQueries({ queryKey: ["hierarquias"] });
			toast.success("Grupo cadastrado");
			onCriado(grupo.id);
			onAbertoChange(false);
			setNome("");
			setClasse("0");
		},
		onError: (erro) => {
			toast.error(erro instanceof Error ? erro.message : "Erro ao criar grupo");
		},
	});

	return (
		<Dialog open={aberto} onOpenChange={onAbertoChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Novo grupo de produto</DialogTitle>
				</DialogHeader>
				<div className="grid gap-4 py-2">
					<Field>
						<FieldLabel htmlFor="grupo-rapido-codigo">Código</FieldLabel>
						<Input
							id="grupo-rapido-codigo"
							value={codigo}
							onChange={(e) => setCodigo(e.target.value)}
							maxLength={20}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="grupo-rapido-nome">Nome</FieldLabel>
						<Input
							id="grupo-rapido-nome"
							value={nome}
							onChange={(e) => setNome(e.target.value)}
							maxLength={120}
						/>
					</Field>
					<Field>
						<FieldLabel>Classe</FieldLabel>
						<Select value={classe} onValueChange={setClasse}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{CLASSE_OPCOES.map((opcao) => (
									<SelectItem key={opcao.value} value={opcao.value}>
										{opcao.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>
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
