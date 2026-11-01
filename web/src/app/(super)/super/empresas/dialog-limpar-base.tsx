"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type AdminEmpresa, adminService } from "@/services/admin.service";

const GRUPOS = [
	{
		id: "produtos",
		titulo: "Produtos e estoque",
		detalhe:
			"Cadastro, fotos, estoque, kits e fichas. Itens que exigem o produto são removidos.",
	},
	{
		id: "pagar",
		titulo: "Contas a pagar",
		detalhe: "Títulos a pagar e os lançamentos desses títulos.",
	},
	{
		id: "receber",
		titulo: "Contas a receber",
		detalhe: "Títulos a receber e os lançamentos desses títulos.",
	},
	{
		id: "vendas",
		titulo: "Vendas e PDV",
		detalhe: "Vendas, DAV, mesas, fechamentos e pedidos do cardápio.",
	},
	{
		id: "fiscal",
		titulo: "Notas fiscais",
		detalhe: "Notas emitidas, XML e inventário fiscal.",
	},
	{
		id: "compras",
		titulo: "Compras",
		detalhe: "Pedidos de compra e cotações.",
	},
	{
		id: "ordens",
		titulo: "Ordens de serviço",
		detalhe: "Ordens, itens, eventos e faturamento.",
	},
	{
		id: "pessoas",
		titulo: "Clientes e fornecedores",
		detalhe: "O cadastro de pessoas. Títulos já lançados ficam sem o vínculo.",
	},
	{
		id: "cadastros",
		titulo: "Cadastros auxiliares",
		detalhe:
			"Grupos, marcas, departamentos, cardápio, centros de custo e locais.",
	},
] as const;

type DialogLimparBaseProps = {
	empresa: AdminEmpresa | null;
	open: boolean;
	onOpenChange: (aberto: boolean) => void;
};

export function DialogLimparBase({
	empresa,
	open,
	onOpenChange,
}: DialogLimparBaseProps) {
	const [grupos, setGrupos] = useState<Set<string>>(new Set());
	const [confirmacao, setConfirmacao] = useState("");
	const tudo = grupos.has("tudo");
	const nomeConfere = empresa
		? confirmacao.trim().toLocaleLowerCase("pt-BR") ===
			empresa.nome.trim().toLocaleLowerCase("pt-BR")
		: false;

	useEffect(() => {
		if (!open) return;
		setGrupos(new Set());
		setConfirmacao("");
	}, [open, empresa?.id]);

	const limpeza = useMutation({
		mutationFn: (body: { grupos: string[]; confirmacao: string }) => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return adminService.limparBaseEmpresa(empresa.id, body);
		},
		onSuccess: (resultado) => {
			const aviso = resultado.aviso ? ` ${resultado.aviso}` : "";
			const padroes = resultado.padroesRepostos
				? " Os dados padrão da empresa foram recriados."
				: "";
			toast.success(
				`${resultado.total} registro(s) apagado(s).${padroes}${aviso}`,
			);
			onOpenChange(false);
		},
		onError: (erro: Error) => {
			toast.error("Não foi possível limpar a base", {
				description: erro.message,
			});
		},
	});

	function alternar(id: string, marcado: boolean | "indeterminate") {
		setGrupos((atual) => {
			if (id === "tudo") {
				return marcado === true ? new Set(["tudo"]) : new Set();
			}
			const proximo = new Set(atual);
			proximo.delete("tudo");
			if (marcado === true) proximo.add(id);
			else proximo.delete(id);
			return proximo;
		});
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Limpar base</DialogTitle>
					<DialogDescription>
						Apaga registros de {empresa?.nome}. A empresa, os usuários e a
						assinatura permanecem.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					<label className="flex items-start gap-2 rounded-md border border-destructive/40 p-3">
						<Checkbox
							checked={tudo}
							onCheckedChange={(marcado) => alternar("tudo", marcado)}
						/>
						<span>
							<span className="block font-medium">Limpar tudo</span>
							<span className="text-muted-foreground">
								Apaga os registros operacionais e as configurações desta
								empresa, inclusive certificado e parâmetros fiscais. O plano de
								contas e os demais padrões são recriados.
							</span>
						</span>
					</label>

					<div className="space-y-2">
						{GRUPOS.map((grupo) => (
							<label key={grupo.id} className="flex items-start gap-2">
								<Checkbox
									checked={tudo || grupos.has(grupo.id)}
									disabled={tudo}
									onCheckedChange={(marcado) => alternar(grupo.id, marcado)}
								/>
								<span>
									<span className="block font-medium">{grupo.titulo}</span>
									<span className="text-muted-foreground">{grupo.detalhe}</span>
								</span>
							</label>
						))}
					</div>

					<div className="space-y-2">
						<Label htmlFor="confirmacao-limpeza">
							Digite {empresa?.nome} para confirmar
						</Label>
						<Input
							id="confirmacao-limpeza"
							value={confirmacao}
							autoComplete="off"
							onChange={(evento) => setConfirmacao(evento.target.value)}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Cancelar
					</Button>
					<Button
						type="button"
						variant="destructive"
						disabled={
							!empresa || !nomeConfere || grupos.size === 0 || limpeza.isPending
						}
						onClick={() =>
							limpeza.mutate({
								grupos: tudo ? ["tudo"] : [...grupos],
								confirmacao,
							})
						}
					>
						{limpeza.isPending ? "Apagando..." : "Apagar registros"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
