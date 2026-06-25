"use client";

import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/table-skeleton";
import { Button } from "@/components/ui/button";
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
import {
	type TaxaUf,
	taxaUfService,
} from "@/services/taxauf.service";
import { ModalTaxaUf } from "./components/modal-taxa-uf";

export default function TaxasPage() {
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const [modalAberto, setModalAberto] = useState(false);
	const [registroEdicao, setRegistroEdicao] = useState<TaxaUf | null>(null);
	const [pagina, setPagina] = useState(1);
	const [busca, setBusca] = useState("");

	const { data, isLoading } = useQuery({
		queryKey: ["taxas-uf", empresa?.id, pagina, busca],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return taxaUfService.listar({
				idempresa: empresa.id,
				page: pagina,
				limit: 10,
				busca: busca || undefined,
			});
		},
		enabled: !!empresa,
	});

	const excluirMutation = useMutation({
		mutationFn: async (id: string) => {
			if (!empresa) throw new Error("Empresa não selecionada");
			await taxaUfService.excluir(id, empresa.id);
		},
		onSuccess: () => {
			toast.success("Taxa excluída");
			queryClient.invalidateQueries({ queryKey: ["taxas-uf", empresa?.id] });
		},
		onError: () => {
			toast.error("Não foi possível excluir a taxa");
		},
	});

	if (!empresa) {
		return (
			<div className="px-4">
				<p className="text-muted-foreground text-sm">
					Selecione uma empresa para gerenciar as taxas.
				</p>
			</div>
		);
	}

	const registros = data?.data ?? [];
	const paginacao = data?.paginacao;

	return (
		<main className="px-4 space-y-6">
			<header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold">Taxas por UF</h1>
					<p className="text-muted-foreground text-sm">
						Cadastro de alíquotas de ICMS por estado para ECF/PDV. Cada empresa
						possui seu próprio conjunto de taxas.
					</p>
				</div>
				<Button
					onClick={() => {
						setRegistroEdicao(null);
						setModalAberto(true);
					}}
				>
					<IconPlus className="mr-2 h-4 w-4" aria-hidden="true" />
					Nova taxa
				</Button>
			</header>

			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<Input
					placeholder="Buscar por código ou descrição..."
					value={busca}
					onChange={(evento) => {
						setBusca(evento.target.value);
						setPagina(1);
					}}
					className="max-w-sm"
				/>
			</div>

			{isLoading ? (
				<div className="rounded-lg border">
					<TableSkeleton rows={5}>
						<TableHead>Código</TableHead>
						<TableHead>Descrição</TableHead>
						<TableHead className="w-28 text-right">Ações</TableHead>
					</TableSkeleton>
				</div>
			) : (
				<div className="rounded-lg border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Código</TableHead>
								<TableHead>Descrição</TableHead>
								<TableHead className="w-28 text-right">Ações</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{registros.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={3}
										className="text-center text-muted-foreground"
									>
										Nenhuma taxa cadastrada para esta empresa.
									</TableCell>
								</TableRow>
							) : (
								registros.map((registro) => (
									<TableRow key={registro.id}>
										<TableCell className="font-mono">
											{registro.codigo}
										</TableCell>
										<TableCell>{registro.descricao}</TableCell>
										<TableCell className="text-right">
											<div className="flex justify-end gap-1">
												<Button
													type="button"
													variant="ghost"
													size="icon"
													aria-label="Editar taxa"
													onClick={() => {
														setRegistroEdicao(registro);
														setModalAberto(true);
													}}
												>
													<IconPencil className="h-4 w-4" aria-hidden="true" />
												</Button>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													aria-label="Excluir taxa"
													onClick={() => excluirMutation.mutate(registro.id)}
													disabled={excluirMutation.isPending}
												>
													<IconTrash className="h-4 w-4" aria-hidden="true" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>
			)}

			{paginacao && paginacao.totalPages > 1 && (
				<div className="flex items-center justify-end gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={pagina <= 1}
						onClick={() => setPagina((valor) => valor - 1)}
					>
						Anterior
					</Button>
					<span className="text-sm text-muted-foreground">
						Página {paginacao.page} de {paginacao.totalPages}
					</span>
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={pagina >= paginacao.totalPages}
						onClick={() => setPagina((valor) => valor + 1)}
					>
						Próxima
					</Button>
				</div>
			)}

			<ModalTaxaUf
				aberto={modalAberto}
				idempresa={empresa.id}
				registro={registroEdicao}
				onFechar={() => {
					setModalAberto(false);
					setRegistroEdicao(null);
				}}
				onSucesso={() => {
					toast.success(
						registroEdicao
							? "Taxa atualizada com sucesso"
							: "Taxa criada com sucesso",
					);
					queryClient.invalidateQueries({
						queryKey: ["taxas-uf", empresa.id],
					});
				}}
			/>
		</main>
	);
}
