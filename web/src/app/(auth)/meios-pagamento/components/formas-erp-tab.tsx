"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/table-skeleton";
import { Badge } from "@/components/ui/badge";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useEmpresa } from "@/hooks/use-empresa";
import { tipoDocumentoFinanceiroService } from "@/services/tipo-documento-financeiro.service";

const FORMAS_NFE = [
	{ codigo: "01", descricao: "Dinheiro" },
	{ codigo: "03", descricao: "Cartão de crédito" },
	{ codigo: "04", descricao: "Cartão de débito" },
	{ codigo: "15", descricao: "Boleto" },
	{ codigo: "17", descricao: "PIX" },
	{ codigo: "99", descricao: "Outros" },
];

export function FormasErpTab() {
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const [modalAberto, setModalAberto] = useState(false);
	const [descricao, setDescricao] = useState("");
	const [formaNfe, setFormaNfe] = useState("01");
	const [aprazo, setAprazo] = useState("0");

	const { data: formas = [], isLoading } = useQuery({
		queryKey: ["tipos-documento-financeiro", empresa?.id],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return tipoDocumentoFinanceiroService.listarTodos({
				idempresa: empresa.id,
				inativo: 0,
			});
		},
		enabled: !!empresa,
	});

	const { mutate: popularPadrao, isPending: populando } = useMutation({
		mutationFn: () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return tipoDocumentoFinanceiroService.popularPadrao(empresa.id);
		},
		onSuccess: (criados) => {
			void queryClient.invalidateQueries({
				queryKey: ["tipos-documento-financeiro"],
			});
			toast.success(
				criados.length > 0
					? `${criados.length} forma(s) padrão criada(s)`
					: "Formas padrão já existiam",
			);
		},
		onError: (erro) => {
			toast.error(erro instanceof Error ? erro.message : "Erro ao criar padrões");
		},
	});

	const { mutate: criarForma, isPending: criando } = useMutation({
		mutationFn: () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return tipoDocumentoFinanceiroService.criar({
				idempresa: empresa.id,
				descricao: descricao.trim(),
				formapagamentonfe: formaNfe,
				aprazo: aprazo === "1" ? 1 : 0,
				integracaixabanco: aprazo === "1" ? 0 : 1,
			});
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ["tipos-documento-financeiro"],
			});
			setModalAberto(false);
			setDescricao("");
			toast.success("Forma de pagamento criada");
		},
		onError: (erro) => {
			toast.error(erro instanceof Error ? erro.message : "Erro ao criar forma");
		},
	});

	if (!empresa) {
		return (
			<p className="px-4 text-muted-foreground">
				Selecione uma empresa para visualizar as formas de pagamento.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap gap-2 px-4">
				<Button variant="outline" onClick={() => popularPadrao()} disabled={populando}>
					{populando ? "Criando..." : "Criar formas padrão"}
				</Button>
				<Button onClick={() => setModalAberto(true)}>Nova forma ERP</Button>
			</div>

			<p className="px-4 text-sm text-muted-foreground">
				Estas formas são usadas na NF-e de venda, pedidos e financeiro (contas a
				receber / caixa). As condições de pagamento na outra aba definem apenas
				parcelas e prazos.
			</p>

			<div className="rounded-lg border bg-card mx-4">
				{isLoading ? (
					<TableSkeleton rows={6}>
						<TableHead>Descrição</TableHead>
						<TableHead>NF-e</TableHead>
						<TableHead>À prazo</TableHead>
						<TableHead>Caixa</TableHead>
					</TableSkeleton>
				) : formas.length === 0 ? (
					<div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
						<p>Nenhuma forma ERP cadastrada.</p>
						<Button variant="outline" onClick={() => popularPadrao()}>
							Criar Dinheiro, PIX, Cartão e Boleto
						</Button>
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Descrição</TableHead>
								<TableHead>Cód. NF-e</TableHead>
								<TableHead>À prazo</TableHead>
								<TableHead>Integra caixa</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{formas.map((forma) => (
								<TableRow key={forma.id}>
									<TableCell className="font-medium">{forma.descricao}</TableCell>
									<TableCell>{forma.formapagamentonfe ?? "—"}</TableCell>
									<TableCell>
										<Badge variant={forma.aprazo === 1 ? "default" : "secondary"}>
											{forma.aprazo === 1 ? "Sim" : "Não"}
										</Badge>
									</TableCell>
									<TableCell>
										{forma.integracaixabanco === 1 ? "Sim" : "Não"}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</div>

			<Dialog open={modalAberto} onOpenChange={setModalAberto}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Nova forma de pagamento (ERP)</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-2">
						<Field>
							<FieldLabel>Descrição</FieldLabel>
							<Input
								value={descricao}
								onChange={(event) => setDescricao(event.target.value)}
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
							<FieldLabel>Tipo</FieldLabel>
							<Select value={aprazo} onValueChange={setAprazo}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="0">À vista (caixa imediato)</SelectItem>
									<SelectItem value="1">A prazo (contas a receber)</SelectItem>
								</SelectContent>
							</Select>
						</Field>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setModalAberto(false)}>
							Cancelar
						</Button>
						<Button
							onClick={() => criarForma()}
							disabled={criando || !descricao.trim()}
						>
							{criando ? "Salvando..." : "Salvar"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
