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
import { tipoContratoService } from "@/services/tipo-contrato.service";

export default function TiposContratoPage() {
	const { empresa } = useEmpresa();
	const queryClient = useQueryClient();
	const [descricao, setDescricao] = useState("");

	const { data, isLoading } = useQuery({
		queryKey: ["tipos-contrato", empresa?.id, descricao],
		enabled: Boolean(empresa?.id),
		queryFn: () =>
			tipoContratoService.listar({
				idempresa: empresa!.id,
				descricao: descricao || undefined,
				limit: 100,
			}),
	});

	const excluir = useMutation({
		mutationFn: (id: string) => tipoContratoService.deletar(id),
		onSuccess: () => {
			toast.success("Tipo de contrato excluído");
			queryClient.invalidateQueries({ queryKey: ["tipos-contrato"] });
		},
		onError: (e: Error) => toast.error(e.message || "Falha ao excluir"),
	});

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4 gap-4 flex-wrap">
				<h1 className="text-2xl font-bold">Tipos de contrato</h1>
				<Button asChild>
					<Link href="/tipos-contrato/novo">
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
								<TableHead>Valor sugerido</TableHead>
								<TableHead className="w-[100px]" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading && (
								<TableRow>
									<TableCell colSpan={4}>Carregando...</TableCell>
								</TableRow>
							)}
							{(data?.data ?? []).map((t) => (
								<TableRow key={t.id}>
									<TableCell>{t.codigo}</TableCell>
									<TableCell>{t.descricao}</TableCell>
									<TableCell>
										{Number(t.valor).toLocaleString("pt-BR", {
											style: "currency",
											currency: "BRL",
										})}
									</TableCell>
									<TableCell className="flex gap-1">
										<Button asChild size="icon" variant="ghost">
											<Link href={`/tipos-contrato/${t.id}/editar`}>
												<IconPencil className="size-4" />
											</Link>
										</Button>
										<Button
											size="icon"
											variant="ghost"
											onClick={() => {
												if (confirm("Excluir este tipo de contrato?")) {
													excluir.mutate(t.id);
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
									<TableCell colSpan={4}>
										Nenhum tipo de contrato encontrado
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
			</div>
		</PageContainer>
	);
}
