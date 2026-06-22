"use client";

import { IconFileImport, IconPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useContaCorrenteLancamentos } from "@/hooks/use-conta-corrente-lancamento";
import { useEmpresa } from "@/hooks/use-empresa";
import type { ContaCorrenteLancamento } from "@/services/conta-corrente-lancamento.service";
import { contasCorrentesService } from "@/services/contas-correntes.service";
import { PageContainer } from "../components/page-container";
import { MovimentacaoForm } from "./components/movimentacao-form";
import { MovimentacoesTable } from "./components/movimentacoes-table";

export default function MovimentacoesPage() {
	const searchParams = useSearchParams();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const [idcontacorrente, setIdContaCorrente] = useState<string>(
		searchParams.get("idcontacorrente") ?? "",
	);
	const [openForm, setOpenForm] = useState(false);
	const [lancamentoEditando, setLancamentoEditando] =
		useState<ContaCorrenteLancamento | null>(null);
	const [modoForm, setModoForm] = useState<"criar" | "editar">("criar");

	useEffect(() => {
		const idDaUrl = searchParams.get("idcontacorrente");
		if (idDaUrl) {
			setIdContaCorrente(idDaUrl);
		}
	}, [searchParams]);

	// Buscar contas correntes para o select
	const { data: contasCorrentesData } = useQuery({
		queryKey: ["contas-correntes", empresa?.id],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return await contasCorrentesService.listar({
				idempresa: empresa.id,
				limit: 100,
			});
		},
		enabled: !!empresa,
	});

	// Buscar movimentações
	const { data: lancamentosData, isLoading } = useContaCorrenteLancamentos({
		idcontacorrente,
		page: 1,
		limit: 50,
		enabled: !!idcontacorrente,
	});

	const handleNovaMovimentacao = () => {
		setLancamentoEditando(null);
		setModoForm("criar");
		setOpenForm(true);
	};

	const handleEdit = (lancamento: ContaCorrenteLancamento) => {
		setLancamentoEditando(lancamento);
		setModoForm("editar");
		setOpenForm(true);
	};

	const handleCloseForm = () => {
		setOpenForm(false);
		setLancamentoEditando(null);
	};

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex items-center justify-between px-4">
					<h1 className="text-2xl font-bold">Movimentações</h1>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							className="gap-2"
							disabled={!idcontacorrente}
							asChild={!!idcontacorrente}
						>
							{idcontacorrente ? (
								<Link
									href={`/movimentacoes/importar-ofx?idcontacorrente=${idcontacorrente}`}
								>
									<IconFileImport className="size-4" />
									Importar OFX
								</Link>
							) : (
								<>
									<IconFileImport className="size-4" />
									Importar OFX
								</>
							)}
						</Button>
						<Button onClick={handleNovaMovimentacao} className="gap-2">
							<IconPlus className="size-4" />
							Nova movimentação
						</Button>
					</div>
				</div>

				{!empresa ? (
					<div className="flex items-center justify-center py-8 px-4">
						<p className="text-muted-foreground">
							Selecione uma empresa para visualizar as movimentações
						</p>
					</div>
				) : (
					<div className="space-y-4 px-4">
						<div className="max-w-xs">
							<Select
								value={idcontacorrente}
								onValueChange={setIdContaCorrente}
							>
								<SelectTrigger>
									<SelectValue placeholder="Selecione uma conta corrente" />
								</SelectTrigger>
								<SelectContent>
									{contasCorrentesData?.data.map((conta) => (
										<SelectItem key={conta.id} value={conta.id}>
											{conta.descricao || conta.agencia || conta.id}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{idcontacorrente ? (
							<MovimentacoesTable
								data={lancamentosData?.data || []}
								onEdit={handleEdit}
								isLoading={isLoading}
							/>
						) : (
							<div className="flex items-center justify-center py-8 rounded-lg border">
								<p className="text-muted-foreground">
									Selecione uma conta corrente para visualizar as movimentações
								</p>
							</div>
						)}
					</div>
				)}

				<MovimentacaoForm
					open={openForm}
					onOpenChange={handleCloseForm}
					modo={modoForm}
					lancamento={lancamentoEditando}
				/>
			</div>
		</PageContainer>
	);
}
