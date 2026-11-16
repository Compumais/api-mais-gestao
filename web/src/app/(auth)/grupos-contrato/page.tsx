"use client";

import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/app/(auth)/components/page-container";
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
import { grupoContratoService } from "@/services/grupo-contrato.service";

export default function GruposContratoPage() {
	const { empresa } = useEmpresa();
	const queryClient = useQueryClient();
	const [descricao, setDescricao] = useState("");

	const { data, isLoading } = useQuery({
		queryKey: ["grupos-contrato", empresa?.id, descricao],
		enabled: Boolean(empresa?.id),
		queryFn: () =>
			grupoContratoService.listar({
				idempresa: empresa!.id,
				descricao: descricao || undefined,
				limit: 100,
			}),
	});

	const excluir = useMutation({
		mutationFn: (id: string) => grupoContratoService.deletar(id),
		onSuccess: () => {
			toast.success("Grupo excluído");
			queryClient.invalidateQueries({ queryKey: ["grupos-contrato"] });
		},
		onError: (e: Error) => toast.error(e.message || "Falha ao excluir"),
	});

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4 gap-4 flex-wrap">
				<h1 className="text-2xl font-bold">Grupos de contrato</h1>
				<Button asChild>
					<Link href="/grupos-contrato/novo">
						<IconPlus className="mr-2 size-4" />
						Novo
					</Link>
				</Button>
			</div>
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
								<TableHead className="w-[100px]" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading && (
								<TableRow>
									<TableCell colSpan={3}>Carregando...</TableCell>
								</TableRow>
							)}
							{(data?.data ?? []).map((g) => (
								<TableRow key={g.id}>
									<TableCell>{g.codigo}</TableCell>
									<TableCell>{g.descricao}</TableCell>
									<TableCell className="flex gap-1">
										<Button asChild size="icon" variant="ghost">
											<Link href={`/grupos-contrato/${g.id}/editar`}>
												<IconPencil className="size-4" />
											</Link>
										</Button>
										<Button
											size="icon"
											variant="ghost"
											onClick={() => {
												if (confirm("Excluir este grupo?")) {
													excluir.mutate(g.id);
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
									<TableCell colSpan={3}>Nenhum grupo encontrado</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
			</div>
		</PageContainer>
	);
}
