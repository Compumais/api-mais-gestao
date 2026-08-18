"use client";

import { IconTrash } from "@tabler/icons-react";
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useEmpresa } from "@/hooks/use-empresa";
import { bandeiraCartaoService } from "@/services/bandeira-cartao.service";

export function BandeirasCartaoTab() {
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const [modalAberto, setModalAberto] = useState(false);
	const [descricao, setDescricao] = useState("");
	const [codigo, setCodigo] = useState("");

	const { data: bandeiras = [], isLoading } = useQuery({
		queryKey: ["bandeiras-cartao", empresa?.id],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return bandeiraCartaoService.listarTodos({
				idempresa: empresa.id,
				inativo: 0,
			});
		},
		enabled: !!empresa,
	});

	const { mutate: popularPadrao, isPending: populando } = useMutation({
		mutationFn: () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return bandeiraCartaoService.popularPadrao(empresa.id);
		},
		onSuccess: ({ criados }) => {
			void queryClient.invalidateQueries({ queryKey: ["bandeiras-cartao"] });
			toast.success(
				criados > 0
					? `${criados} bandeira(s) padrão criada(s)`
					: "Bandeiras padrão já existiam",
			);
		},
		onError: (erro) => {
			toast.error(
				erro instanceof Error ? erro.message : "Erro ao criar bandeiras padrão",
			);
		},
	});

	const { mutate: criarBandeira, isPending: criando } = useMutation({
		mutationFn: () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return bandeiraCartaoService.criar({
				idempresa: empresa.id,
				descricao: descricao.trim(),
				codigo: codigo.trim() || null,
			});
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["bandeiras-cartao"] });
			setModalAberto(false);
			setDescricao("");
			setCodigo("");
			toast.success("Bandeira criada");
		},
		onError: (erro) => {
			toast.error(
				erro instanceof Error ? erro.message : "Erro ao criar bandeira",
			);
		},
	});

	const { mutate: excluirBandeira } = useMutation({
		mutationFn: bandeiraCartaoService.deletar,
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["bandeiras-cartao"] });
			toast.success("Bandeira excluída");
		},
		onError: (erro) => {
			toast.error(
				erro instanceof Error ? erro.message : "Erro ao excluir bandeira",
			);
		},
	});

	if (!empresa) {
		return (
			<p className="px-4 text-muted-foreground">
				Selecione uma empresa para visualizar as bandeiras de cartão.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap gap-2 px-4">
				<Button
					variant="outline"
					onClick={() => popularPadrao()}
					disabled={populando}
				>
					{populando ? "Criando..." : "Criar bandeiras padrão"}
				</Button>
				<Button onClick={() => setModalAberto(true)}>Nova bandeira</Button>
			</div>

			<p className="px-4 text-sm text-muted-foreground">
				Bandeiras usadas no PDV ao lançar cartão sem SiTef e gravadas no
				financeiro. Visa, Mastercard, Elo e outras podem ser criadas em lote.
			</p>

			<div className="rounded-lg border bg-card mx-4">
				{isLoading ? (
					<TableSkeleton rows={6}>
						<TableHead>Descrição</TableHead>
						<TableHead>Código</TableHead>
						<TableHead>Status</TableHead>
						<TableHead className="w-12 text-end">Ações</TableHead>
					</TableSkeleton>
				) : bandeiras.length === 0 ? (
					<div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
						<p>Nenhuma bandeira cadastrada.</p>
						<Button variant="outline" onClick={() => popularPadrao()}>
							Criar Visa, Mastercard, Elo e outras
						</Button>
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Descrição</TableHead>
								<TableHead>Código</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="w-12 text-end">Ações</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{bandeiras.map((bandeira) => (
								<TableRow key={bandeira.id}>
									<TableCell className="font-medium">
										{bandeira.descricao}
									</TableCell>
									<TableCell>{bandeira.codigo || "—"}</TableCell>
									<TableCell>
										{bandeira.inativo === 1 ? (
											<Badge variant="secondary">Inativo</Badge>
										) : (
											<Badge variant="outline">Ativo</Badge>
										)}
									</TableCell>
									<TableCell className="text-right">
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8"
											aria-label={`Excluir ${bandeira.descricao}`}
											onClick={() => {
												toast.message(
													`Excluir a bandeira ${bandeira.descricao}?`,
													{
														position: "top-center",
														action: {
															label: "Excluir",
															onClick: () => excluirBandeira(bandeira.id),
														},
													},
												);
											}}
										>
											<IconTrash className="size-4" />
										</Button>
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
						<DialogTitle>Nova bandeira de cartão</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-2">
						<Field>
							<FieldLabel>Descrição</FieldLabel>
							<Input
								value={descricao}
								onChange={(event) => setDescricao(event.target.value)}
								maxLength={60}
								placeholder="Visa"
							/>
						</Field>
						<Field>
							<FieldLabel>Código (opcional)</FieldLabel>
							<Input
								value={codigo}
								onChange={(event) => setCodigo(event.target.value)}
								maxLength={30}
								placeholder="visa"
							/>
						</Field>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setModalAberto(false)}>
							Cancelar
						</Button>
						<Button
							onClick={() => criarBandeira()}
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
