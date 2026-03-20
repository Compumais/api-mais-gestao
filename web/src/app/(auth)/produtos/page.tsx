"use client";

import { IconPlus } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { TableSkeleton } from "@/components/table-skeleton";
import { Button } from "@/components/ui/button";
import { TableCell } from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { useEmpresa } from "@/provider/empresa-provider";
import { PageContainer } from "../components/page-container";

export default function ProdutosPage() {
	const router = useRouter();
	const { empresa } = useEmpresa();
	const { user } = useAuth();

	const handleEdit = () => {
		// TODO: Implementar ação de editar produto
	};

	const handleDelete = (id: string) => {
		// TODO: Implementar ação de deletar produto
	};

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex items-center justify-between px-4">
					<h1 className="text-2xl font-bold">Produtos</h1>

					<Button
						onClick={() => router.push("/produtos/novo")}
						className="gap-2"
						disabled={!empresa}
					>
						<IconPlus className="size-4" />
						Incluir Novo Produto
					</Button>
				</div>
				<div className="rounded-lg border bg-card mx-4">
					{!empresa ? (
						<div className="flex items-center justify-center py-8">
							<p className="text-muted-foreground">
								Selecione uma empresa para visualizar os produtos
							</p>
						</div>
					) : (
						<TableSkeleton rows={10} columns={5}>
							<TableCell>Nome</TableCell>
							<TableCell>Descrição</TableCell>
							<TableCell>Preço</TableCell>
							<TableCell>Estoque</TableCell>
							<TableCell>Ações</TableCell>
						</TableSkeleton>
					)}
				</div>
			</div>
		</PageContainer>
	);
}
