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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useEmpresa } from "@/hooks/use-empresa";
import { tipoDocumentoFinanceiroService } from "@/services/tipo-documento-financeiro.service";

const FORMAS_NFE = [
	{ codigo: "01", descricao: "Dinheiro" },
	{ codigo: "03", descricao: "Cartão de crédito" },
	{ codigo: "04", descricao: "Cartão de débito" },
	{ codigo: "15", descricao: "Boleto" },
	{ codigo: "17", descricao: "PIX" },
	{ codigo: "99", descricao: "Outros" },
] as const;

type DialogCriarFormaPagamentoRapidoProps = {
	aberto: boolean;
	onAbertoChange: (aberto: boolean) => void;
	onCriado: (id: string) => void;
};

export function DialogCriarFormaPagamentoRapido({
	aberto,
	onAbertoChange,
	onCriado,
}: DialogCriarFormaPagamentoRapidoProps) {
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const [descricao, setDescricao] = useState("");
	const [formaNfe, setFormaNfe] = useState("15");
	const [aprazo, setAprazo] = useState("1");

	const { mutate: criar, isPending } = useMutation({
		mutationFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			if (!descricao.trim()) throw new Error("Informe a descrição");
			return tipoDocumentoFinanceiroService.criar({
				idempresa: empresa.id,
				descricao: descricao.trim(),
				formapagamentonfe: formaNfe,
				aprazo: aprazo === "1" ? 1 : 0,
				integracaixabanco: aprazo === "1" ? 0 : 1,
			});
		},
		onSuccess: (forma) => {
			void queryClient.invalidateQueries({
				queryKey: ["tipos-documento-financeiro"],
			});
			toast.success("Forma de pagamento cadastrada");
			onCriado(forma.id);
			onAbertoChange(false);
			setDescricao("");
			setFormaNfe("15");
			setAprazo("1");
		},
		onError: (erro) => {
			toast.error(
				erro instanceof Error ? erro.message : "Erro ao criar forma de pagamento",
			);
		},
	});

	return (
		<Dialog open={aberto} onOpenChange={onAbertoChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Nova forma de pagamento</DialogTitle>
				</DialogHeader>
				<div className="grid gap-4 py-2">
					<Field>
						<FieldLabel htmlFor="forma-rapido-descricao">Descrição</FieldLabel>
						<Input
							id="forma-rapido-descricao"
							value={descricao}
							onChange={(e) => setDescricao(e.target.value)}
							maxLength={50}
						/>
					</Field>
					<Field>
						<FieldLabel>Forma NF-e (tPag)</FieldLabel>
						<Select value={formaNfe} onValueChange={setFormaNfe}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{FORMAS_NFE.map((forma) => (
									<SelectItem key={forma.codigo} value={forma.codigo}>
										{forma.codigo} — {forma.descricao}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>
					<Field>
						<FieldLabel>À prazo</FieldLabel>
						<Select value={aprazo} onValueChange={setAprazo}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="0">Não</SelectItem>
								<SelectItem value="1">Sim</SelectItem>
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
