"use client";

import { IconPlus, IconPencil, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, FileUp } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ImportarContratosDialog } from "@/app/(auth)/contratos/components/importar-contratos-dialog";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
	type FormatoImportacaoContratos,
	contratoService,
} from "@/services/contrato.service";

const FLUXO_LABEL: Record<number, string> = {
	1: "NFS-e + CR + Boleto",
	2: "CR + Boleto",
	3: "Somente CR",
};

export default function ContratosPage() {
	const { empresa } = useEmpresa();
	const queryClient = useQueryClient();
	const [descricao, setDescricao] = useState("");
	const [formatoImportacao, setFormatoImportacao] =
		useState<FormatoImportacaoContratos | null>(null);

	const { data, isLoading } = useQuery({
		queryKey: ["contratos", empresa?.id, descricao],
		enabled: Boolean(empresa?.id),
		queryFn: () =>
			contratoService.listar({
				idempresa: empresa!.id,
				descricao: descricao || undefined,
				limit: 50,
			}),
	});

	const excluir = useMutation({
		mutationFn: (id: string) => contratoService.excluir(id, empresa!.id),
		onSuccess: () => {
			toast.success("Contrato excluído");
			queryClient.invalidateQueries({ queryKey: ["contratos"] });
		},
		onError: (e: Error) => toast.error(e.message || "Falha ao excluir"),
	});

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4 gap-4 flex-wrap">
				<h1 className="text-2xl font-bold">Contratos</h1>
				<div className="flex gap-2">
					<Button asChild variant="outline">
						<Link href="/contratos/faturamento">Faturamento em lote</Link>
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline">
								<FileUp className="mr-2 size-4" />
								Importar
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => setFormatoImportacao("csv")}>
								<FileSpreadsheet className="mr-2 size-4" />
								CSV
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => setFormatoImportacao("xlsx")}>
								<FileSpreadsheet className="mr-2 size-4" />
								XLSX
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
					<Button asChild>
						<Link href="/contratos/novo">
							<IconPlus className="mr-2 size-4" />
							Novo
						</Link>
					</Button>
				</div>
			</div>
			<ImportarContratosDialog
				formato={formatoImportacao}
				onFechar={() => setFormatoImportacao(null)}
			/>
			<div className="px-4 pb-4">
				<Input
					placeholder="Filtrar por descrição"
					value={descricao}
					onChange={(e) => setDescricao(e.target.value)}
					className="max-w-sm mb-4"
				/>
				<div className="rounded-lg border bg-card">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Código</TableHead>
								<TableHead>Descrição</TableHead>
								<TableHead>Situação</TableHead>
								<TableHead>Fluxo</TableHead>
								<TableHead>Valor</TableHead>
								<TableHead className="w-[100px]" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading && (
								<TableRow>
									<TableCell colSpan={6}>Carregando...</TableCell>
								</TableRow>
							)}
							{(data?.data ?? []).map((c) => (
								<TableRow key={c.id}>
									<TableCell>{c.codigo || "-"}</TableCell>
									<TableCell>{c.descricao}</TableCell>
									<TableCell>{c.situacao}</TableCell>
									<TableCell>
										{FLUXO_LABEL[c.fluxofaturamento] ?? c.fluxofaturamento}
									</TableCell>
									<TableCell>
										{Number(c.valor).toLocaleString("pt-BR", {
											style: "currency",
											currency: "BRL",
										})}
									</TableCell>
									<TableCell className="flex gap-1">
										<Button asChild size="icon" variant="ghost">
											<Link href={`/contratos/${c.id}/editar`}>
												<IconPencil className="size-4" />
											</Link>
										</Button>
										<Button
											size="icon"
											variant="ghost"
											onClick={() => {
												if (confirm("Excluir este contrato?")) {
													excluir.mutate(c.id);
												}
											}}
										>
											<IconTrash className="size-4" />
										</Button>
									</TableCell>
								</TableRow>
							))}
							{!isLoading && (data?.data?.length ?? 0) === 0 && (
								<TableRow>
									<TableCell colSpan={6}>Nenhum contrato encontrado</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
			</div>
		</PageContainer>
	);
}
