"use client";

import { IconArrowLeft } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { AjudaPostForm } from "../../components/ajuda-post-form";
import type { AjudaPostFormData } from "@/schemas/ajuda-post.schema";
import { adminService } from "@/services/admin.service";

export default function SuperCmsEditarPage() {
	const params = useParams<{ id: string }>();
	const id = params.id;
	const router = useRouter();
	const queryClient = useQueryClient();

	const { data, isLoading, isError } = useQuery({
		queryKey: ["admin-ajuda-posts"],
		queryFn: () => adminService.listarAjudaPosts(),
	});

	const post = data?.posts.find((item) => item.id === id);

	const atualizarMutation = useMutation({
		mutationFn: (dados: AjudaPostFormData) =>
			adminService.atualizarAjudaPost(id, {
				titulo: dados.titulo,
				subtitulo: dados.subtitulo || null,
				descricao: dados.descricao,
				capa: dados.capa || null,
				imagens: dados.imagens ?? [],
				publicado: dados.publicado ?? true,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-ajuda-posts"] });
			queryClient.invalidateQueries({ queryKey: ["ajuda-posts"] });
			queryClient.invalidateQueries({ queryKey: ["ajuda-post"] });
			toast.success("Postagem atualizada");
			router.push("/super/cms");
		},
		onError: () => toast.error("Erro ao atualizar postagem"),
	});

	return (
		<div className="space-y-6">
			<div>
				<Link
					href="/super/cms"
					className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
				>
					<IconArrowLeft className="size-4" aria-hidden="true" />
					Voltar ao CMS
				</Link>
				<h1 className="text-2xl font-bold">Editar postagem</h1>
				<p className="text-muted-foreground">
					Atualize o conteúdo do artigo de ajuda
				</p>
			</div>

			{isLoading ? (
				<p className="text-muted-foreground">Carregando postagem...</p>
			) : isError || !post ? (
				<p className="text-muted-foreground">Postagem não encontrada.</p>
			) : (
				<AjudaPostForm
					key={post.id}
					defaultValues={{
						titulo: post.titulo,
						subtitulo: post.subtitulo ?? "",
						descricao: post.descricao,
						capa: post.capa,
						imagens: post.imagens ?? [],
						publicado: post.publicado,
					}}
					submitLabel="Salvar alterações"
					salvando={atualizarMutation.isPending}
					onSubmit={(dados) => atualizarMutation.mutate(dados)}
				/>
			)}
		</div>
	);
}
