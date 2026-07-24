"use client";

import {
	IconEye,
	IconEyeOff,
	IconPencil,
	IconPlus,
	IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { adminService } from "@/services/admin.service";

export default function SuperCmsPage() {
	const queryClient = useQueryClient();

	const { data, isLoading } = useQuery({
		queryKey: ["admin-ajuda-posts"],
		queryFn: () => adminService.listarAjudaPosts(),
	});

	const invalidar = () => {
		queryClient.invalidateQueries({ queryKey: ["admin-ajuda-posts"] });
		queryClient.invalidateQueries({ queryKey: ["ajuda-posts"] });
	};

	const publicarMutation = useMutation({
		mutationFn: ({ id, publicado }: { id: string; publicado: boolean }) =>
			adminService.atualizarAjudaPost(id, { publicado }),
		onSuccess: (_data, vars) => {
			invalidar();
			toast.success(vars.publicado ? "Postagem publicada" : "Postagem ocultada");
		},
		onError: () => toast.error("Erro ao alterar status"),
	});

	const excluirMutation = useMutation({
		mutationFn: (id: string) => adminService.excluirAjudaPost(id),
		onSuccess: () => {
			invalidar();
			toast.success("Postagem excluída");
		},
		onError: () => toast.error("Erro ao excluir postagem"),
	});

	const posts = data?.posts ?? [];

	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold">CMS</h1>
					<p className="text-muted-foreground">
						Gerencie as postagens da Central de Ajuda
					</p>
				</div>
				<Button asChild>
					<Link href="/super/cms/nova">
						<IconPlus className="size-4" />
						Nova postagem
					</Link>
				</Button>
			</div>

			{isLoading ? (
				<p>Carregando...</p>
			) : posts.length === 0 ? (
				<p className="text-muted-foreground">Nenhuma postagem cadastrada.</p>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Título</TableHead>
							<TableHead>Breve descrição</TableHead>
							<TableHead>Última alteração</TableHead>
							<TableHead>Autor</TableHead>
							<TableHead className="text-right">Ações</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{posts.map((post) => (
							<TableRow key={post.id}>
								<TableCell className="font-medium">
									<div className="flex flex-col gap-1">
										<span>{post.titulo}</span>
										{!post.publicado && (
											<span className="text-xs text-muted-foreground">
												Oculto
											</span>
										)}
									</div>
								</TableCell>
								<TableCell className="max-w-xs truncate text-muted-foreground">
									{post.subtitulo || "—"}
								</TableCell>
								<TableCell>
									{dayjs(post.atualizadoem).format("DD/MM/YYYY HH:mm")}
								</TableCell>
								<TableCell>{post.autorNome || "—"}</TableCell>
								<TableCell>
									<div className="flex justify-end gap-1">
										<Button variant="ghost" size="icon" title="Editar" asChild>
											<Link href={`/super/cms/${post.id}/editar`}>
												<IconPencil className="size-4" />
											</Link>
										</Button>
										<Button
											variant="ghost"
											size="icon"
											title={post.publicado ? "Ocultar" : "Publicar"}
											onClick={() =>
												publicarMutation.mutate({
													id: post.id,
													publicado: !post.publicado,
												})
											}
										>
											{post.publicado ? (
												<IconEyeOff className="size-4" />
											) : (
												<IconEye className="size-4" />
											)}
										</Button>
										<Button
											variant="ghost"
											size="icon"
											title="Excluir"
											onClick={() => {
												if (
													window.confirm(
														`Excluir a postagem "${post.titulo}"?`,
													)
												) {
													excluirMutation.mutate(post.id);
												}
											}}
										>
											<IconTrash className="size-4 text-destructive" />
										</Button>
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</div>
	);
}
