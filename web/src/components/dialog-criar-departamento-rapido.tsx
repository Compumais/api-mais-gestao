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
import { departamentoService } from "@/services/departamento.service";

function gerarCodigoAutomatico(descricao: string, codigoInformado: string) {
	const manual = codigoInformado.trim();
	if (manual) return manual.slice(0, 20);

	const aPartirDescricao = descricao
		.trim()
		.toUpperCase()
		.replace(/\s+/g, "_")
		.replace(/[^\w-]/g, "")
		.slice(0, 20);
	if (aPartirDescricao) return aPartirDescricao;

	return `D${Date.now().toString(36).slice(-6).toUpperCase()}`;
}

type DialogCriarDepartamentoRapidoProps = {
	aberto: boolean;
	onAbertoChange: (aberto: boolean) => void;
	onCriado: (id: string) => void;
};

export function DialogCriarDepartamentoRapido({
	aberto,
	onAbertoChange,
	onCriado,
}: DialogCriarDepartamentoRapidoProps) {
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const [codigo, setCodigo] = useState("");
	const [descricao, setDescricao] = useState("");

	const fechar = () => {
		onAbertoChange(false);
		setCodigo("");
		setDescricao("");
	};

	const { mutate: criar, isPending } = useMutation({
		mutationFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			const descricaoTrim = descricao.trim();
			if (!descricaoTrim) throw new Error("Informe a descrição");
			return departamentoService.criar({
				idempresa: empresa.id,
				descricao: descricaoTrim.slice(0, 12),
				codigo: gerarCodigoAutomatico(descricaoTrim, codigo),
				inativo: 0,
			});
		},
		onSuccess: (departamento) => {
			void queryClient.invalidateQueries({ queryKey: ["departamentos"] });
			toast.success("Departamento cadastrado");
			onCriado(departamento.id);
			fechar();
		},
		onError: (erro) => {
			toast.error(
				erro instanceof Error ? erro.message : "Erro ao criar departamento",
			);
		},
	});

	return (
		<Dialog
			open={aberto}
			onOpenChange={(open) => {
				if (!open) fechar();
				else onAbertoChange(true);
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Novo departamento</DialogTitle>
				</DialogHeader>
				<div className="grid gap-4 py-2">
					<Field>
						<FieldLabel htmlFor="departamento-rapido-descricao">
							Descrição *
						</FieldLabel>
						<Input
							id="departamento-rapido-descricao"
							value={descricao}
							onChange={(e) => setDescricao(e.target.value)}
							maxLength={12}
							placeholder="Ex.: Comercial"
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="departamento-rapido-codigo">Código</FieldLabel>
						<Input
							id="departamento-rapido-codigo"
							value={codigo}
							onChange={(e) => setCodigo(e.target.value)}
							maxLength={20}
							placeholder="Opcional — gerado automaticamente"
						/>
					</Field>
					<p className="text-xs text-muted-foreground">
						Departamento ativo, vinculado à empresa selecionada.
					</p>
				</div>
				<DialogFooter>
					<Button type="button" variant="outline" onClick={fechar}>
						Cancelar
					</Button>
					<Button
						type="button"
						disabled={isPending || !descricao.trim()}
						onClick={() => criar()}
					>
						{isPending ? "Salvando..." : "Cadastrar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
